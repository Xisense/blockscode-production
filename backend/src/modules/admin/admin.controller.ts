import { Controller, Get, UseGuards, Delete, Param, Patch, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrgFeaturesGuard } from '../auth/guards/org-features.guard';
import { OrgStatusGuard } from '../auth/guards/org-status.guard';
import { RequireOrgFeature } from '../auth/org-feature.decorator';
import { Roles } from '../auth/roles.decorator';
import { User } from '../auth/user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, OrgStatusGuard)
@Roles('ADMIN')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('stats')
    async getStats(@User() user: any) {
        return this.adminService.getGlobalStats(user);
    }

    @Get('users')
    async getUsers(@User() user: any) {
        return this.adminService.getUsers(user);
    }

    @Post('users')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canManageUsers')
    async createUser(@User() user: any, @Body() data: any) {
        return this.adminService.createUser(data, user);
    }

    @Post('users/bulk')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canManageUsers')
    async createUsersBulk(@User() user: any, @Body() data: { users: any[] }) {
        return this.adminService.createUsersBulk(data.users, user);
    }

    @Get('logs')
    async getLogs(@User() user: any) {
        return this.adminService.getSystemLogs(user);
    }

    @Get('analytics')
    async getAnalytics(@User() user: any) {
        return this.adminService.getAnalytics(user);
    }

    @Get('exams')
    async getExams(@User() user: any) {
        return this.adminService.getExams(user);
    }

    @Get('courses')
    async getCourses(@User() user: any) {
        return this.adminService.getCourses(user);
    }

    @Patch('users/:id/status')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canManageUsers')
    async toggleUserStatus(@Param('id') id: string) {
        return this.adminService.toggleUserStatus(id);
    }

    @Delete('users/:id')
    @UseGuards(OrgFeaturesGuard)
    @RequireOrgFeature('canManageUsers')
    async deleteUser(@Param('id') id: string) {
        console.log('[AdminController] Deleting user:', id);
        return this.adminService.deleteUser(id);
    }
}
