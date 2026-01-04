import { Module } from '@nestjs/common';
import { CodeExecutionController } from './code-execution.controller';
import { CodeExecutionService } from './code-execution.service';
import { PistonStrategy } from './strategies/piston.strategy';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from '../../services/prisma/prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { CodeExecutionProcessor } from './code-execution.processor';

@Module({
    imports: [
        HttpModule,
        BullModule.registerQueue({
            name: 'code-execution',
        }),
    ],
    controllers: [CodeExecutionController],
    providers: [
        CodeExecutionService,
        CodeExecutionProcessor,
        PistonStrategy,
        PrismaService,
        {
            provide: 'IExecutionStrategy', // Use string token for interface injection
            useClass: PistonStrategy,
        },
    ],
    exports: [CodeExecutionService],
})
export class CodeExecutionModule { }

