import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { PrismaService } from '../../services/prisma/prisma.service';

@Injectable()
export class ExamService {
    constructor(
        private prisma: PrismaService,
        @InjectRedis() private readonly redis: Redis
    ) { }

    async createExam(data: any) {
        try {
            return await this.prisma.exam.create({
                data: {
                    title: data.title,
                    slug: data.slug,
                    duration: data.duration || 60,
                    questions: data.questions,
                    strictness: data.strictness || 'high',
                }
            });
        } catch (e) {
            if (e.code === 'P2002') throw new ConflictException('Slug already exists');
            throw e;
        }
    }

    async getExamBySlug(slug: string, user?: any) {
        // 1. Try finding in Standalone Exams
        const exam = await this.prisma.exam.findUnique({
            where: { slug, isActive: true },
        });

        if (exam) {
            // ISOLATION CHECK
            if (user && user.role !== 'SUPER_ADMIN') {
                // If exam has Org, User must match. 
                // If exam has NO Org (legacy/global), maybe allow? 
                // Requirement implies strictness. Let's assume content SHOULD have org.
                if (exam.orgId && exam.orgId !== user.orgId) {
                    throw new NotFoundException('Assessment not found or access denied');
                }
                // If exam has no orgId, it's global? Allow for now or restrict?
                // Safer to allow global content if it exists.
            }

            return this.transformExam(exam);
        }

        // 2. Try finding in Course Tests
        const courseTest = await this.prisma.courseTest.findUnique({
            where: { slug },
            include: { course: true }
        });

        if (courseTest) {
            // ISOLATION CHECK from Course
            if (user && user.role !== 'SUPER_ADMIN') {
                if (courseTest.course.orgId && courseTest.course.orgId !== user.orgId) {
                    throw new NotFoundException('Assessment not found');
                }
            }

            console.log('Found CourseTest:', JSON.stringify(courseTest, null, 2));
            const transformed = this.transformCourseTest(courseTest);
            // Add startTime for frontend timer calculation
            (transformed as any).startTime = courseTest.startDate || courseTest.createdAt;
            console.log('Transformed CourseTest:', JSON.stringify(transformed, null, 2));
            return transformed;
        }

        // 3. Try finding in Courses (Curriculum mode)
        const course = await this.prisma.course.findUnique({
            where: { slug },
            include: {
                modules: {
                    include: { units: true },
                    orderBy: { order: 'asc' }
                }
            }
        });

        if (course) {
            // ISOLATION CHECK
            if (user && user.role !== 'SUPER_ADMIN') {
                if (course.orgId && course.orgId !== user.orgId) {
                    throw new NotFoundException('Assessment not found');
                }
            }
            return this.transformCourse(course);
        }

        throw new NotFoundException('Assessment not found');
    }

    async getPublicStatus(slug: string) {
        const exam = await this.prisma.exam.findUnique({
            where: { slug, isActive: true },
            select: { title: true, startTime: true, duration: true, id: true, questions: true, totalMarks: true }
        });

        if (exam) {
            const rawQuestions: any = exam.questions || {};
            let totalQuestions = 0;
            let totalSections = 0;

            if (rawQuestions.sections && Array.isArray(rawQuestions.sections)) {
                totalSections = rawQuestions.sections.length;
                rawQuestions.sections.forEach((s: any) => {
                    if (Array.isArray(s.questions)) {
                        totalQuestions += s.questions.length;
                    }
                });
            } else if (Array.isArray(rawQuestions)) {
                totalSections = 1;
                totalQuestions = rawQuestions.length;
            } else if (Object.keys(rawQuestions).length > 0) { // Handle flat object of questions
                totalSections = 1;
                totalQuestions = Object.keys(rawQuestions).length;
            }


            return {
                title: exam.title,
                startTime: exam.startTime,
                duration: exam.duration,
                totalSections: totalSections,
                totalQuestions: totalQuestions,
                totalMarks: exam.totalMarks || (totalQuestions * 1),
                id: exam.id
            };
        }

        // Check Course Test
        const courseTest = await this.prisma.courseTest.findUnique({
            where: { slug },
            select: { title: true, startDate: true, endDate: true, id: true, questions: true }
        });

        if (courseTest) {
            let duration = 60;
            if (courseTest.startDate && courseTest.endDate) {
                const diffMs = courseTest.endDate.getTime() - courseTest.startDate.getTime();
                duration = Math.floor(diffMs / 60000);
            }

            const rawQuestions: any = courseTest.questions || {};
            let totalQuestions = 0;
            let totalSections = 1;

            if (rawQuestions.sections && Array.isArray(rawQuestions.sections)) {
                totalSections = rawQuestions.sections.length;
                rawQuestions.sections.forEach((s: any) => {
                    if (Array.isArray(s.questions)) {
                        totalQuestions += s.questions.length;
                    }
                });
            } else if (Array.isArray(rawQuestions)) {
                totalQuestions = rawQuestions.length;
            }

            return {
                title: courseTest.title,
                startTime: courseTest.startDate,
                duration: duration,
                totalSections: totalSections,
                totalQuestions: totalQuestions,
                totalMarks: totalQuestions * 1,
                id: courseTest.id
            };
        }

        throw new NotFoundException('Exam not found');
    }


    private normalizeType(type: string): string {
        const t = type.toLowerCase();
        if (t.includes('mcq') || t.includes('quiz') || t.includes('choice')) return 'MCQ';
        if (t.includes('code') || t.includes('coding') || t.includes('program')) return 'Coding';
        if (t.includes('web') || t.includes('html')) return 'Web';
        if (t.includes('read') || t.includes('text') || t.includes('lesson')) return 'Reading';
        if (t.includes('notebook') || t.includes('jupyter')) return 'Notebook';
        return 'MCQ'; // Default fallback
    }

    private transformExam(exam: any) {
        const questionsMap: Record<string, any> = {};
        const finalSections: any[] = [];

        // 1. Build a comprehensive map of all items found in the 'questions' JSON
        // This handles cases where 'questions' is a map of sections, or just an array
        const rawQuestions = exam.questions || {};
        const sourceMap = (rawQuestions.sections || !Array.isArray(rawQuestions)) ? (rawQuestions.sections || rawQuestions) : {};
        const sourceArray = Array.isArray(rawQuestions) ? rawQuestions : Object.values(sourceMap);

        const registerQuestion = (q: any, parentId?: string, index?: number) => {
            const qId = q.id || `${parentId || 'q'}-${index || Math.random()}`;
            const normalizedQ = {
                ...q,
                id: qId,
                title: q.title || `Question ${index || ''}`,
                description: q.description || q.problemStatement || '',
                type: this.normalizeType(q.type || 'MCQ'),
                mcqOptions: q.mcqOptions || q.options || q.mcq?.options,
                codingConfig: q.codingConfig || q.coding,
                webConfig: q.webConfig || q.web,
                readingContent: q.readingContent || q.readingConfig?.contentBlocks || q.readingConfig
            };
            questionsMap[qId] = normalizedQ;
            return qId;
        };

        // Pre-fill map from source
        sourceArray.forEach((item: any) => {
            if (!item || typeof item !== 'object') return;
            if (Array.isArray(item.questions)) {
                item.questions.forEach((q: any, i: number) => registerQuestion(q, item.id || 'sec', i + 1));
            } else {
                registerQuestion(item);
            }
        });

        // 2. Process existing sections structure if present in DB
        if (Array.isArray(exam.sections) && exam.sections.length > 0) {
            exam.sections.forEach((s: any, sIdx: number) => {
                const sectionQuestions: any[] = [];
                (s.questions || []).forEach((sq: any) => {
                    // Check if this ID points to a section entry in our source map
                    const sourceItem = sourceMap[sq.id];
                    if (sourceItem && Array.isArray(sourceItem.questions)) {
                        // Spread sub-questions into this section
                        sourceItem.questions.forEach((lq: any, lqIdx: number) => {
                            const lqId = registerQuestion(lq, sourceItem.id, lqIdx + 1);
                            sectionQuestions.push({ id: lqId, status: 'unanswered', number: sectionQuestions.length + 1 });
                        });
                    } else if (questionsMap[sq.id]) {
                        // Standard question
                        sectionQuestions.push({ ...sq, number: sectionQuestions.length + 1 });
                    }
                });

                if (sectionQuestions.length > 0) {
                    finalSections.push({
                        ...s,
                        status: sIdx === 0 ? 'active' : 'locked',
                        questions: sectionQuestions
                    });
                }
            });
        }

        // 3. If no sections were built from Step 2, build from Step 1's source map
        if (finalSections.length === 0) {
            sourceArray.forEach((item: any, idx: number) => {
                if (!item || typeof item !== 'object') return;

                const sectionQuestions: any[] = [];
                if (Array.isArray(item.questions)) {
                    item.questions.forEach((q: any, qIdx: number) => {
                        const qId = registerQuestion(q, item.id, qIdx + 1);
                        sectionQuestions.push({ id: qId, status: 'unanswered', number: sectionQuestions.length + 1 });
                    });

                    finalSections.push({
                        id: item.id || `s${idx + 1}`,
                        title: item.title || `Section ${idx + 1}`,
                        status: finalSections.length === 0 ? 'active' : 'locked',
                        questions: sectionQuestions
                    });
                } else {
                    // Handle flat questions by grouping into a default section
                    const qId = registerQuestion(item, 'q', idx + 1);
                    const defaultSection = finalSections.find(fs => fs.id === 'default-section');
                    if (defaultSection) {
                        defaultSection.questions.push({ id: qId, status: 'unanswered', number: defaultSection.questions.length + 1 });
                    } else {
                        finalSections.push({
                            id: 'default-section',
                            title: 'Assessment',
                            status: 'active',
                            questions: [{ id: qId, status: 'unanswered', number: 1 }]
                        });
                    }
                }
            });
        }

        return {
            ...exam,
            sections: finalSections,
            questions: questionsMap
        };
    }

    private transformCourseTest(test: any) {
        // Course Tests are already stored with 'questions' which is the sections JSON
        const questionsData = test.questions as any;
        // Handle both: arrays (sections list) or object with sections key
        const sections = Array.isArray(questionsData) ? questionsData : (questionsData.sections || []);

        const questionsMap: Record<string, any> = {};

        // Normalize types and preserve all fields
        const normalizedSections = sections.map((s: any) => ({
            ...s,
            questions: s.questions.map((q: any) => {
                const normalizedType = this.normalizeType(q.type || 'MCQ');
                const normalizedQ = {
                    ...q,
                    id: q.id,
                    title: q.title || 'Untitled Question',
                    description: q.description || q.problemStatement || '', // Support both field names
                    type: normalizedType,
                    // Preserve specific configs if they exist, or map from flat structure if needed
                    mcqOptions: q.mcqOptions || q.options,
                    codingConfig: q.codingConfig || q.coding,
                    webConfig: q.webConfig || q.web,
                    readingContent: q.readingContent || q.readingConfig?.contentBlocks || q.readingConfig
                };

                // Ensure map gets the full object
                questionsMap[q.id] = normalizedQ;
                return normalizedQ;
            })
        }));

        let duration = 60;
        if (test.startDate && test.endDate) {
            const diffMs = new Date(test.endDate).getTime() - new Date(test.startDate).getTime();
            duration = Math.floor(diffMs / 60000);
        }

        console.log(`[ExamService] Transforming CourseTest "${test.slug}". Found ${normalizedSections.length} sections.`);
        normalizedSections.forEach((s: any, i: number) => {
            console.log(`  Section ${i + 1} ("${s.id}"): ${s.questions.length} questions`);
        });

        return {
            id: test.id,
            title: test.title,
            slug: test.slug,
            duration: duration,
            sections: normalizedSections,
            questions: questionsMap, // This is critical for looking up current question
            isCourseTest: true,
            courseTitle: test.course?.title
        };
    }

    private transformCourse(course: any) {
        const questionsMap: Record<string, any> = {};
        const sections = course.modules.map((m: any, mIdx: number) => {
            const questions = m.units.map((u: any, uIdx: number) => {
                const qId = u.id;
                // Transform Unit to UnitQuestion format
                const unitContent = u.content as any;
                const normalizedType = this.normalizeType(u.type);

                questionsMap[qId] = {
                    ...unitContent,
                    id: qId,
                    title: u.title,
                    type: normalizedType
                };
                return { id: qId, status: 'unanswered', number: uIdx + 1 };
            });

            return {
                id: m.id,
                title: m.title,
                status: mIdx === 0 ? 'active' : 'locked',
                questions: questions
            };
        });

        return {
            id: course.id,
            title: course.title,
            slug: course.slug,
            sections: sections,
            questions: questionsMap,
            isCourse: true
        };
    }

    async startSession(userId: string, examId: string, ip: string, deviceId: string, tabId?: string, metadata?: any) {
        try {
            // ... (presence handling)
            const presenceRaw = await this.redis.get(`exam:${examId}:student:${userId}:online`);

            // Find existing session first to resume
            const existing = await this.prisma.examSession.findUnique({
                where: { userId_examId: { userId, examId } },
                include: {
                    violations: {
                        where: { type: { in: ['TAB_SWITCH', 'TAB_SWITCH_OUT', 'TAB_SWITCH_IN'] } }
                    }
                }
            });

            if (existing) {
                // If metadata changed, we could update it. But typically it stays same for the session.
                // We'll update it if provided to ensure the latest "Name/Roll No" from login is preserved.
                if (metadata) {
                    const currentAnswers = typeof existing.answers === 'string'
                        ? JSON.parse(existing.answers)
                        : (existing.answers || {});

                    const updatedAnswers = {
                        ...currentAnswers,
                        _internal_metadata: {
                            ...(currentAnswers._internal_metadata || {}),
                            ...metadata
                        }
                    };

                    await this.prisma.examSession.update({
                        where: { id: existing.id },
                        data: { answers: updatedAnswers }
                    });
                }

                // CHECK FEEDBACK STATUS
                const feedbackRecord = await this.prisma.feedback.findFirst({
                    where: { userId, examId }
                });

                // Add violation counts to existing object
                (existing as any).tabSwitchOutCount = existing.violations.filter(v => v.type === 'TAB_SWITCH' || v.type === 'TAB_SWITCH_OUT').length;
                (existing as any).tabSwitchInCount = existing.violations.filter(v => v.type === 'TAB_SWITCH_IN').length;
                (existing as any).feedbackDone = !!feedbackRecord;
                return existing;
            }

            return await this.prisma.examSession.create({
                data: {
                    userId,
                    examId,
                    ipAddress: ip,
                    deviceId,
                    startTime: new Date(),
                    answers: metadata ? { _internal_metadata: metadata } : {}
                }
            });
        } catch (e) {
            console.error('[ExamService] Failed to start/resume session', e);
            throw e;
        }
    }

    async getAppConfig() {
        return { version: '1.0.0', features: ['monitoring', 'lockdown'] };
    }

    async getMonitoredStudents(examId: string) {
        const sessions = await this.prisma.examSession.findMany({
            where: { examId },
            include: { user: true, violations: true }
        });

        return sessions.map((session: any) => ({
            name: session.user?.name || 'Unknown',
            id: session.user?.rollNumber || session.userId.substring(0, 8),
            status: session.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed',
            ip: session.ipAddress,
            tabOuts: session.violations.filter((v: any) => v.type === 'TAB_SWITCH').length,
            tabIns: 0,
            vmDetected: session.vmDetected,
            vmType: session.vmDetected ? 'Generic VM' : undefined,
            appVersion: '1.0.0',
            monitors: 1,
            startTime: session.startTime.toLocaleTimeString(),
            endTime: session.endTime ? session.endTime.toLocaleTimeString() : '-',
            loginCount: 1,
            sleepDuration: '0s',
            lastActivity: 'Just now',
            isHighRisk: session.violations.length > 2 || session.vmDetected,
            logs: session.violations.map((v: any) => ({
                time: v.timestamp.toLocaleTimeString(),
                event: v.type,
                description: v.message || 'Violation detected'
            }))
        }));
    }

    async getFeedbacks(examId: string) {
        return await this.prisma.feedback.findMany({
            where: { examId },
            include: { user: true },
            orderBy: { timestamp: 'desc' }
        });
    }

    async saveFeedback(userId: string, examId: string, rating: number, comment: string) {
        return await this.prisma.feedback.create({
            data: {
                userId,
                examId,
                rating,
                comment,
                timestamp: new Date()
            }
        });
    }
}
