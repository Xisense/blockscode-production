import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';

import { MonitoringGateway } from '../monitoring/monitoring.gateway';
import { ExamService } from '../exam/exam.service';

@Injectable()
export class TeacherService {
    constructor(
        private prisma: PrismaService,
        private monitoringGateway: MonitoringGateway,
        private examService: ExamService
    ) { }

    async getStats(userId: string) {
        const totalExams = await this.prisma.exam.count({ where: { creatorId: userId, isActive: true } });
        const totalStudents = await this.prisma.user.count({ where: { role: 'STUDENT' } }); // TODO: Scope to Org?
        const recentSubmissionsCount = await this.prisma.examSession.count({
            where: {
                exam: { creatorId: userId },
                status: 'COMPLETED',
                updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
        });

        return {
            totalExams,
            totalStudents,
            recentSubmissions: recentSubmissionsCount
        };
    }

    async getExam(idOrSlug: string, userId: string) {
        const exam = await this.prisma.exam.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            }
        });

        if (exam && (exam as any).creatorId !== userId) {
            throw new Error('Access denied: You do not own this exam');
        }

        return exam;
    }

    async getCourse(idOrSlug: string, userId: string) {
        const course = await this.prisma.course.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            },
            include: {
                modules: {
                    include: { units: true },
                    orderBy: { order: 'asc' }
                },
                tests: true
            }
        });

        if (course && (course as any).creatorId !== userId) {
            throw new Error('Access denied: You do not own this course');
        }

        return course;
    }

    async getRecentSubmissions(userId: string) {
        const submissions = await this.prisma.examSession.findMany({
            where: {
                exam: { creatorId: userId },
                status: 'COMPLETED'
            },
            take: 5,
            orderBy: { updatedAt: 'desc' },
            include: {
                user: true,
                exam: true
            }
        });

        return submissions.map((s: any) => ({
            id: s.id,
            name: s.user ? (s.user.name || s.user.email) : 'Unknown User',
            module: s.exam ? s.exam.title : 'Unknown Exam',
            time: s.endTime,
            status: 'Reviewed'
        }));
    }

    async getMyModules(userId: string) {
        const courses = await this.prisma.course.findMany({
            where: { creatorId: userId },
            include: {
                _count: {
                    select: { students: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return courses.map((c: any) => ({
            id: c.id,
            title: c.title,
            slug: c.slug,
            students: c._count.students,
            status: c.status,
            lastUpdated: c.updatedAt.toLocaleDateString()
        }));
    }

    async getStudents(userId: string) {
        const students = await this.prisma.user.findMany({
            where: {
                role: 'STUDENT',
                courses: {
                    some: { creatorId: userId }
                }
            },
            include: {
                courses: {
                    where: { creatorId: userId },
                    select: {
                        id: true,
                        title: true,
                        modules: {
                            include: {
                                units: {
                                    select: { id: true }
                                }
                            }
                        }
                    }
                },
                unitSubmissions: {
                    where: {
                        unit: {
                            module: {
                                course: { creatorId: userId }
                            }
                        }
                    },
                    select: {
                        status: true,
                        unitId: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return students.map((s: any) => {
            const completedUnitIds = new Set(s.unitSubmissions.filter((sub: any) => sub.status === 'COMPLETED').map((sub: any) => sub.unitId));

            const detailedCourses = s.courses.map((course: any) => {
                const totalUnits = course.modules.reduce((sum: number, mod: any) => sum + mod.units.length, 0);
                const completedCount = course.modules.reduce((sum: number, mod: any) =>
                    sum + mod.units.filter((u: any) => completedUnitIds.has(u.id)).length, 0
                );
                const progress = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;

                return {
                    id: course.id,
                    title: course.title,
                    progress,
                    totalUnits,
                    completedUnits: completedCount
                };
            });

            const overallProgress = detailedCourses.length > 0
                ? Math.round(detailedCourses.reduce((acc: number, curr: any) => acc + curr.progress, 0) / detailedCourses.length)
                : 0;

            return {
                id: s.id,
                name: s.name || s.email,
                course: s.courses.length > 0 ? s.courses[0].title : 'Not Enrolled',
                courses: detailedCourses,
                progress: overallProgress,
                submissions: s.unitSubmissions.length,
                lastActive: s.updatedAt.toLocaleDateString()
            };
        });
    }

    async getStudentAnalytics(studentId: string, teacherId: string) {
        // Verify teacher has access to this student
        const enrollment = await this.prisma.course.findFirst({
            where: {
                creatorId: teacherId,
                students: { some: { id: studentId } }
            }
        });

        if (!enrollment) throw new Error('Access denied: Student not enrolled in your courses');

        const submissions = await this.prisma.unitSubmission.findMany({
            where: { userId: studentId },
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

        // Filter submissions to only those from teacher's courses
        const filteredSubmissions = submissions.filter((s: any) => s.unit.module.course.creatorId === teacherId);

        // Weekly activity
        const weeklyActivity = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const daySubmissions = filteredSubmissions.filter((s: any) => {
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

        // Course mastery
        const courseStats: Record<string, { total: number; completed: number }> = {};
        filteredSubmissions.forEach((sub: any) => {
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
            subject: subject.substring(0, 15),
            A: Math.round((stats.completed / stats.total) * 150),
            B: 130,
            fullMark: 150
        }));

        return {
            weeklyActivity,
            courseMastery,
            stats: {
                totalQuestions: filteredSubmissions.length,
                totalAttempts: filteredSubmissions.length,
                passedAttempts: filteredSubmissions.filter((s: any) => s.status === 'COMPLETED').length,
                successRate: filteredSubmissions.length > 0
                    ? Math.round((filteredSubmissions.filter((s: any) => s.status === 'COMPLETED').length / filteredSubmissions.length) * 100)
                    : 0
            }
        };
    }

    async getStudentAttempts(studentId: string, teacherId: string) {
        // ... (existing code for getStudentAttempts)
        // Verify teacher has access to this student
        const enrollment = await this.prisma.course.findFirst({
            where: {
                creatorId: teacherId,
                students: { some: { id: studentId } }
            }
        });

        if (!enrollment) throw new Error('Access denied: Student not enrolled in your courses');

        const sessions = await this.prisma.examSession.findMany({
            where: {
                userId: studentId,
                exam: { creatorId: teacherId }
            },
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

        return sessions.map((session: any) => ({
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

    async getStudentUnitSubmissions(studentId: string, teacherId: string) {
        // Verify teacher has access to this student
        const enrollment = await this.prisma.course.findFirst({
            where: {
                creatorId: teacherId,
                students: { some: { id: studentId } }
            }
        });

        if (!enrollment) throw new Error('Access denied: Student not enrolled in your courses');

        const submissions = await this.prisma.unitSubmission.findMany({
            where: {
                userId: studentId,
                unit: {
                    module: {
                        course: { creatorId: teacherId }
                    }
                }
            },
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

    async enrollStudent(courseId: string, studentId: string) {
        return this.prisma.course.update({
            where: { id: courseId },
            data: {
                students: {
                    connect: { id: studentId }
                }
            }
        });
    }

    async enrollByEmails(courseId: string, emails: string[]) {
        const users = await this.prisma.user.findMany({
            where: { email: { in: emails } }
        });

        if (users.length === 0) return { success: false, message: 'No students found' };

        await this.prisma.course.update({
            where: { id: courseId },
            data: {
                students: {
                    connect: users.map((u: any) => ({ id: u.id }))
                }
            }
        });

        return { success: true, count: users.length };
    }

    async getSubmission(examId: string, identifier: string, teacherId: string) {
        // Try finding session directly by ID first (most reliable)
        let session = null;

        // Only attempt findUnique if identifier looks like a UUID to avoid Postgres errors
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

        if (isUUID) {
            session = await this.prisma.examSession.findUnique({
                where: { id: identifier },
                include: {
                    user: { select: { name: true, email: true, rollNumber: true } },
                    exam: { select: { title: true, questions: true, duration: true, creatorId: true } }
                }
            });
        }

        // If not found by session ID, try by student roll/id
        if (!session) {
            const student = await this.prisma.user.findFirst({
                where: {
                    OR: [
                        { id: identifier },
                        { rollNumber: identifier }
                    ]
                }
            });

            if (student) {
                session = await this.prisma.examSession.findFirst({
                    where: {
                        examId,
                        userId: student.id
                    },
                    include: {
                        user: { select: { name: true, email: true, rollNumber: true } },
                        exam: { select: { title: true, questions: true, duration: true, creatorId: true } }
                    }
                });
            }
        }

        if (!session) throw new Error('Submission not found');

        if (session.exam.creatorId !== teacherId) {
            throw new Error('Access denied: You do not own the exam for this submission');
        }

        const transformed = this.examService.transformExam(session.exam);

        return {
            details: {
                sessionId: session.id,
                studentName: session.user.name || session.user.email,
                rollNo: session.user.rollNumber || 'N/A',
                examId: session.examId,
                examTitle: session.exam.title,
                status: session.status,
                score: session.score,
                startTime: session.startTime,
                endTime: session.endTime
            },
            questions: Object.values(transformed.questions),
            questionsMap: transformed.questions,
            sections: transformed.sections,
            answers: session.answers,
            attempts: (session.answers as any)?._internal_attempts || {}
        };
    }

    async getCourses(userId: string) {
        return this.prisma.course.findMany({
            where: { creatorId: userId },
            include: {
                _count: { select: { modules: true, students: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async getExams(userId: string) {
        return this.prisma.exam.findMany({
            where: { creatorId: userId },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async deleteCourse(id: string, userId: string) {
        try {
            const course = await this.prisma.course.findUnique({ where: { id } });
            if (!course || course.creatorId !== userId) {
                throw new Error('Access denied: You do not own this course');
            }

            // 0. Disconnect students
            await this.prisma.course.update({
                where: { id },
                data: { students: { set: [] } }
            }).catch(() => { });

            // 1. Delete CourseTests
            await this.prisma.courseTest.deleteMany({ where: { courseId: id } });

            // 2. Delete Modules and Units
            const modules = await this.prisma.courseModule.findMany({ where: { courseId: id } });
            for (const mod of modules) {
                const units = await this.prisma.unit.findMany({ where: { moduleId: mod.id } });
                for (const unit of units) {
                    await this.prisma.unitSubmission.deleteMany({ where: { unitId: unit.id } });
                    await this.prisma.bookmark.deleteMany({ where: { unitId: unit.id } });
                    await this.prisma.unit.delete({ where: { id: unit.id } }).catch(() => { });
                }
                await this.prisma.courseModule.delete({ where: { id: mod.id } }).catch(() => { });
            }

            // 3. Delete Course
            const deleted = await this.prisma.course.delete({ where: { id } });
            return { success: true, deleted };
        } catch (e) {
            console.error(`[TeacherService] Delete failed for course ${id}:`, e);
            try {
                return await this.prisma.course.delete({ where: { id } });
            } catch (inner) {
                throw new Error(`Failed to delete course: ${inner.message}`);
            }
        }
    }

    async updateCourse(id: string, userId: string, data: any) {
        const existing = await this.prisma.course.findUnique({ where: { id } });
        if (!existing || existing.creatorId !== userId) {
            throw new Error('Access denied: You do not own this course');
        }

        const course = await this.prisma.course.update({
            where: { id },
            data: {
                title: data.title,
                slug: data.slug,
                shortDescription: data.shortDescription,
                longDescription: data.longDescription,
                difficulty: data.difficulty,
                tags: data.tags,
                thumbnail: data.thumbnail,
                isVisible: !!data.isVisible,
                status: data.status
            }
        });

        // 1. Sync Modules and Units
        if (data.sections && Array.isArray(data.sections)) {
            const existingModules = await this.prisma.courseModule.findMany({
                where: { courseId: id },
                include: { units: true }
            });

            const currentModuleIds = data.sections.map((s: any) => s.id).filter((id: string) => this.isUUID(id));
            const modulesToDelete = existingModules.filter((m: any) => !currentModuleIds.includes(m.id));

            for (const mod of modulesToDelete) {
                await this.prisma.courseModule.delete({ where: { id: mod.id } });
            }

            for (let i = 0; i < data.sections.length; i++) {
                const sec = data.sections[i];
                const isNewModule = !this.isUUID(sec.id);

                const module = isNewModule
                    ? await this.prisma.courseModule.create({ data: { title: sec.title, order: i, courseId: id } })
                    : await this.prisma.courseModule.update({ where: { id: sec.id }, data: { title: sec.title, order: i } });

                if (sec.questions && Array.isArray(sec.questions)) {
                    const existingUnits = existingModules.find((m: any) => m.id === module.id)?.units || [];
                    const currentUnitIds = sec.questions.map((q: any) => q.id).filter((id: string) => this.isUUID(id));
                    const unitsToDelete = existingUnits.filter((u: any) => !currentUnitIds.includes(u.id));

                    for (const unit of unitsToDelete) {
                        await this.prisma.unit.delete({ where: { id: unit.id } });
                    }

                    for (let j = 0; j < sec.questions.length; j++) {
                        const q = sec.questions[j];
                        const isNewUnit = !this.isUUID(q.id);
                        const unitData = {
                            title: q.title,
                            type: q.type,
                            order: j,
                            content: q,
                            moduleId: module.id
                        };

                        if (isNewUnit) {
                            await this.prisma.unit.create({ data: unitData });
                        } else {
                            await this.prisma.unit.update({ where: { id: q.id }, data: unitData });
                        }
                    }
                }
            }
        }

        // 2. Sync Course Tests
        if (data.tests && Array.isArray(data.tests)) {
            const existingTests = await this.prisma.courseTest.findMany({
                where: { courseId: id }
            });

            const currentTestIds = data.tests.map((t: { id: string }) => t.id).filter((id: string) => this.isUUID(id));
            const testsToDelete = existingTests.filter((t: any) => !currentTestIds.includes(t.id));

            for (const test of testsToDelete) {
                await this.prisma.courseTest.delete({ where: { id: test.id } });
            }

            for (const test of data.tests) {
                const isNewTest = !this.isUUID(test.id);
                const testData = {
                    title: test.title,
                    slug: test.slug || `${test.title.toLowerCase().replace(/ /g, '-')}-${Date.now()}`,
                    questions: test.questions || [],
                    startDate: test.startDate ? new Date(test.startDate) : null,
                    endDate: test.endDate ? new Date(test.endDate) : null,
                    courseId: id
                };

                if (isNewTest) {
                    await this.prisma.courseTest.create({ data: testData });
                } else {
                    await this.prisma.courseTest.update({ where: { id: test.id }, data: testData });
                }
            }
        }

        return course;
    }

    private isUUID(str: string): boolean {
        if (!str || typeof str !== 'string') return false;
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return regex.test(str);
    }

    async createCourse(userId: string, data: any, orgId?: string | null) {
        const course = await this.prisma.course.create({
            data: {
                title: data.title,
                slug: data.slug || `course-${Date.now()}`,
                creatorId: userId, // Ensure Prisma schema has this
                orgId: orgId,
                // ... map other fields explicitly or cast data if needed
                shortDescription: data.shortDescription,
                longDescription: data.longDescription,
                difficulty: data.difficulty,
                tags: data.tags || [],
                thumbnail: data.thumbnail,
                isVisible: !!data.isVisible,
                status: data.status || 'Draft',
                modules: {
                    create: (data.modules || []).map((m: any) => ({
                        title: m.title,
                        order: m.order,
                        units: {
                            create: (m.units || []).map((u: any) => ({
                                title: u.title,
                                type: u.type,
                                order: u.order,
                                content: u.content || {}
                            }))
                        }
                    }))
                },
                tests: {
                    create: (data.tests || []).map((t: any) => ({
                        title: t.title,
                        slug: t.slug || `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        questions: t.questions || []
                    }))
                }
            } as any, // Cast to any to avoid creatorId type issues if schema is lagging
            include: {
                modules: { include: { units: true } },
                tests: true
            }
        });
        return course;
    }

    async createExam(userId: string, data: any, orgId?: string | null) {
        return this.prisma.exam.create({
            data: {
                title: data.title,
                slug: data.slug || `exam-${Date.now()}`,
                creatorId: userId,
                orgId: orgId,
                shortDescription: data.shortDescription,
                longDescription: data.longDescription,
                difficulty: data.difficulty,
                tags: data.tags || [],
                duration: Number(data.duration) || 60,
                totalMarks: data.totalMarks ? Number(data.totalMarks) : 0,
                testCode: data.testCode,
                testCodeType: data.testCodeType,
                rotationInterval: data.rotationInterval ? Number(data.rotationInterval) : null,
                inviteToken: data.inviteToken,
                allowedIPs: data.allowedIPs,
                examMode: data.examMode,
                aiProctoring: !!data.aiProctoring,
                tabSwitchLimit: data.tabSwitchLimit ? Number(data.tabSwitchLimit) : null,
                startTime: data.startTime ? new Date(data.startTime) : null,
                endTime: data.endTime ? new Date(data.endTime) : null,
                questions: data.sections || data.questions || [],
                isActive: data.isActive ?? data.isVisible ?? true
            } as any
        });
    }

    async updateExam(id: string, userId: string, data: any) {
        const existing = await this.prisma.exam.findUnique({ where: { id } });
        if (!existing || (existing as any).creatorId !== userId) {
            throw new Error('Access denied: You do not own this exam');
        }

        return this.prisma.exam.update({
            where: { id },
            data: {
                title: data.title,
                slug: data.slug,
                shortDescription: data.shortDescription,
                longDescription: data.longDescription,
                difficulty: data.difficulty,
                tags: data.tags,
                duration: data.duration ? Number(data.duration) : undefined,
                totalMarks: data.totalMarks ? Number(data.totalMarks) : undefined,
                testCode: data.testCode,
                testCodeType: data.testCodeType,
                rotationInterval: data.rotationInterval ? Number(data.rotationInterval) : null,
                inviteToken: data.inviteToken,
                allowedIPs: data.allowedIPs,
                examMode: data.examMode,
                aiProctoring: data.aiProctoring,
                tabSwitchLimit: data.tabSwitchLimit ? Number(data.tabSwitchLimit) : null,
                startTime: data.startTime ? new Date(data.startTime) : null,
                endTime: data.endTime ? new Date(data.endTime) : null,
                questions: data.sections || data.questions,
                isActive: data.isActive ?? data.isVisible
            }
        });
    }

    async deleteExam(id: string, userId: string) {
        try {
            // 0. Check if exists and ownership
            const exam = await this.prisma.exam.findUnique({ where: { id } });
            if (!exam) return { success: true, message: 'Exam already deleted' };
            if ((exam as any).creatorId !== userId) {
                throw new Error('Access denied: You do not own this exam');
            }

            // 1. Delete Feedbacks
            await this.prisma.feedback.deleteMany({ where: { examId: id } });

            // 2. Delete ExamSessions and Violations
            const sessions = await this.prisma.examSession.findMany({ where: { examId: id } });
            for (const session of sessions) {
                await this.prisma.violation.deleteMany({ where: { sessionId: session.id } });
                await this.prisma.examSession.delete({ where: { id: session.id } }).catch(() => { });
            }

            // 3. Delete the exam itself
            const deleted = await this.prisma.exam.delete({ where: { id } });
            return { success: true, deleted };
        } catch (e) {
            console.error(`[TeacherService] Final delete failed for exam ${id}:`, e);
            // Last resort: deletion without dependencies check
            try {
                return await this.prisma.exam.delete({ where: { id } });
            } catch (inner) {
                throw new Error(`Failed to delete exam: ${inner.message}`);
            }
        }
    }

    async getMonitoredStudents(examId: string, userId: string) {
        // Verify ownership
        const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
        if (!exam || (exam as any).creatorId !== userId) {
            throw new Error('Access denied: You do not own this exam');
        }

        // Fetch all sessions for this exam
        const sessions = await this.prisma.examSession.findMany({
            where: { examId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        rollNumber: true
                    }
                },
                violations: {
                    orderBy: { timestamp: 'desc' }
                }
            },
            orderBy: { startTime: 'desc' }
        });

        // Transform to frontend format
        return sessions.map(session => {
            const tabSwitchViolations = session.violations.filter(v => v.type === 'TAB_SWITCH' || v.type === 'TAB_SWITCH_OUT' || v.type === 'TAB_SWITCH_IN');
            const vmViolations = session.violations.filter(v => v.type === 'VM_DETECTED');

            return {
                id: session.user.id,
                name: session.user.name || session.user.email || 'Unknown',
                email: session.user.email,
                rollNumber: session.user.rollNumber || 'N/A',
                status: session.status === 'COMPLETED' || (Date.now() > (new Date(session.startTime).getTime() + (exam.duration * 60000)) && session.status !== 'TERMINATED') ? 'Completed' : session.status === 'TERMINATED' ? 'Terminated' : 'In Progress',
                ip: session.ipAddress || 'Unknown',
                vmDetected: session.vmDetected || vmViolations.length > 0,
                vmType: vmViolations.length > 0 ? vmViolations[0].message : null,
                tabOuts: session.violations.filter(v => v.type === 'TAB_SWITCH' || v.type === 'TAB_SWITCH_OUT').length,
                tabIns: session.violations.filter(v => v.type === 'TAB_SWITCH_IN').length,
                isHighRisk: session.vmDetected || tabSwitchViolations.length > 5,
                lastActivity: new Date(session.updatedAt).toLocaleString(),
                startTime: new Date(session.startTime).toLocaleTimeString(),
                endTime: session.endTime ? new Date(session.endTime).toLocaleTimeString() : 'Ongoing',
                monitors: 1,
                loginCount: 1,
                sleepDuration: '0m',
                appVersion: 'Web',
                logs: session.violations.map(v => ({
                    time: new Date(v.timestamp).toLocaleTimeString(),
                    event: v.type === 'TAB_SWITCH' || v.type === 'TAB_SWITCH_OUT' ? 'Tab Switch Out' : v.type === 'TAB_SWITCH_IN' ? 'Tab Switch In' : v.type === 'VM_DETECTED' ? 'VM Detection' : v.type,
                    description: v.message || 'No details'
                }))
            };
        });
    }

    async getFeedbacks(examId: string, userId: string) {
        // Verify ownership
        const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
        if (!exam || (exam as any).creatorId !== userId) {
            throw new Error('Access denied: You do not own this exam');
        }

        const feedbacks = await this.prisma.feedback.findMany({
            where: { examId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { timestamp: 'desc' }
        });

        return feedbacks.map(f => ({
            id: f.id,
            userName: f.user.name || f.user.email || 'Anonymous',
            userEmail: f.user.email,
            rating: f.rating,
            comment: f.comment || '',
            time: new Date(f.timestamp).toLocaleString(),
            isSeen: false // You can add a field to track this in the schema if needed
        }));
    }

    async terminateExamSession(examId: string, studentId: string, teacherId: string) {
        // Verify ownership
        const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
        if (!exam || (exam as any).creatorId !== teacherId) {
            throw new Error('Access denied: You do not own this exam');
        }

        // Update session status
        await this.prisma.examSession.updateMany({
            where: { examId, userId: studentId },
            data: { status: 'TERMINATED', endTime: new Date() }
        });

        // Force kick via websocket
        await this.monitoringGateway.forceTerminate(examId, studentId);

        return { success: true };
    }

    async unterminateExamSession(examId: string, studentId: string, teacherId: string) {
        // Verify ownership
        const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
        if (!exam || (exam as any).creatorId !== teacherId) {
            throw new Error('Access denied: You do not own this exam');
        }

        // Update session status back to IN_PROGRESS
        await this.prisma.examSession.updateMany({
            where: { examId, userId: studentId },
            data: { status: 'IN_PROGRESS', endTime: null }
        });

        return { success: true };
    }

    async getExamResults(examId: string, userId: string) {
        // Verify ownership
        const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
        if (!exam || (exam as any).creatorId !== userId) {
            throw new Error('Access denied: You do not own this exam');
        }

        const sessions = await this.prisma.examSession.findMany({
            where: { examId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        rollNumber: true
                    }
                }
            },
            orderBy: { endTime: 'desc' }
        });

        // Map sessions to frontend format
        const mappedSessions = sessions.map(session => {
            const answers = typeof session.answers === 'string'
                ? JSON.parse(session.answers)
                : (session.answers || {});

            const metadata = answers._internal_metadata || {};

            // Calculate marks if not already explicitly set or to ensure freshness
            const calculatedScore = this.examService.calculateScore(answers, exam.questions);
            const score = session.score !== null ? session.score : calculatedScore;

            const totalMarks = Number(exam.totalMarks) || 0;
            const status = totalMarks > 0
                ? (score / totalMarks >= 0.4 ? 'Passed' : 'Failed')
                : (session.status === 'COMPLETED' ? 'Submitted' : 'Failed');

            return {
                sessionId: session.id,
                rollNo: metadata.rollNumber || session.user.rollNumber || 'N/A',
                name: metadata.name || session.user.name || 'Unknown',
                email: session.user.email,
                section: metadata.section || 'N/A',
                submittedAt: session.endTime ? new Date(session.endTime).toLocaleString() : 'Open',
                timeTaken: session.endTime
                    ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000) + ' min'
                    : 'N/A',
                attempted: Object.keys(answers).filter(k => k.startsWith('_submitted_')).length + ' Q',
                score: score,
                totalPossible: totalMarks,
                status: status
            };
        });

        return {
            results: mappedSessions,
            resultsPublished: (exam as any).resultsPublished || false
        };
    }

    async updateSubmissionScore(sessionId: string, newScore: number, teacherId: string) {
        // Verify ownership via session -> exam
        const session = await this.prisma.examSession.findUnique({
            where: { id: sessionId },
            include: { exam: true }
        });

        if (!session || (session.exam as any).creatorId !== teacherId) {
            throw new Error('Access denied or session not found');
        }

        return this.prisma.examSession.update({
            where: { id: sessionId },
            data: { score: newScore }
        });
    }

    async publishResults(examId: string, teacherId: string) {
        const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
        if (!exam || (exam as any).creatorId !== teacherId) {
            throw new Error('Access denied or exam not found');
        }

        return this.prisma.exam.update({
            where: { id: examId },
            data: { resultsPublished: true }
        });
    }

}
