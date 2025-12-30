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

        // Calculate average score
        const sessionsWithScore = await this.prisma.examSession.findMany({
            where: { userId, score: { not: null } },
            select: { score: true }
        });

        const totalScore = sessionsWithScore.reduce((acc, curr) => acc + (curr.score || 0), 0);
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
            sessions.map(s => {
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

        return exams.map(exam => {
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
        return user.courses.map(course => {
            const totalUnits = course.modules.reduce((sum, mod) => sum + mod.units.length, 0);
            const totalTests = (course as any).tests?.length || 0;
            const completedUnitIds = new Set(user.unitSubmissions.map(sub => sub.unitId));
            const completedCount = course.modules.reduce((sum, mod) =>
                sum + mod.units.filter(u => completedUnitIds.has(u.id)).length, 0
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

    async getAttempts(userId: string) {
        // Get all exam sessions (attempts) for the student
        const sessions = await this.prisma.examSession.findMany({
            where: { userId },
            include: {
                exam: {
                    select: {
                        title: true,
                        slug: true,
                        duration: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return sessions.map(session => ({
            id: session.id,
            examTitle: session.exam.title,
            examSlug: session.exam.slug,
            status: session.status,
            score: session.score,
            duration: session.exam.duration,
            startedAt: session.createdAt,
            submittedAt: session.endTime
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

            const daySubmissions = submissions.filter(s => {
                const subDate = new Date(s.createdAt);
                return subDate >= date && subDate < nextDate;
            });

            const passed = daySubmissions.filter(s => s.status === 'COMPLETED').length;
            const failed = daySubmissions.length - passed;

            weeklyActivity.push({
                day: days[date.getDay()],
                attempts: daySubmissions.length,
                passed,
                failed
            });
        }

        // Calculate course mastery
        const courseStats: Record<string, { total: number; completed: number }> = {};
        submissions.forEach(sub => {
            const courseName = sub.unit.module.course.title;
            if (!courseStats[courseName]) {
                courseStats[courseName] = { total: 0, completed: 0 };
            }
            courseStats[courseName].total++;
            if (sub.status === 'COMPLETED') {
                courseStats[courseName].completed++;
            }
        });

        const courseMastery = Object.entries(courseStats).map(([subject, stats]) => ({
            subject: subject.substring(0, 15), // Truncate for display
            A: Math.round((stats.completed / stats.total) * 150), // Current proficiency
            B: 130, // Benchmark
            fullMark: 150
        }));

        return {
            weeklyActivity,
            courseMastery,
            stats: {
                totalQuestions: submissions.length,
                totalAttempts: submissions.length,
                passedAttempts: submissions.filter(s => s.status === 'COMPLETED').length,
                successRate: submissions.length > 0
                    ? Math.round((submissions.filter(s => s.status === 'COMPLETED').length / submissions.length) * 100)
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
            unitId: b.unitId,
            unitTitle: b.unit.title,
            unitType: b.unit.type,
            moduleTitle: b.unit.module.title,
            courseTitle: b.unit.module.course.title,
            bookmarkedAt: b.createdAt
        }));
    }

    async addBookmark(userId: string, unitId: string) {
        return this.prisma.bookmark.upsert({
            where: {
                userId_unitId: { userId, unitId }
            },
            update: {},
            create: {
                userId,
                unitId
            }
        });
    }

    async removeBookmark(userId: string, unitId: string) {
        return this.prisma.bookmark.delete({
            where: {
                userId_unitId: { userId, unitId }
            }
        });
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
