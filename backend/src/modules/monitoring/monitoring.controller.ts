import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { MonitoringGateway } from './monitoring.gateway';

@Controller('exam/monitoring')
export class MonitoringController {
    constructor(private gateway: MonitoringGateway) { }

    @Post('log-event')
    logEvent(@Body() body: any) {
        // In real implementation, save to Redis stream
        console.log('Event Logged:', body);
        return { status: 'logged' };
    }

    @Post('log-violation')
    logViolation(@Body() body: any) {
        // Save to DB associated with session
        console.log('Violation:', body);

        // Notify teacher immediately via WebSocket
        this.gateway.server
            .to(`exam_${body.examId}_monitor`)
            .emit('live_violation', body);

        return { status: 'recorded' };
    }

    @Post('heartbeat')
    heartbeat(@Body() body: any) {
        // Just return success for liveness check
        return { status: 'alive', timestamp: new Date() };
    }
}
