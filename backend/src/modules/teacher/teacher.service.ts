import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';

@Injectable()
export class TeacherService {
    constructor(private prisma: PrismaService) { }

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

        return courses.map(c => ({
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
                    select: { title: true }
                },
                unitSubmissions: {
                    where: {
                        unit: {
                            module: {
                                course: { creatorId: userId }
                            }
                        }
                    },
                    select: { status: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return students.map(s => ({
            id: s.id,
            name: s.name || s.email,
            course: s.courses.length > 0 ? s.courses[0].title : 'Not Enrolled',
            progress: s.unitSubmissions.length > 0
                ? Math.round((s.unitSubmissions.filter(sub => sub.status === 'COMPLETED').length / s.unitSubmissions.length) * 100)
                : 0,
            submissions: s.unitSubmissions.length,
            lastActive: s.updatedAt.toLocaleDateString()
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
                    connect: users.map(u => ({ id: u.id }))
                }
            }
        });

        return { success: true, count: users.length };
    }

    async getSubmission(examId: string, identifier: string, userId: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { rollNumber: identifier }
                ]
            }
        });

        if (!user) throw new Error('Student not found');

        const session = await this.prisma.examSession.findFirst({
            where: {
                examId,
                userId: user.id
            },
            include: {
                user: { select: { name: true, email: true, rollNumber: true } },
                exam: { select: { title: true, questions: true, duration: true, creatorId: true } }
            }
        });

        if (!session) throw new Error('Submission not found');

        if (session.exam.creatorId !== userId) {
            throw new Error('Access denied: You do not own the exam for this submission');
        }

        return {
            details: {
                studentName: session.user.name || session.user.email,
                rollNo: session.user.rollNumber || 'N/A',
                examTitle: session.exam.title,
                status: session.status,
                score: session.score,
                startTime: session.startTime,
                endTime: session.endTime
            },
            questions: session.exam.questions,
            answers: session.answers,
            attempts: {}
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
            const modulesToDelete = existingModules.filter(m => !currentModuleIds.includes(m.id));

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
                    const existingUnits = existingModules.find(m => m.id === module.id)?.units || [];
                    const currentUnitIds = sec.questions.map((q: any) => q.id).filter((id: string) => this.isUUID(id));
                    const unitsToDelete = existingUnits.filter(u => !currentUnitIds.includes(u.id));

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
            const testsToDelete = existingTests.filter(t => !currentTestIds.includes(t.id));

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
}
