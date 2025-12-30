
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️ Cleaning database...');
    // Order matters for deletion
    await prisma.bookmark.deleteMany();
    await prisma.unitSubmission.deleteMany();
    await prisma.violation.deleteMany();
    await prisma.examSession.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.courseModule.deleteMany();
    await prisma.course.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    console.log('🌱 Seeding organizations...');
    const org1 = await prisma.organization.create({
        data: {
            id: 'cq-org',
            name: 'CodeQuotient Academy',
            status: 'Active',
            domain: 'codequotient.com',
            maxUsers: 500,
            examsPerMonth: 200
        }
    });

    const org2 = await prisma.organization.create({
        data: {
            id: 'iit-org',
            name: 'IIT Delhi',
            status: 'Active',
            domain: 'iitd.ac.in',
            maxUsers: 1000,
            examsPerMonth: 500
        }
    });

    console.log('👤 Seeding users...');
    // Admin
    const admin = await prisma.user.create({
        data: {
            email: 'admin@codequotient.com',
            password: 'hashed_admin_pass',
            name: 'Admin User',
            role: 'ADMIN',
            orgId: org1.id
        }
    });

    // Teacher
    const teacher = await prisma.user.create({
        data: {
            email: 'teacher@codequotient.com',
            password: 'hashed_teacher_pass',
            name: 'Pawan Bista',
            role: 'TEACHER',
            orgId: org1.id
        }
    });

    // Student 1 (Suman)
    const student1 = await prisma.user.create({
        data: {
            email: 'suman@gmail.com',
            password: 'hashedpassword123',
            name: 'Suman',
            rollNumber: '2211981482',
            role: 'STUDENT',
            orgId: org1.id
        }
    });

    // Student 2 (John)
    const student2 = await prisma.user.create({
        data: {
            email: 'john@iitd.ac.in',
            password: 'hashedpassword123',
            name: 'John Doe',
            rollNumber: 'IITD-101',
            role: 'STUDENT',
            orgId: org2.id
        }
    });

    console.log('📚 Seeding courses & units...');
    const course1 = await prisma.course.create({
        data: {
            title: 'Full-Stack Web Development',
            slug: 'full-stack-v1',
            shortDescription: 'Master React, Node.js, and Databases.',
            status: 'Published',
            students: { connect: [{ id: student1.id }] },
            modules: {
                create: [
                    {
                        title: 'Module 1: Fundamentals',
                        order: 1,
                        units: {
                            create: [
                                {
                                    id: 'unit-html',
                                    title: 'HTML 5 Mastery',
                                    type: 'Reading',
                                    order: 1,
                                    content: { description: '<h3>HTML Intro</h3><p>Semantic tags are key.</p>' }
                                },
                                {
                                    id: 'unit-css-flex',
                                    title: 'CSS Flexbox Guide',
                                    type: 'Coding',
                                    order: 2,
                                    content: {
                                        description: 'Build a navbar using Flexbox.',
                                        codingConfig: { languageId: 'html', initialCode: '<nav class="flex"></nav>' }
                                    }
                                }
                            ]
                        }
                    },
                    {
                        title: 'Module 2: React Core',
                        order: 2,
                        units: {
                            create: [
                                {
                                    id: 'unit-hooks',
                                    title: 'Understanding Hooks',
                                    type: 'MCQ',
                                    order: 1,
                                    content: {
                                        description: 'Which hook manages state?',
                                        mcqOptions: [{ id: 'a', text: 'useState' }, { id: 'b', text: 'useRef' }]
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }
    });

    console.log('📝 Seeding exams...');
    const exam1 = await prisma.exam.create({
        data: {
            slug: 'js-logic-test',
            title: 'JavaScript Logic Test',
            shortDescription: 'Intermediate JS concepts.',
            duration: 30,
            strictness: 'medium',
            questions: [
                {
                    id: 'q1',
                    type: 'Coding',
                    title: 'Fibonacci Sequence',
                    description: 'Return the nth Fibonacci number.',
                    codingConfig: { languageId: 'javascript', initialCode: 'function fib(n) {}' }
                },
                {
                    id: 'q2',
                    type: 'MCQ',
                    title: 'Closure',
                    description: 'What is a closure?',
                    mcqOptions: [{ id: 'a', text: 'Function with its lexical env' }, { id: 'b', text: 'A variable' }]
                }
            ]
        }
    });

    console.log('🔖 Seeding bookmarks & submissions...');
    await prisma.bookmark.create({
        data: {
            userId: student1.id,
            unitId: 'unit-html'
        }
    });

    await prisma.unitSubmission.create({
        data: {
            userId: student1.id,
            unitId: 'unit-html',
            status: 'COMPLETED',
            content: { viewed: true },
            score: 100
        }
    });

    await prisma.examSession.create({
        data: {
            userId: student1.id,
            examId: exam1.id,
            status: 'COMPLETED',
            score: 85,
            answers: { q1: 'correct code', q2: 'a' },
            startTime: new Date(Date.now() - 3600000),
            endTime: new Date()
        }
    });

    console.log('✅ Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
