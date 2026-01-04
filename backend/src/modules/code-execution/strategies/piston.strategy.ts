import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { IExecutionStrategy, ExecutionResult } from './execution-strategy.interface';

@Injectable()
export class PistonStrategy implements IExecutionStrategy {
    private readonly pistonUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.pistonUrl = this.configService.get<string>('PISTON_API_URL') || 'https://emkc.org/api/v2/piston';
    }

    async execute(language: string, code: string, stdin: string = ''): Promise<ExecutionResult> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.pistonUrl}/execute`, {
                    language,
                    version: '*', // Use latest version available
                    files: [
                        {
                            content: code,
                        },
                    ],
                    stdin: stdin,
                }),
            );

            const run = response.data.run;
            return {
                stdout: run.stdout,
                stderr: run.stderr,
                output: run.output,
                code: run.code,
                signal: run.signal,
            };
        } catch (error: any) {
            const status = error.response?.status;
            const data = error.response?.data;
            console.error(`Piston Execution Error [${status}]:`, data || error.message);
            
            if (status === 429) {
                throw new InternalServerErrorException('Rate limit exceeded for code execution service. Please try again later.');
            }
            
            throw new InternalServerErrorException('Failed to execute code via Piston');
        }
    }
}
