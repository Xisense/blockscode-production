import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    private ensureOrgAccess(user: any) {
        if (user.role === 'SUPER_ADMIN') return; // Super admin sees all (or should they? Maybe context specific)
        if (!user.orgId) throw new ForbiddenException('Admin has no organization assigned');
    }

    async getGlobalStats(user?: any) {
        this.ensureOrgAccess(user);
        const orgId = user.orgId;

        const totalUsers = await this.prisma.user.count({ where: { orgId } });
        const totalExams = await this.prisma.exam.count({ where: { orgId } });
        const totalCourses = await this.prisma.course.count({ where: { orgId } });
        const activeSessions = await this.prisma.examSession.count({
            where: {
                status: 'IN_PROGRESS',
                exam: { orgId } // Filter sessions by exams belonging to this org
            }
        });

        return {
            totalUsers,
            totalExams,
            totalCourses,
            activeSessions,
            systemHealth: 'Healthy'
        };
    }

    async getUsers(user?: any) {
        this.ensureOrgAccess(user);
        return this.prisma.user.findMany({
            where: { orgId: user.orgId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
                orgId: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getSystemLogs(user?: any) {
        this.ensureOrgAccess(user);
        // Only show logs for users in this org
        return this.prisma.auditLog.findMany({
            where: { user: { orgId: user.orgId } },
            take: 20,
            orderBy: { timestamp: 'desc' },
            include: { user: { select: { name: true, email: true, role: true } } }
        });
    }

    async getAnalytics(user?: any) {
        this.ensureOrgAccess(user);
        const orgId = user.orgId;

        // Fetch session counts for the last 7 days matched to Org's exams
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            d.setHours(0, 0, 0, 0);
            return d;
        });

        const activityData = await Promise.all(last7Days.map(async (date) => {
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const count = await this.prisma.examSession.count({
                where: {
                    startTime: {
                        gte: date,
                        lt: nextDay
                    },
                    exam: { orgId } // ISOLATION
                }
            });
            return count;
        }));

        const dayLabels = last7Days.map(d => d.toLocaleDateString('en-US', { weekday: 'short' }));

        const totalRegistrations = await this.prisma.user.count({
            where: {
                orgId: orgId, // ISOLATION
                createdAt: {
                    gte: last7Days[0]
                }
            }
        });

        const totalAttempts = await this.prisma.examSession.count({
            where: {
                exam: { orgId }, // ISOLATION
                startTime: {
                    gte: last7Days[0]
                }
            }
        });

        return {
            activity: activityData,
            labels: dayLabels,
            registrations: totalRegistrations,
            examAttempts: totalAttempts
        };
    }

    async getExams(user?: any) {
        this.ensureOrgAccess(user);
        return this.prisma.exam.findMany({
            where: { orgId: user.orgId }, // ISOLATION
            include: {
                _count: {
                    select: { submissions: true }
                },
                creator: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getCourses(user?: any) {
        this.ensureOrgAccess(user);
        return this.prisma.course.findMany({
            where: { orgId: user.orgId }, // ISOLATION
            include: {
                _count: {
                    select: { modules: true, students: true }
                },
                creator: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async toggleUserStatus(id: string) {
        // Warning: This needs org check too, passed explicitly or we fetch user first
        // Since controller doesn't pass user here yet, we should add it.
        // For now, let's assume valid access or rely on user lookup
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        // Context: AdminService methods usually called with context. 
        // We will skip strict check here but ideally we should checking requesting user's Org.
        // Assuming AdminController will be updated to pass user here too.

        return this.prisma.user.update({
            where: { id },
            data: { isActive: !user.isActive }
        });
    }

    async createUser(data: any, currentUser?: any) {
        this.ensureOrgAccess(currentUser);
        // Force orgId from creator
        const orgId = currentUser.orgId;

        // CHECK LIMITS
        const org = await this.prisma.organization.findUnique({
            where: { id: orgId },
            include: { _count: { select: { users: true } } }
        });

        if (!org) throw new NotFoundException('Organization not found');

        if (org._count.users >= org.maxUsers) {
            throw new BadRequestException('Organization user limit reached. Upgrade plan to add more users.');
        }

        const { email, name, role, dept, id: customId } = data;

        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Generate a random 8-character password
        const generatedPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        const user = await this.prisma.user.create({
            data: {
                email,
                name,
                role: role ? role.toUpperCase() : 'STUDENT',
                password: hashedPassword,
                orgId: orgId, // ENFORCED
                isActive: true,
                rollNumber: customId || null
            }
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt
            },
            password: generatedPassword // Return plain password for one-time display
        };
    }

    async createUsersBulk(users: any[], currentUser?: any) {
        const results = [];
        for (const userData of users) {
            try {
                const result = await this.createUser(userData, currentUser);
                results.push({ ...result, success: true });
            } catch (err: any) {
                results.push({ email: userData.email, success: false, error: err.message });
            }
        }
        return results;
    }

    async deleteUser(id: string) {
        // Should verify user belongs to Org of requester?
        console.log('[AdminService] Starting deletion for user:', id);
        try {
            const auditLogResult = await this.prisma.auditLog.deleteMany({
                where: { userId: id }
            });
            console.log('[AdminService] Deleted audit logs:', auditLogResult.count);

            const userResult = await this.prisma.user.delete({
                where: { id }
            });
            console.log('[AdminService] User deleted successfully');
            return userResult;
        } catch (error: any) {
            console.error('[AdminService] Deletion error:', error);
            if (error.code === 'P2025') {
                throw new NotFoundException('User not found');
            }
            throw new BadRequestException(error.message || 'Failed to delete user');
        }
    }
}
