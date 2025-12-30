import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SubmissionService {
    constructor(@InjectQueue('submission_queue') private submissionQueue: Queue) { }

    async queueAnswer(sessionId: string, answer: any) {
        // Add to write-behind queue
        await this.submissionQueue.add('save_answer', {
            sessionId,
            answer, // This can be a single answer or a map of answers
            timestamp: new Date(),
        });
    }

    async scheduleAutoSubmit(sessionId: string, delay: number) {
        await this.submissionQueue.add('auto_submit', { sessionId }, { delay });
    }
}
