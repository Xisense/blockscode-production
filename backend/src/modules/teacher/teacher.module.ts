import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { ExamModule } from '../exam/exam.module';

@Module({
  imports: [PrismaModule, MonitoringModule, ExamModule],
  controllers: [TeacherController],
  providers: [TeacherService]
})
export class TeacherModule { }
