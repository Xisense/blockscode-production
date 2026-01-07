import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { ExamModule } from '../exam/exam.module';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [PrismaModule, MonitoringModule, ExamModule, CourseModule],
  controllers: [TeacherController],
  providers: [TeacherService]
})
export class TeacherModule { }
