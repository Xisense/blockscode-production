import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
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
        return this.teacherService.getStats(user.id);
    }

    @Get('modules')
    async getMyModules(@User() user: any) {
        return this.teacherService.getMyModules(user.id);
    }

    @Get('submissions/recent')
    async getRecentSubmissions(@User() user: any) {
        return this.teacherService.getRecentSubmissions(user.id);
    }

    @Get('students')
    async getStudents(@User() user: any) {
        return this.teacherService.getStudents(user.id);
    }

    @Get('students/:studentId/analytics')
    async getStudentAnalytics(@Param('studentId') studentId: string, @User() user: any) {
        return this.teacherService.getStudentAnalytics(studentId, user.id);
    }

    @Get('students/:studentId/attempts')
    async getStudentAttempts(@Param('studentId') studentId: string, @User() user: any) {
        return this.teacherService.getStudentAttempts(studentId, user.id);
    }

    @Get('students/:studentId/unit-submissions')
    async getStudentUnitSubmissions(@Param('studentId') studentId: string, @User() user: any) {
        return this.teacherService.getStudentUnitSubmissions(studentId, user.id);
    }

    @Post('courses/:courseId/enroll/:studentId')
    async enrollStudent(
        @Param('courseId') courseId: string,
        @Param('studentId') studentId: string
    ) {
        return this.teacherService.enrollStudent(courseId, studentId);
    }

    @Post('courses/:courseId/enroll')
    async enrollByEmails(
        @Param('courseId') courseId: string,
        @Body() data: { emails: string[] }
    ) {
        return this.teacherService.enrollByEmails(courseId, data.emails);
    }

    @Get('exams/:examId/submissions/:identifier')
    async getSubmission(
        @Param('examId') examId: string,
        @Param('identifier') identifier: string,
        @User() user: any
    ) {
        return this.teacherService.getSubmission(examId, identifier, user.id);
    }

    @Get('courses')
    async getCourses(@User() user: any) {
        return this.teacherService.getCourses(user.id);
    }

    @Get('courses/:idOrSlug')
    async getCourse(@Param('idOrSlug') idOrSlug: string, @User() user: any) {
        return this.teacherService.getCourse(idOrSlug, user.id);
    }

    @Post('courses')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateCourses')
    async createCourse(@Body() data: any, @User() user: any) {
        return this.teacherService.createCourse(user.id, data, user.orgId);
    }

    @Put('courses/:id')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateCourses')
    async updateCourse(@Param('id') id: string, @Body() data: any, @User() user: any) {
        return this.teacherService.updateCourse(id, user.id, data);
    }

    @Delete('courses/:id')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateCourses')
    async deleteCourse(@Param('id') id: string, @User() user: any) {
        try {
            return await this.teacherService.deleteCourse(id, user.id);
        } catch (e) {
            console.error(`[TeacherController] Delete Course Failed:`, e);
            throw new BadRequestException(e.message || 'Failed to delete course');
        }
    }

    @Get('exams')
    async getExams(@User() user: any) {
        return this.teacherService.getExams(user.id);
    }

    @Get('exams/:idOrSlug')
    async getExam(@Param('idOrSlug') idOrSlug: string, @User() user: any) {
        return this.teacherService.getExam(idOrSlug, user.id);
    }

    @Post('exams')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateExams')
    async createExam(@Body() data: any, @User() user: any) {
        return this.teacherService.createExam(user.id, data, user.orgId);
    }

    @Put('exams/:id')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateExams')
    async updateExam(@Param('id') id: string, @Body() data: any, @User() user: any) {
        return this.teacherService.updateExam(id, user.id, data);
    }

    @Delete('exams/:id')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canCreateExams')
    async deleteExam(@Param('id') id: string, @User() user: any) {
        try {
            return await this.teacherService.deleteExam(id, user.id);
        } catch (e) {
            console.error(`[TeacherController] Delete Exam Failed:`, e);
            throw new BadRequestException(e.message || 'Failed to delete exam');
        }
    }

    @Get('exams/:examId/monitor')
    async getMonitoredStudents(@Param('examId') examId: string, @User() user: any) {
        return this.teacherService.getMonitoredStudents(examId, user.id);
    }

    @Get('exams/:examId/results')
    async getExamResults(@Param('examId') examId: string, @User() user: any) {
        return this.teacherService.getExamResults(examId, user.id);
    }

    @Put('exams/:examId/submissions/:sessionId/score')
    async updateSubmissionScore(
        @Param('sessionId') sessionId: string,
        @Body() data: { score: number },
        @User() user: any
    ) {
        return this.teacherService.updateSubmissionScore(sessionId, data.score, user.id);
    }

    @Post('exams/:examId/publish')
    async publishResults(@Param('examId') examId: string, @User() user: any) {
        return this.teacherService.publishResults(examId, user.id);
    }

    @Get('exams/:examId/feedbacks')
    async getFeedbacks(@Param('examId') examId: string, @User() user: any) {
        return this.teacherService.getFeedbacks(examId, user.id);
    }

    @Post('exams/:examId/terminate/:userId')
    async terminateExamSession(
        @Param('examId') examId: string,
        @Param('userId') userId: string,
        @User() user: any
    ) {
        return this.teacherService.terminateExamSession(examId, userId, user.id);
    }

    @Post('exams/:examId/unterminate/:userId')
    async unterminateExamSession(
        @Param('examId') examId: string,
        @Param('userId') userId: string,
        @User() user: any
    ) {
        return this.teacherService.unterminateExamSession(examId, userId, user.id);
    }
}
