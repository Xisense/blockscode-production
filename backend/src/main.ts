import './tracer';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({
            logger: true,
            bodyLimit: 50 * 1024 * 1024 // 50MB
        })
    );



    // Register plugin to allow Authorization header for CORS
    // @ts-ignore
    // Force reload
    await app.register(require('./fastify-cors-auth-header.plugin').default);

    // Register multipart support for file uploads
    await app.register(require('@fastify/multipart'), {
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB
        },
    });

    // Register cookie support
    await app.register(require('@fastify/cookie'), {
        secret: process.env.COOKIE_SECRET || 'my-super-secret-secret', 
        parseOptions: {} 
    });

    // Register compression for performance (gzip/brotli)
    await app.register(require('@fastify/compress'), { 
        global: true, 
        encodings: ['gzip', 'deflate'] 
    });

    // Set global API prefix
    app.setGlobalPrefix('api');

    // Enable CORS for Electron and Web clients
    app.enableCors({
        origin: '*', // Configure this strictly in production
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });

    // Global Validation Pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
    }));

    await app.listen(process.env.PORT ?? 4000, '0.0.0.0', (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Application is listening on ${address}`);

        // Initialize PeerServer
        if (process.env.ENABLE_LOCAL_PEER_SERVER === 'true') {
            // Using require to avoid potential type issues if @types/peer is missing
            const { PeerServer } = require('peer');
            const peerServer = PeerServer({ port: 9001, path: '/peer' });
            console.log('PeerServer running on port 9001, path /peer');
        }
    });
}
bootstrap();
