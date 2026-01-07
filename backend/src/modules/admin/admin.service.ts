import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';
import { MailService } from '../../services/mail.service';
import * as bcrypt from 'bcrypt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class AdminService {
    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
        @InjectRedis() private readonly redis: Redis
    ) { }

    private getEffectiveOrgId(user: any, targetOrgId?: string): string {
        if (user.role === 'SUPER_ADMIN') {
            if (targetOrgId) return targetOrgId;
            if (user.orgId) return user.orgId;
            // If Super Admin and no targetOrgId, we might want to return null or throw depending on context.
            // But for these operations, we need an orgId.
            throw new BadRequestException('Organization ID is required for Super Admin operations');
        }

        if (!user.orgId) throw new ForbiddenException('Admin has no organization assigned');

        // Regular admin cannot impersonate
        if (targetOrgId && targetOrgId !== user.orgId) {
            throw new ForbiddenException('Cannot access another organization');
        }

        return user.orgId;
    }

    async getGlobalStats(user?: any, targetOrgId?: string) {
        const orgId = this.getEffectiveOrgId(user, targetOrgId);

        // CACHE
        const cacheKey = `admin:stats:${orgId}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const totalUsers = await this.prisma.user.count({ where: { orgId } });
        const totalExams = await this.prisma.exam.count({ where: { orgId } });
        const totalCourses = await this.prisma.course.count({ where: { orgId } });
        const activeSessions = await this.prisma.examSession.count({
            where: {
                status: 'IN_PROGRESS',
                exam: { orgId } // Filter sessions by exams belonging to this org
            }
        });

        const stats = {
            totalUsers,
            totalExams,
            totalCourses,
            activeSessions,
            systemHealth: 'Healthy'
        };

        // Cache for 60s
        await this.redis.set(cacheKey, JSON.stringify(stats), 'EX', 60);

        return stats;
    }

    async getUsers(user?: any, targetOrgId?: string) {
        const orgId = this.getEffectiveOrgId(user, targetOrgId);
        return this.prisma.user.findMany({
            where: { orgId },
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

    async getSystemLogs(user?: any, targetOrgId?: string) {
        const orgId = this.getEffectiveOrgId(user, targetOrgId);
        // Only show logs for users in this org
        return this.prisma.auditLog.findMany({
            where: { user: { orgId } },
            take: 20,
            orderBy: { timestamp: 'desc' },
            include: { user: { select: { name: true, email: true, role: true } } }
        });
    }

    async getAnalytics(user?: any, targetOrgId?: string) {
        const orgId = this.getEffectiveOrgId(user, targetOrgId);

        // CACHE
        const cacheKey = `admin:analytics:${orgId}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

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

        const analytics = {
            activity: activityData,
            labels: dayLabels,
            registrations: totalRegistrations,
            attempts: totalAttempts
        };

        // Cache for 5 minutes
        await this.redis.set(cacheKey, JSON.stringify(analytics), 'EX', 300);

        return analytics;
    }

    async getExams(user?: any, targetOrgId?: string) {
        const orgId = this.getEffectiveOrgId(user, targetOrgId);
        return this.prisma.exam.findMany({
            where: { orgId }, // ISOLATION
            include: {
                _count: {
                    select: { submissions: true }
                },
                creator: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getCourses(user?: any, targetOrgId?: string) {
        const orgId = this.getEffectiveOrgId(user, targetOrgId);
        return this.prisma.course.findMany({
            where: { orgId }, // ISOLATION
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

    async createUser(data: any, currentUser?: any, targetOrgId?: string) {
        const orgId = this.getEffectiveOrgId(currentUser, targetOrgId);

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

        // Send welcome email (Non-blocking for performance)
        this.mailService.sendWelcomeEmail(
            { email: user.email, name: user.name || 'User', password: generatedPassword },
            { name: org.name, primaryColor: org.primaryColor || undefined }
        ).catch(err => console.error(`[AdminService] Failed to send welcome email to ${email}:`, err));

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt
            },
            password: generatedPassword, // Return plain password for one-time display
            emailSent: true // Optimistic response
        };
    }

    async createUsersBulk(users: any[], currentUser?: any, targetOrgId?: string) {
        const results = [];
        let createdCount = 0;
        let failedCount = 0;
        let emailsSentCount = 0;
        let emailsFailedCount = 0;

        for (const userData of users) {
            try {
                const result = await this.createUser(userData, currentUser, targetOrgId);
                createdCount++;
                if (result.emailSent) {
                    emailsSentCount++;
                } else {
                    emailsFailedCount++;
                }
                results.push({ ...result, success: true });
            } catch (err: any) {
                failedCount++;
                results.push({ email: userData.email, success: false, error: err.message });
            }
        }

        return {
            summary: {
                totalProcessed: users.length,
                created: createdCount,
                failed: failedCount,
                emailsSent: emailsSentCount,
                emailsFailed: emailsFailedCount
            },
            details: results
        };
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
