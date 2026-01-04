import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../services/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private prisma: PrismaService
    ) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is not defined');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: any) {
        // Real-time check if user is still active
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                isActive: true,
                orgId: true,
                mustChangePassword: true,
                organization: {
                    select: {
                        features: true
                    }
                }
            }
        });

        if (!user || user.isActive === false) {
            throw new UnauthorizedException('ACCOUNT_SUSPENDED');
        }

        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            orgId: user.orgId,
            features: user.organization?.features || {},
            mustChangePassword: user.mustChangePassword
        };
    }
}
