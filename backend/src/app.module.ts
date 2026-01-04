import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './services/prisma/prisma.module';
import { ExamModule } from './modules/exam/exam.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StudentModule } from './modules/student/student.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { AdminModule } from './modules/admin/admin.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { CourseModule } from './modules/course/course.module';

import { CodeExecutionModule } from './modules/code-execution/code-execution.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: `redis://${config.get('REDIS_HOST') || 'localhost'}:${config.get('REDIS_PORT') || 6379}`,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    PrismaModule,
    ExamModule,
    MonitoringModule,
    SubmissionModule,
    TeacherModule,
    AdminModule,
    SuperAdminModule,
    CourseModule,
    StudentModule,
    OrganizationModule,
    CodeExecutionModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
