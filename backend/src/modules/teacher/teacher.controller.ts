import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/user.decorator';

@Controller('teacher')
@UseGuards(JwtAuthGuard)
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
    async createCourse(@Body() data: any, @User() user: any) {
        return this.teacherService.createCourse(user.id, data, user.orgId);
    }

    @Put('courses/:id')
    async updateCourse(@Param('id') id: string, @Body() data: any, @User() user: any) {
        return this.teacherService.updateCourse(id, user.id, data);
    }
 
    @Delete('courses/:id')
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
    async createExam(@Body() data: any, @User() user: any) {
        return this.teacherService.createExam(user.id, data, user.orgId);
    }

    @Put('exams/:id')
    async updateExam(@Param('id') id: string, @Body() data: any, @User() user: any) {
        return this.teacherService.updateExam(id, user.id, data);
    }
 
    @Delete('exams/:id')
    async deleteExam(@Param('id') id: string, @User() user: any) {
        try {
            return await this.teacherService.deleteExam(id, user.id);
        } catch (e) {
            console.error(`[TeacherController] Delete Exam Failed:`, e);
            throw new BadRequestException(e.message || 'Failed to delete exam');
        }
    }
}
