import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../services/prisma/prisma.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Controller('organization')
export class OrganizationController {
    constructor(
        private prisma: PrismaService,
        @InjectRedis() private readonly redis: Redis
    ) { }

    @Get('public')
    async getPublicOrg(@Query('domain') domain: string) {
        if (!domain) throw new NotFoundException('Domain required');

        // CACHE
        const cacheKey = `org:public:${domain.toLowerCase()}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const org = await this.prisma.organization.findFirst({
            where: {
                OR: [
                    { domain: domain }, // Exact match
                    { domain: { equals: domain, mode: 'insensitive' } } // Case insensitive
                ]
            },
            select: {
                name: true,
                logo: true,
                primaryColor: true,
                domain: true
            }
        });

        if (!org) {
            // Check if it matches "subdomain.blockscode.me" logic if stored differently
            // But currently we store the full domain or subdomain? 
            // CreateOrganizationView stores: `${formData.subdomain}.blockscode.me`
            // So if input is 'acme', we search 'acme.blockscode.me'?
            // The Frontend sends `parts[0]` which is 'acme'.
            // So we should search for `domain` STARTS WITH or EQUALS `${domain}.blockscode.me`

            const orgBySub = await this.prisma.organization.findFirst({
                where: {
                    domain: {
                        startsWith: domain + '.',
                        mode: 'insensitive'
                    }
                },
                select: {
                    name: true,
                    logo: true,
                    primaryColor: true,
                    domain: true
                }
            });

            if (!orgBySub) throw new NotFoundException('Organization not found');
            
            await this.redis.set(cacheKey, JSON.stringify(orgBySub), 'EX', 3600);
            return orgBySub;
        }

        await this.redis.set(cacheKey, JSON.stringify(org), 'EX', 3600);
        return org;
    }
}
