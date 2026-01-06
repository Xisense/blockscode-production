import { Controller, Get, Post, Body, Param, Req, UseGuards, Query, UnauthorizedException } from '@nestjs/common';
import { ExamService } from './exam.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('exam')
export class ExamController {
    constructor(private examService: ExamService) { }

    @Get('app-config')
    getAppConfig() {
        return this.examService.getAppConfig();
    }

    @Get(':slug')
    @UseGuards(JwtAuthGuard)
    async getExam(@Param('slug') slug: string, @Query('json') json: string, @User() user: any) {
        const exam = await this.examService.getExamBySlug(slug, user);
        if (json) {
            return exam;
        }
        return exam;
    }

    @Get(':slug/public-status')
    async getPublicStatus(@Param('slug') slug: string) {
        // This might arguably need to be public for "Check if exam exists" before login?
        // But if strict isolation, even existence is hidden.
        // For now, let's keep it open or check requirement. 
        // "users... cannot be accessed from another organization".
        // If I try to access org-a-exam as org-b-user, I shouldn't see it.
        // But pre-login, I am anonymous.
        // Let's assume metadata is public IF we have the link? 
        // Or requiring login first.
        return this.examService.getPublicStatus(slug);
    }

    // Protected Routes
    @UseGuards(JwtAuthGuard)
    @Post(':slug/start')
    async startExam(
        @Param('slug') slug: string,
        @Body() body: { deviceId: string; userId?: string; tabId?: string; metadata?: any },
        @User() user: any,
        @Req() req: any
    ) {
        if (!user) {
            throw new UnauthorizedException('User ID required');
        }

        // OPTIMIZATION: Use lightweight ID lookup instead of full transform
        const examId = await this.examService.getExamIdBySlug(slug, user);
        const ip = req.ip;

        // Pass userId, deviceId, tabId, and metadata to startSession
        return this.examService.startSession(user.id, examId, ip, body.deviceId, body.tabId, body.metadata);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('TEACHER', 'ADMIN', 'SUPER_ADMIN')
    async createExam(@Body() body: any) {
        return this.examService.createExam(body);
    }

    @Get(':examId/monitoring')
    @UseGuards(JwtAuthGuard)
    async getMonitoredStudents(@Param('examId') examId: string) {
        return this.examService.getMonitoredStudents(examId);
    }

    @Get(':examId/feedbacks')
    @UseGuards(JwtAuthGuard)
    async getFeedbacks(@Param('examId') examId: string) {
        const feedbacks = await this.examService.getFeedbacks(examId);
        return feedbacks.map((f: any) => ({
            id: f.id,
            userName: f.user.name || 'Anonymous',
            userEmail: f.user.email,
            rating: f.rating,
            comment: f.comment,
            time: f.timestamp.toLocaleTimeString(),
            isSeen: false // Default
        }));
    }

    @Post(':slug/feedback')
    @UseGuards(JwtAuthGuard)
    async saveFeedback(
        @Param('slug') slug: string,
        @Body() body: { rating: number; comment: string },
        @User() user: any
    ) {
        const userId = user.id;
        const exam = await this.examService.getExamBySlug(slug);
        return this.examService.saveFeedback(userId, exam.id, body.rating, body.comment);
    }
}
