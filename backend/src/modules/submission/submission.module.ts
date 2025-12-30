import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SubmissionService } from './submission.service';
import { SubmissionProcessor } from './submission.processor';
import { SubmissionController } from './submission.controller';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        PrismaModule,
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => ({
                connection: {
                    host: config.get('REDIS_HOST') || 'localhost',
                    port: config.get('REDIS_PORT') || 6379,
                },
            }),
            inject: [ConfigService],
        }),
        BullModule.registerQueue({
            name: 'submission_queue',
        }),
    ],
    controllers: [SubmissionController],
    providers: [SubmissionService, SubmissionProcessor],
    exports: [SubmissionService],
})
export class SubmissionModule { }
