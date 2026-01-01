import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../services/prisma/prisma.service';

@Injectable()
export class OrgFeaturesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFeature = this.reflector.get<string>('orgFeature', context.getHandler());

        if (!requiredFeature) {
            return true; // No feature requirement
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.orgId) {
            throw new ForbiddenException('Organization context required');
        }

        // Fetch organization features
        const org = await this.prisma.organization.findUnique({
            where: { id: user.orgId },
            select: { features: true }
        });

        if (!org || !org.features) {
            // No features defined = allow all (backward compatibility)
            return true;
        }

        const features = org.features as any;
        const isFeatureEnabled = features[requiredFeature];

        if (isFeatureEnabled === false) {
            throw new ForbiddenException(
                `This feature (${requiredFeature}) is disabled for your organization. Contact your administrator.`
            );
        }

        return true;
    }
}
