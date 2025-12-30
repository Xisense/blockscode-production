import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SuperAdminService {
    constructor(private prisma: PrismaService) { }

    async getStats() {
        const organizations = await this.prisma.organization.count();
        const totalUsers = await this.prisma.user.count();
        const activeNodes = 4; // Mock for now as it's infra related
        const alerts = await this.prisma.auditLog.count({
            where: { action: { contains: 'ALERT' } }
        }); // Example if we log alerts

        return {
            totalOrgs: organizations,
            totalUsers,
            activeNodes,
            alerts: alerts || 0
        };
    }

    async getOrganizations() {
        return this.prisma.organization.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit for dashboard
        });
    }

    async getOrganization(id: string) {
        return this.prisma.organization.findUnique({
            where: { id },
            include: {
                users: {
                    where: { role: 'ADMIN' },
                    take: 1
                }
            }
        });
    }

    async createOrganization(data: any) {
        // 0. Pre-check: Admin Email Uniqueness
        if (data.adminEmail) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: data.adminEmail }
            });
            if (existingUser) {
                throw new BadRequestException(`User with email ${data.adminEmail} already exists.`);
            }
        }

        try {
            // 1. Create Organization
            const org = await this.prisma.organization.create({
                data: {
                    name: data.name,
                    domain: data.domain,
                    logo: data.logo,
                    status: data.status || 'Active',

                    // Limits
                    maxUsers: Number(data.maxUsers) || 100,
                    maxCourses: Number(data.maxCourses) || 10,
                    storageLimit: Number(data.storageLimit || data.maxStorage) || 1024,
                    examsPerMonth: Number(data.examsPerMonth) || 50,

                    // Config
                    plan: data.plan || 'Enterprise',
                    primaryColor: data.primaryColor || '#fc751b',
                    features: {
                        canCreateExams: data.canCreateExams,
                        allowAppExams: data.allowAppExams,
                        allowAIProctoring: data.allowAIProctoring,
                        canCreateCourses: data.canCreateCourses,
                        allowCourseTests: data.allowCourseTests,
                        canManageUsers: data.canManageUsers
                    },
                    contact: {
                        adminName: data.adminName,
                        adminEmail: data.adminEmail,
                        phone: data.phone,
                        supportEmail: data.supportEmail,
                        address: data.address,
                        city: data.city,
                        country: data.country
                    }
                }
            });

            // 2. Create Admin User for this Org
            if (data.adminEmail) {
                // Use provided password or generate one
                const passwordToUse = data.adminPassword || Math.random().toString(36).slice(-8);
                const hashedPassword = await bcrypt.hash(passwordToUse, 10);

                await this.prisma.user.create({
                    data: {
                        email: data.adminEmail,
                        name: data.adminName || 'Admin',
                        password: hashedPassword,
                        role: 'ADMIN',
                        orgId: org.id,
                        isActive: true
                    }
                });

                // TODO: Send email with tempPassword to adminEmail
                console.log(`[SuperAdmin] Created Admin ${data.adminEmail} with password: ${passwordToUse}`);
            }

            return org;
        } catch (error) {
            console.error('[SuperAdminService] Create Organization Error:', error);
            throw new BadRequestException('Failed to create organization. ' + error.message);
        }
    }

    async updateOrganization(id: string, data: any) {
        return this.prisma.organization.update({
            where: { id },
            data
        });
    }

    async deleteOrganization(id: string) {
        // Fetch all user IDs belonging to this org
        const users = await this.prisma.user.findMany({
            where: { orgId: id },
            select: { id: true }
        });
        const userIds = users.map(u => u.id);

        try {
            // Use transaction for manual cascade
            await this.prisma.$transaction(async (tx) => {
                // 1. Delete AuditLogs for these users
                await tx.auditLog.deleteMany({
                    where: { userId: { in: userIds } }
                });

                // 2. Delete Bookmarks for these users
                await tx.bookmark.deleteMany({
                    where: { userId: { in: userIds } }
                });

                // 3. Delete Users (will cascade Session, Submission, Feedback via schema)
                await tx.user.deleteMany({
                    where: { orgId: id }
                });

                // 4. Delete Organization (will cascade Courses, Exams - though creatorId SetNull)
                await tx.organization.delete({
                    where: { id }
                });
            });
            return { success: true };
        } catch (error) {
            console.error('[SuperAdminService] Delete Error Full:', error);
            throw new BadRequestException('Failed to delete organization. Dependencies may exist. ' + error.message);
        }
    }
}
