import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';

@Injectable()
export class CourseService {
    constructor(private prisma: PrismaService) { }

    async getCourse(slug: string, user?: any) {
        const course = await this.prisma.course.findUnique({
            where: { slug },
            include: {
                modules: {
                    orderBy: { order: 'asc' },
                    include: {
                        units: {
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                title: true,
                                type: true,
                                order: true
                            }
                        }
                    }
                },
                tests: {
                    orderBy: { startDate: 'asc' },
                    select: {
                        id: true,
                        slug: true,
                        title: true,
                        startDate: true,
                        endDate: true,
                        questions: true
                    }
                }
            }
        });
        if (!course) throw new NotFoundException('Course not found');

        // ISOLATION CHECK
        if (user && user.role !== 'SUPER_ADMIN') {
            if (course.orgId && course.orgId !== user.orgId) {
                throw new NotFoundException('Course not found or access denied');
            }
        }

        return course;
    }

    async getUnit(id: string, user?: any) {
        console.log('[CourseService] getUnit id=', id);
        const unit = await this.prisma.unit.findUnique({
            where: { id },
            include: {
                module: {
                    include: {
                        course: true
                    }
                }
            }
        });

        // 1. If Unit Found, Check Isolation via Course
        if (unit) {
            if (user && user.role !== 'SUPER_ADMIN') {
                if (unit.module.course.orgId && unit.module.course.orgId !== user.orgId) {
                    throw new NotFoundException('Unit not found');
                }
            }
            return unit;
        }

        // 2. If Unit NOT found, look in CourseTests
        // (Course Tests store 'questions' as structured JSON with sections)
        const tests = await this.prisma.courseTest.findMany({ include: { course: true } });
        console.log('[CourseService] searching', tests.length, 'course tests for question id');
        for (const test of tests) {
            // OPTIMIZATION: Check isolation FIRST if efficient, but we need to find the specific test first
            // Actually, if we are iterating all tests, we can skip those from other orgs!
            if (user && user.role !== 'SUPER_ADMIN') {
                if (test.course.orgId && test.course.orgId !== user.orgId) {
                    continue; // Skip tests from other orgs
                }
            }

            // Defensive: CourseTest.questions might be stored as a JSON string or already as object
            let questionsData: any = test.questions;
            if (typeof questionsData === 'string') {
                try {
                    questionsData = JSON.parse(questionsData);
                } catch (e) {
                    console.log('[CourseService] failed to parse questions JSON for test', test.id, e.message || e);
                    questionsData = {};
                }
            }

            const sections = Array.isArray(questionsData) ? questionsData : (questionsData?.sections || []);

            // Support two shapes: sections with s.questions (grouped) OR an array of question objects
            const listOfQuestions = sections.flatMap((s: any) => {
                if (s && Array.isArray(s.questions)) return s.questions;
                // when test.questions is a flat array of questions, `sections` will be that array and s is a question
                if (s && s.id) return [s];
                return [];
            });

            for (const q of listOfQuestions) {
                // defensive: compare normalized ids (support 'q-123' and '123')
                const normalize = (x: any) => String(x || '').replace(/^q-/i, '');
                if (normalize(q.id) === normalize(id)) {
                    console.log('[CourseService] matched question', q.id, 'in test', test.id, 'requested id', id);

                    // Already checked isolation via 'continue' above

                    // Map test question into a unit-like structure so frontend can render it via existing Unit page
                    return {
                        id: id, // return the requested id so frontend routes match
                        title: q.title || test.title,
                        type: q.type || q.questionType || 'Reading',
                        content: q,
                        module: { id: test.id, title: test.title, course: test.course },
                        // Expose moduleUnits referencing other questions in test for navigation and sidebar
                        moduleUnits: listOfQuestions.map((qq: any) => ({ id: String(qq.id).startsWith('q-') ? String(qq.id) : `q-${qq.id}`, type: qq.type || qq.questionType, title: qq.title }))
                    };
                }
            }
        }

        throw new NotFoundException('Unit not found');
    }
}
