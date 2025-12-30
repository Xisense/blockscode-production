import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringGateway } from './monitoring.gateway';

import { SubmissionModule } from '../submission/submission.module';

@Module({
  imports: [SubmissionModule],
  controllers: [MonitoringController],
  providers: [MonitoringGateway],
  exports: [MonitoringGateway],
})
export class MonitoringModule { }
