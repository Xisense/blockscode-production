import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { ExamModule } from '../exam/exam.module';

@Module({
  imports: [PrismaModule, ExamModule],
  controllers: [StudentController],
  providers: [StudentService]
})
export class StudentModule { }
