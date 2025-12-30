import { Controller, Get, Param, UseGuards, UnauthorizedException } from '@nestjs/common';
import { CourseService } from './course.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/user.decorator';

@Controller('course')
@UseGuards(JwtAuthGuard)
export class CourseController {
    constructor(private readonly courseService: CourseService) { }

    @Get(':slug')
    async getCourse(@Param('slug') slug: string, @User() user: any) {
        return this.courseService.getCourse(slug, user);
    }

    @Get('unit/:id')
    async getUnit(@Param('id') id: string, @User() user: any) {
        return this.courseService.getUnit(id, user);
    }
}
