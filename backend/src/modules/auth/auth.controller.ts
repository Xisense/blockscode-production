import { Controller, Request, Post, Patch, UseGuards, Body, Get, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './user.decorator';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
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

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async me(@Request() req: any) {
        return req.user;
    }

    @UseGuards(JwtAuthGuard)
    @Patch('profile')
    async updateProfile(@User() user: any, @Body() data: { name?: string }) {
        return this.authService.updateProfile(user.id, data);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('change-password')
    async changePassword(@User() user: any, @Body() data: { currentPass: string; newPass: string }) {
        return this.authService.changePassword(user.id, data);
    }
}
