import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IExecutionStrategy } from './strategies/execution-strategy.interface';
import { PrismaService } from '../../services/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';

@Injectable()
export class CodeExecutionService {
    private queueEvents: QueueEvents;

    constructor(
        @Inject('IExecutionStrategy')
        private readonly executionStrategy: IExecutionStrategy,
        private readonly prisma: PrismaService,
        @InjectQueue('code-execution') private executionQueue: Queue,
    ) {
        // Initialize QueueEvents to listen for job completion
        // Note: In a production environment with multiple instances, 
        // you might want to handle this differently or ensure connection reuse.
        // For this setup, we'll create a new connection.
        // We need to know the connection details. 
        // Ideally, we should inject the connection or config, but QueueEvents 
        // usually needs a connection object or connection options.
        // Since we are using @nestjs/bullmq, the connection is managed.
        // We can try to reuse the connection from the queue if possible, 
        // or just let it use default redis options if they match.
        
        // However, to keep it simple and robust with the existing RedisModule setup in AppModule:
        this.queueEvents = new QueueEvents('code-execution', {
            connection: executionQueue.opts.connection
        });
    }

    async runCode(language: string, code: string, stdin: string) {
        // Add job to queue
        const job = await this.executionQueue.add('execute', {
            language,
            code,
            stdin
        });

        // Wait for the job to finish and return the result
        try {
            const result = await job.waitUntilFinished(this.queueEvents);
            return result;
        } catch (error) {
            throw error;
        }
    }

    async submitCode(unitId: string, language: string, code: string, examId?: string) {
        let testCases: any[] = [];

        if (examId) {
            // Handle Exam Question
            const exam = await this.prisma.exam.findFirst({
                where: {
                    OR: [
                        { id: examId },
                        { slug: examId }
                    ]
                }
            });

            if (!exam) {
                throw new NotFoundException('Exam not found');
            }

            // Find question in exam.questions
            const questionsData: any = exam.questions;
            let foundQuestion: any = null;

            // Helper to find question in sections or flat list
            if (Array.isArray(questionsData)) {
                // Check if it's sections or flat
                if (questionsData.length > 0 && questionsData[0].questions) {
                    // Sections
                    for (const section of questionsData) {
                        const q = section.questions?.find((q: any) => q.id === unitId);
                        if (q) {
                            foundQuestion = q;
                            break;
                        }
                    }
                } else {
                    // Flat
                    foundQuestion = questionsData.find((q: any) => q.id === unitId);
                }
            } else if (questionsData?.sections) {
                for (const section of questionsData.sections) {
                    const q = section.questions?.find((q: any) => q.id === unitId);
                    if (q) {
                        foundQuestion = q;
                        break;
                    }
                }
            } else if (typeof questionsData === 'object' && questionsData !== null) {
                // Handle object structure like { "sec-1": { questions: [] } }
                const sections = Object.values(questionsData);
                for (const section of sections as any[]) {
                    if (section && typeof section === 'object' && section.questions && Array.isArray(section.questions)) {
                        const q = section.questions.find((q: any) => q.id === unitId);
                        if (q) {
                            foundQuestion = q;
                            break;
                        }
                    }
                }
            }

            if (!foundQuestion) {
                console.log(`Question not found. ExamId: ${examId}, UnitId: ${unitId}`);
                console.log('Questions Data keys:', Object.keys(questionsData || {}));
                throw new NotFoundException('Question not found in exam');
            }

            // Check for testCases in root OR in codingConfig (to match Unit behavior)
            testCases = foundQuestion.testCases || foundQuestion.codingConfig?.testCases || [];

        } else {
            // 1. Fetch the unit and its test cases
            const unit = await this.prisma.unit.findUnique({
                where: { id: unitId },
            });

            if (!unit) {
                throw new NotFoundException('Unit not found');
            }

            // Assuming unit.content follows a structure suitable for coding problems
            // generic casting, in a real app we'd want strict DTOs/Validation
            const content: any = unit.content;
            // Check for testCases in content root OR in codingConfig (if structure differs)
            testCases = content.testCases || content.codingConfig?.testCases || [];
        }

        if (!testCases.length) {
            // Should we error or just return passed?
            // Let's assume passed but with warning or empty result
            return {
                status: 'Accepted',
                passedTests: 0,
                totalTests: 0,
                results: []
            };
        }

        // 2. Execute against each test case
        // Use sequential execution to avoid rate limiting on public API
        const results = [];
        for (const testCase of testCases) {
            const input = testCase.input || '';
            const expectedOutput = (testCase.expectedOutput || testCase.output || '').trim();
            const isPublic = testCase.isPublic !== false; // Default to true if undefined, unless explicitly false

            try {
                // Use the queue-backed runCode method to respect rate limits
                const executionResult = await this.runCode(language, code, input);

                // Clean undefined or null outputs
                const actualOutput = (executionResult.stdout || '').trim();

                const errorOutput = (executionResult.stderr || '').trim();

                // Pass only if actual matches expected AND there are no errors
                const hasError = errorOutput.length > 0 || (executionResult.code !== 0 && executionResult.code !== null);
                const passed = !hasError && actualOutput === expectedOutput;

                results.push({
                    input: isPublic ? input : null,
                    expectedOutput: isPublic ? expectedOutput : null,
                    actualOutput: isPublic ? actualOutput : null,
                    passed: passed,
                    status: passed ? 'Passed' : 'Failed',
                    isPublic: isPublic,
                    error: isPublic ? (errorOutput || null) : null
                });
            } catch (err: any) {
                console.error(`Test case execution failed: ${err.message}`);
                results.push({
                    input: isPublic ? input : null,
                    expectedOutput: isPublic ? expectedOutput : null,
                    actualOutput: null,
                    passed: false,
                    status: 'Error',
                    isPublic: isPublic,
                    error: 'Execution failed: ' + (err.message || 'Unknown error')
                });
            }
        }

        const passedCount = results.filter(r => r.passed).length;

        // 3. Determine final status
        const allPassed = passedCount === testCases.length;

        return {
            status: allPassed ? 'Accepted' : 'Wrong Answer',
            passedTests: passedCount,
            totalTests: testCases.length,
            results: results,
        };
    }
}
