import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../services/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        @InjectRedis() private readonly redis: Redis
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prisma.user.findUnique({ where: { email } });

        // In a real app, use bcrypt.compare
        // For now, assuming user might be created manually or via seed
        if (user && (await bcrypt.compare(pass, user.password))) {
            if (!user.isActive) {
                throw new UnauthorizedException('ACCOUNT_SUSPENDED');
            }
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
            mustChangePassword: user.mustChangePassword
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
                otp_enabled: false
            }
        };
    }

    async register(data: any) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
                mustChangePassword: false
            }
        });
    }

    async examLogin(email: string, testCode: string, password?: string) {
        const exam = await this.prisma.exam.findFirst({
            where: { testCode }
        });
        if (!exam) throw new UnauthorizedException('Invalid test code');

        const user = await this.prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            throw new UnauthorizedException('User record not found');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('ACCOUNT_SUSPENDED');
        }

        // ROLE RESTRICTION: Students & Admins only
        if (user.role === 'TEACHER' || (user.role !== 'STUDENT' && user.role !== 'ADMIN')) {
            throw new UnauthorizedException('Access denied. Valid student credentials required.');
        }

        // CHECK IF ALREADY SUBMITTED
        const existingSession = await this.prisma.examSession.findUnique({
            where: { userId_examId: { userId: user.id, examId: exam.id } }
        });

        if (existingSession && existingSession.status === 'COMPLETED') {
            throw new ConflictException('EXAM_ALREADY_SUBMITTED');
        }

        // Check for active presence in Redis - INFORMATIVE ONLY (Takeover will happen in Gateway)
        const isOnline = await this.redis.get(`exam:${exam.id}:student:${user.id}:online`);
        // if (isOnline) {
        //     throw new ConflictException('EXAM_ALREADY_ACTIVE');
        // }

        if (password && !(await bcrypt.compare(password, user.password))) {
            throw new UnauthorizedException('Invalid password');
        }

        const result = await this.login(user);
        return {
            ...result,
            exam: {
                id: exam.id,
                slug: exam.slug,
                title: exam.title
            }
        };
    }

    async updateProfile(userId: string, data: { name?: string }) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                rollNumber: true
            }
        });
    }

    async changePassword(userId: string, data: { currentPass: string; newPass: string }) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('User not found');

        const isMatch = await bcrypt.compare(data.currentPass, user.password);
        if (!isMatch) throw new UnauthorizedException('INVALID_CURRENT_PASSWORD');

        const hashedPassword = await bcrypt.hash(data.newPass, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });

        return { success: true, message: 'Password updated successfully' };
    }
}
