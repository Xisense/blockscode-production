import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../../services/prisma/prisma.module';
import { MailService } from '../../services/mail.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, MailService]
})
export class AdminModule { }

