import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException, Query } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgFeaturesGuard } from '../auth/guards/org-features.guard';
import { OrgStatusGuard } from '../auth/guards/org-status.guard';
import { RequireOrgFeature } from '../auth/org-feature.decorator';
import { User } from '../auth/user.decorator';

@Controller('teacher')
@UseGuards(JwtAuthGuard, OrgStatusGuard)
export class TeacherController {
    constructor(private readonly teacherService: TeacherService) { }

    @Get('stats')
    async getStats(@User() user: any) {
        return this.teacherService.getStats(user);
    }

    @Get('modules')
    async getMyModules(@User() user: any) {
        return this.teacherService.getMyModules(user);
    }

    @Get('submissions/recent')
    async getRecentSubmissions(@User() user: any) {
        return this.teacherService.getRecentSubmissions(user);
    }

    @Get('students')
    async getStudents(@User() user: any) {
        return this.teacherService.getStudents(user);
    }

    @Get('students/:studentId/analytics')
    async getStudentAnalytics(@Param('studentId') studentId: string, @User() user: any) {
        return this.teacherService.getStudentAnalytics(studentId, user);
    }

    @Get('students/:studentId/attempts')
    async getStudentAttempts(@Param('studentId') studentId: string, @User() user: any) {
        return this.teacherService.getStudentAttempts(studentId, user);
    }

    @Get('students/:studentId/unit-submissions')
    async getStudentUnitSubmissions(@Param('studentId') studentId: string, @User() user: any) {
        return this.teacherService.getStudentUnitSubmissions(studentId, user);
    }

    @Post('courses/:courseId/enroll/:studentId')
    async enrollStudent(
        @Param('courseId') courseId: string,
        @Param('studentId') studentId: string,
        @User() user: any
    ) {
        return this.teacherService.enrollStudent(courseId, studentId, user);
    }

    @Delete('courses/:courseId/enroll/:studentId')
    async unenrollStudent(
        @Param('courseId') courseId: string,
        @Param('studentId') studentId: string,
        @User() user: any
    ) {
        console.log('Unenroll request:', { courseId, studentId, userId: user.id });
        return this.teacherService.unenrollStudent(courseId, studentId, user);
    }

    @Post('courses/:courseId/enroll')
    async enrollByEmails(
        @Param('courseId') courseId: string,
        @Body() data: { emails: string[] },
        @User() user: any
    ) {
        return this.teacherService.enrollByEmails(courseId, data.emails, user);
    }

    @Get('exams/:examId/submissions/:identifier')
    async getSubmission(
        @Param('examId') examId: string,
        @Param('identifier') identifier: string,
        @User() user: any
    ) {
        return this.teacherService.getSubmission(examId, identifier, user);
    }

    @Get('courses')
    async getCourses(@User() user: any) {
        return this.teacherService.getCourses(user);
    }

    @Get('courses/:idOrSlug')
    async getCourse(@Param('idOrSlug') idOrSlug: string, @User() user: any) {
        return this.teacherService.getCourse(idOrSlug, user);
    }

    @Post('courses')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateCourses')
    async createCourse(@Body() data: any, @User() user: any) {
        return this.teacherService.createCourse(user, data);
    }

    @Put('courses/:id')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateCourses')
    async updateCourse(@Param('id') id: string, @Body() data: any, @User() user: any) {
        return this.teacherService.updateCourse(id, user, data);
    }

    @Delete('courses/:id')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateCourses')
    async deleteCourse(@Param('id') id: string, @User() user: any) {
        try {
            return await this.teacherService.deleteCourse(id, user);
        } catch (e) {
            console.error(`[TeacherController] Delete Course Failed:`, e);
            throw new BadRequestException(e.message || 'Failed to delete course');
        }
    }

    @Get('exams')
    async getExams(@User() user: any) {
        return this.teacherService.getExams(user);
    }

    @Get('exams/:idOrSlug')
    async getExam(@Param('idOrSlug') idOrSlug: string, @User() user: any) {
        return this.teacherService.getExam(idOrSlug, user);
    }

    @Post('exams')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateExams')
    async createExam(@Body() data: any, @User() user: any) {
        return this.teacherService.createExam(user, data);
    }

    @Put('exams/:id')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateExams')
    async updateExam(@Param('id') id: string, @Body() data: any, @User() user: any) {
        return this.teacherService.updateExam(id, user, data);
    }

    @Delete('exams/:id')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateExams')
    async deleteExam(@Param('id') id: string, @User() user: any) {
        try {
            return await this.teacherService.deleteExam(id, user);
        } catch (e) {
            console.error(`[TeacherController] Delete Exam Failed:`, e);
            throw new BadRequestException(e.message || 'Failed to delete exam');
        }
    }

    @Get('exams/:examId/monitor')
    async getMonitoredStudents(@Param('examId') examId: string, @User() user: any) {
        return this.teacherService.getMonitoredStudents(examId, user);
    }

    @Get('exams/:examId/results')
    async getExamResults(
        @Param('examId') examId: string,
        @User() user: any,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '50',
        @Query('search') search: string = ''
    ) {
        return this.teacherService.getExamResults(examId, user, Number(page), Number(limit), search);
    }

    @Put('exams/:examId/submissions/:sessionId/score')
    async updateSubmissionScore(
        @Param('sessionId') sessionId: string,
        @Body() data: { score: number, internalMarks?: Record<string, number> },
        @User() user: any
    ) {
        return this.teacherService.updateSubmissionScore(sessionId, data.score, user, data.internalMarks);
    }

    @Post('exams/:examId/publish')
    async publishResults(@Param('examId') examId: string, @User() user: any) {
        return this.teacherService.publishResults(examId, user);
    }

    @Get('exams/:examId/feedbacks')
    async getFeedbacks(@Param('examId') examId: string, @User() user: any) {
        return this.teacherService.getFeedbacks(examId, user);
    }

    @Post('exams/:examId/terminate/:userId')
    async terminateExamSession(
        @Param('examId') examId: string,
        @Param('userId') userId: string,
        @User() user: any
    ) {
        return this.teacherService.terminateExamSession(examId, userId, user);
    }

    @Post('exams/:examId/unterminate/:userId')
    async unterminateExamSession(
        @Param('examId') examId: string,
        @Param('userId') userId: string,
        @User() user: any
    ) {
        return this.teacherService.unterminateExamSession(examId, userId, user);
    }
}
