import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { StorageModule } from '../../services/storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService]
})
export class SuperAdminModule { }
