import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';

@Injectable()
export class StudentService {
    constructor(private prisma: PrismaService) { }

    async getStats(userId: string) {
        // Calculate completed exams
        const completedSessions = await this.prisma.examSession.count({
            where: { userId, status: 'COMPLETED' }
        });

        // Calculate average score - only from published results
        const sessionsWithScore = await this.prisma.examSession.findMany({
            where: {
                userId,
                score: { not: null },
                exam: { resultsPublished: true }
            },
            select: { score: true }
        });

        const totalScore = sessionsWithScore.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
        const averageScore = sessionsWithScore.length > 0 ? Math.round(totalScore / sessionsWithScore.length) : 0;

        // Calculate daily streak
        const streak = await this.calculateDailyStreak(userId);

        return {
            completedModules: completedSessions,
            averageScore,
            streak,
            totalXP: completedSessions * 100 // Mock XP
        };
    }

    private async calculateDailyStreak(userId: string): Promise<number> {
        // Get all exam sessions ordered by date
        const sessions = await this.prisma.examSession.findMany({
            where: { userId, status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true }
        });

        if (sessions.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if there's activity today or yesterday
        const lastActivityDate = new Date(sessions[0].createdAt);
        lastActivityDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

        // Streak is broken if last activity was more than 1 day ago
        if (daysDiff > 1) return 0;

        // Count consecutive days
        const activityDates = new Set(
            sessions.map((s: any) => {
                const d = new Date(s.createdAt);
                d.setHours(0, 0, 0, 0);
                return d.getTime();
            })
        );

        let currentDate = new Date(today);
        if (daysDiff === 1) {
            // Start from yesterday if no activity today
            currentDate.setDate(currentDate.getDate() - 1);
        }

        while (activityDates.has(currentDate.getTime())) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        return streak;
    }

    async getModules(user: any) {
        // Fetch published exams scoped to user's organization
        const exams = await this.prisma.exam.findMany({
            where: {
                isActive: true,
                orgId: user.orgId || undefined
            } as any, // Bypass stale type definition
            include: {
                submissions: {
                    where: { userId: user.id },
                    select: { status: true, score: true }
                }
            }
        });

        return exams.map((exam: any) => {
            const session = exam.submissions[0]; // Gets the user's session if exists
            let percent = 0;
            if (session?.status === 'COMPLETED') percent = 100;
            else if (session?.status === 'IN_PROGRESS') percent = 30; // Arbitrary progress for now

            return {
                title: exam.title,
                slug: exam.slug,
                sections: Array.isArray(exam.questions) ? (exam.questions as any[]).length : 0,
                percent,
                status: session?.status || 'NOT_STARTED'
            };
        });
    }

    async getCourses(userId: string) {
        // Get courses the student is enrolled in
        // Note: Implicitly isolated via enrollment, but could add orgId check if needed.
        // For now, assume enrollment implies access.
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                courses: {
                    include: {
                        modules: {
                            include: {
                                units: {
                                    select: { id: true }
                                }
                            }
                        },
                        tests: true
                    }
                },
                unitSubmissions: {
                    where: { status: 'COMPLETED' },
                    select: { unitId: true }
                }
            }
        });

        if (!user) return [];

        // Calculate progress for each course
        return user.courses.map((course: any) => {
            const totalUnits = course.modules.reduce((sum: number, mod: any) => sum + mod.units.length, 0);
            const totalTests = (course as any).tests?.length || 0;
            const completedUnitIds = new Set(user.unitSubmissions.map((sub: any) => sub.unitId));
            const completedCount = course.modules.reduce((sum: number, mod: any) =>
                sum + mod.units.filter((u: any) => completedUnitIds.has(u.id)).length, 0
            );
            const percent = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;

            return {
                id: course.id,
                slug: course.slug,
                title: course.title,
                description: course.shortDescription,
                sections: totalUnits,
                testCount: totalTests,
                tests: ((course as any).tests || []).map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    slug: t.slug,
                    startDate: t.startDate,
                    endDate: t.endDate
                })),
                status: completedCount === totalUnits ? 'Completed' : completedCount > 0 ? 'In Progress' : 'Not Started',
                percent
            };
        });
    }

    async getExamAttempts(userId: string) {
        const sessions = await this.prisma.examSession.findMany({
            where: {
                userId,
                exam: { resultsPublished: true }
            },
            include: {
                exam: {
                    select: {
                        title: true,
                        resultsPublished: true,
                        duration: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return sessions.map((session: any) => {
            const isPublished = session.exam.resultsPublished;
            const startTime = new Date(session.startTime).getTime();
            const endTime = session.endTime ? new Date(session.endTime).getTime() : Date.now();
            const durationMins = Math.round((endTime - startTime) / 60000);

            return {
                id: session.id,
                examTitle: session.exam.title,
                score: isPublished ? (session.score !== null ? session.score : 'Pending') : 'Hidden',
                duration: durationMins,
                startedAt: session.startTime,
                submittedAt: session.endTime,
                status: session.status,
                isPublished
            };
        });
    }

    async getDetailedUnitSubmissions(userId: string) {
        const submissions = await this.prisma.unitSubmission.findMany({
            where: { userId },
            include: {
                unit: {
                    select: {
                        title: true,
                        type: true,
                        module: {
                            select: {
                                course: {
                                    select: { title: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return submissions.map((sub: any) => ({
            id: sub.id,
            unitId: sub.unitId,
            unitTitle: sub.unit.title,
            unitType: sub.unit.type,
            courseTitle: sub.unit.module.course.title,
            status: sub.status,
            score: sub.score,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt
        }));
    }

    async getAnalytics(userId: string) {
        // Get all unit submissions for analytics
        const submissions = await this.prisma.unitSubmission.findMany({
            where: { userId },
            include: {
                unit: {
                    include: {
                        module: {
                            include: {
                                course: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate weekly activity (last 7 days)
        const weeklyActivity = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const daySubmissions = submissions.filter((s: any) => {
                const subDate = new Date(s.createdAt);
                return subDate >= date && subDate < nextDate;
            });

            const passed = daySubmissions.filter((s: any) => s.status === 'COMPLETED').length;
            const failed = daySubmissions.length - passed;

            weeklyActivity.push({
                day: days[date.getDay()],
                attempts: daySubmissions.length,
                passed,
                failed
            });
        }

        // Calculate course mastery (unique units)
        const courseStats: Record<string, { units: Set<string>; completedUnits: Set<string> }> = {};
        submissions.forEach((sub: any) => {
            const courseName = sub.unit.module.course.title;
            if (!courseStats[courseName]) {
                courseStats[courseName] = { units: new Set(), completedUnits: new Set() };
            }
            courseStats[courseName].units.add(sub.unitId);
            if (sub.status === 'COMPLETED') {
                courseStats[courseName].completedUnits.add(sub.unitId);
            }
        });

        const uniqueUnits = new Set(submissions.map((s: any) => s.unitId));

        const courseMastery = Object.entries(courseStats).map(([subject, stats]) => ({
            subject: subject.substring(0, 15), // Truncate for display
            A: Math.round((stats.completedUnits.size / stats.units.size) * 150), // Current proficiency based on completion
            B: 130, // Benchmark
            fullMark: 150
        }));

        return {
            weeklyActivity,
            courseMastery,
            stats: {
                totalQuestions: uniqueUnits.size,
                totalAttempts: submissions.length,
                passedAttempts: submissions.filter((s: any) => s.status === 'COMPLETED').length,
                successRate: submissions.length > 0
                    ? Math.round((submissions.filter((s: any) => s.status === 'COMPLETED').length / submissions.length) * 100)
                    : 0
            }
        };
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                rollNumber: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    async updateProfile(userId: string, data: { name?: string }) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name
            },
            select: {
                id: true,
                name: true,
                email: true,
                rollNumber: true
            }
        });
    }

    async getBookmarks(userId: string) {
        const bookmarks = await this.prisma.bookmark.findMany({
            where: { userId },
            include: {
                unit: {
                    include: {
                        module: {
                            include: {
                                course: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return bookmarks.map((b: any) => ({
            id: b.id,
            unitId: b.customId, // Use customId for frontend links
            unitTitle: b.unit?.title || b.title || 'Untitled',
            unitType: b.unit?.type || b.type || 'Reading',
            moduleTitle: b.unit?.module?.title || b.moduleTitle || 'Miscellaneous',
            courseTitle: b.unit?.module?.course?.title || b.courseTitle || 'System',
            bookmarkedAt: b.createdAt
        }));
    }

    async addBookmark(userId: string, unitId: string, metadata?: { title?: string, type?: string, moduleTitle?: string, courseTitle?: string }) {
        // Find if this unitId exists in the Unit table for the FK
        const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });

        return this.prisma.bookmark.upsert({
            where: {
                userId_customId: { userId, customId: unitId }
            },
            update: {
                unitId: unit ? unit.id : null,
                title: metadata?.title,
                type: metadata?.type,
                moduleTitle: metadata?.moduleTitle,
                courseTitle: metadata?.courseTitle
            },
            create: {
                userId,
                customId: unitId,
                unitId: unit ? unit.id : null,
                title: metadata?.title,
                type: metadata?.type,
                moduleTitle: metadata?.moduleTitle,
                courseTitle: metadata?.courseTitle
            }
        });
    }

    async removeBookmark(userId: string, bookmarkId: string) {
        console.log('[StudentService] removeBookmark called');
        console.log('[StudentService] userId:', userId);
        console.log('[StudentService] bookmarkId:', bookmarkId);

        try {
            // First, check if this is a bookmark ID or customId
            // Try to find bookmark by ID first
            const bookmark = await this.prisma.bookmark.findUnique({
                where: { id: bookmarkId }
            });

            console.log('[StudentService] Bookmark found by ID:', bookmark ? 'Yes' : 'No');

            if (bookmark) {
                console.log('[StudentService] Bookmark data:', bookmark);
                // Verify ownership
                if (bookmark.userId !== userId) {
                    console.log('[StudentService] ❌ Ownership mismatch');
                    throw new Error('Unauthorized: Bookmark does not belong to user');
                }
                // Delete by ID
                console.log('[StudentService] Deleting bookmark by ID...');
                const result = await this.prisma.bookmark.delete({
                    where: { id: bookmarkId }
                });
                console.log('[StudentService] ✅ Bookmark deleted successfully');
                return result;
            } else {
                // Try as customId (backward compatibility)
                console.log('[StudentService] Trying to delete by customId...');
                const result = await this.prisma.bookmark.delete({
                    where: {
                        userId_customId: { userId, customId: bookmarkId }
                    }
                });
                console.log('[StudentService] ✅ Bookmark deleted by customId');
                return result;
            }
        } catch (error) {
            console.error('[StudentService] ❌ Error removing bookmark:', error);
            console.error('[StudentService] Error message:', error.message);
            console.error('[StudentService] Error code:', error.code);
            throw error;
        }
    }

    async getUnitSubmissions(userId: string, unitId: string) {
        return this.prisma.unitSubmission.findMany({
            where: { userId, unitId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async submitUnit(userId: string, unitId: string, data: { status: string; content: any; score?: number }) {
        return this.prisma.unitSubmission.create({
            data: {
                userId,
                unitId,
                status: data.status,
                content: data.content,
                score: data.score
            }
        });
    }
}
