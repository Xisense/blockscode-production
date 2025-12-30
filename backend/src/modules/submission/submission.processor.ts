import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../services/prisma/prisma.service';

@Processor('submission_queue')
export class SubmissionProcessor extends WorkerHost {
    constructor(private prisma: PrismaService) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        switch (job.name) {
            case 'save_answer':
                return this.handleSaveAnswer(job);
            case 'auto_submit':
                return this.handleAutoSubmit(job);
        }
    }

    private async handleSaveAnswer(job: Job) {
        const { sessionId, answer } = job.data;
        // console.log(`[SubmissionProcessor] Saving answer for session ${sessionId}:`, JSON.stringify(answer));

        try {
            // Atomic update using PostgreSQL JSONB merge operator (||)
            // This prevents race conditions where simultaneous updates overwrite each other.
            await this.prisma.$executeRawUnsafe(
                `UPDATE "ExamSession" 
                 SET "answers" = COALESCE("answers", '{}'::jsonb) || $1::jsonb,
                     "updatedAt" = NOW()
                 WHERE "id" = $2`,
                JSON.stringify(answer),
                sessionId
            );
            // console.log(`[SubmissionProcessor] Atomic update completed for ${sessionId}`);
        } catch (error) {
            console.error('[SubmissionProcessor] Failed to save answer:', error);
            throw error; // Retry job
        }
    }

    private async handleAutoSubmit(job: Job) {
        const { sessionId } = job.data;
        console.log(`Auto-submitting session: ${sessionId}`);
        await this.prisma.examSession.update({
            where: { id: sessionId },
            data: { status: 'COMPLETED', endTime: new Date() }
        });
    }
}
