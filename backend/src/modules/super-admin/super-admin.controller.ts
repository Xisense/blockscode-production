import { Controller, Get, Post, Put, Delete, Body, UseGuards, Param } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
    constructor(private readonly superAdminService: SuperAdminService) { }

    @Get('stats')
    async getStats() {
        return this.superAdminService.getStats();
    }

    @Get('organizations')
    async getOrganizations() {
        return this.superAdminService.getOrganizations();
    }

    @Get('organizations/:id')
    async getOrganization(@Param('id') id: string) {
        return this.superAdminService.getOrganization(id);
    }

    @Post('organizations')
    async createOrganization(@Body() data: { name: string; domain?: string; logo?: string }) {
        return this.superAdminService.createOrganization(data);
    }

    @Put('organizations/:id')
    async updateOrganization(@Param('id') id: string, @Body() data: any) {
        return this.superAdminService.updateOrganization(id, data);
    }

    @Delete('organizations/:id')
    async deleteOrganization(@Param('id') id: string) {
        return this.superAdminService.deleteOrganization(id);
    }
}
