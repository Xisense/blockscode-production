import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { IExecutionStrategy } from './strategies/execution-strategy.interface';

@Processor('code-execution', {
    limiter: {
        max: 5,
        duration: 1000
    },
    // Optimize for serverless Redis (reduce command usage)
    stalledInterval: 300000, // 5 minutes
    maxStalledCount: 3,
    lockDuration: 60000, // 60s
})
export class CodeExecutionProcessor extends WorkerHost {
    private readonly logger = new Logger(CodeExecutionProcessor.name);

    constructor(
        @Inject('IExecutionStrategy')
        private readonly executionStrategy: IExecutionStrategy,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { language, code, stdin } = job.data;
        this.logger.debug(`Processing code execution job ${job.id} for language: ${language}`);
        
        try {
            const result = await this.executionStrategy.execute(language, code, stdin);
            return result;
        } catch (error: any) {
            this.logger.error(`Job ${job.id} failed: ${error.message}`);
            throw error;
        }
    }
}
