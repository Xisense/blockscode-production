import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { PrismaService } from '../../services/prisma/prisma.service';

@Module({
    controllers: [OrganizationController],
    providers: [PrismaService],
    exports: []
})
export class OrganizationModule { }
