import { Controller, Get, Post, Body, Param, Req, UseGuards, Query, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
        // console.log('[ExamController] getPublicStatus slug:', slug);
        return this.examService.getPublicStatus(slug);
    }

    @Get(':slug/check')
    async checkExam(@Param('slug') slug: string, @Query('json') json: string) {
        // Require ?json=1 parameter
        if (!json) {
            return { error: 'json=1 parameter required' };
        }
        return this.examService.checkExamStatus(slug);
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
        const lookup: any = await this.examService.getExamIdBySlug(slug, user);
        console.log(`[ExamController] Lookup for slug ${slug}:`, lookup);

        if (!lookup || lookup.type !== 'exam') {
             // If it's a test/course, we might need a different handling strategy.
             // For now, fail gracefully rather than crashing with FK error.
             throw new BadRequestException('Assessment type does not support live sessions');
        }

        const ip = req.ip;

        // Pass userId, deviceId, tabId, and metadata to startSession
        return this.examService.startSession(user.id, lookup.id, ip, body.deviceId, body.tabId, body.metadata);
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
