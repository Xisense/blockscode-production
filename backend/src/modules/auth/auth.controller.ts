import { Controller, Request, Post, Patch, UseGuards, Body, Get, UnauthorizedException, Req, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './user.decorator';
import type { FastifyRequest } from 'fastify';
import { StorageService } from '../../services/storage/storage.service';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private storageService: StorageService
    ) { }

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async login(@Body() req: any) {
        // Manually validating for simplicity if LocalGuard isn't set up yet
        const user = await this.authService.validateUser(req.email, req.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('register')
    async register(@Body() createUserDto: any) {
        return this.authService.register(createUserDto);
    }

    @Post('exam-login')
    async examLogin(@Body() data: { email: string; testCode: string; password?: string }) {
        return this.authService.examLogin(data.email, data.testCode, data.password);
    }

    @Post('forgot-password')
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    async forgotPassword(@Body() data: { email: string }) {
        return this.authService.forgotPassword(data.email);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async me(@Request() req: any) {
        return req.user;
    }

    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    async updateProfile(@User() user: any, @Req() req: FastifyRequest) {
        const data: { name?: string; profilePicture?: string } = {};
        const multipartReq = req as any;

        if (multipartReq.isMultipart()) {
            const parts = multipartReq.parts();
            for await (const part of parts) {
                if (part.type === 'file') {
                    // Upload to 'profilepic' bucket
                    const url = await this.storageService.uploadFile(part, 'avatars', 'profilepic');
                    data.profilePicture = url;
                } else {
                    if (part.fieldname === 'name') {
                        // part.value is available for fields in @fastify/multipart?
                        // Actually for fields, part is not the same object.
                        // Wait, req.parts() yields parts.
                        // If it's a field, it has value.
                        // But @fastify/multipart documentation says:
                        // for await (const part of req.parts()) {
                        //   if (part.type === 'file') { ... } else { // part.type === 'field'
                        //     console.log(part.fieldname, part.value)
                        //   }
                        // }
                        data.name = (part as any).value as string;
                    }
                }
            }
        } else {
            const body = req.body as { name?: string };
            if (body?.name) data.name = body.name;
        }

        return this.authService.updateProfile(user.id, data);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('change-password')
    async changePassword(@User() user: any, @Body() data: { currentPass: string; newPass: string }) {
        return this.authService.changePassword(user.id, data);
    }
}
