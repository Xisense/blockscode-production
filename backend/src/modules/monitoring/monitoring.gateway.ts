import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { SubmissionService } from '../submission/submission.service';
import { PrismaService } from '../../services/prisma/prisma.service';

@WebSocketGateway({
    namespace: 'proctoring',
    cors: { origin: '*' }, // Allow Electron app
})
export class MonitoringGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        @InjectRedis() private readonly redis: Redis,
        private readonly submissionService: SubmissionService,
        private readonly prisma: PrismaService
    ) { }

    @WebSocketServer()
    server: Server;

    private activeConnections = new Map<string, string>(); // socketId -> userId (Secondary tracking)

    afterInit(server: Server) {
        console.log('Proctoring Gateway initialized');
    }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    async handleDisconnect(client: Socket) {
        this.activeConnections.delete(client.id);
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_exam')
    async handleJoinExam(
        @MessageBody() data: { examId: string; userId: string; role: string; deviceId?: string; tabId?: string },
        @ConnectedSocket() client: Socket,
    ) {
        if (!data.examId || !data.userId) return { status: 'error' };

        const examRoom = `exam_${data.examId}`;
        client.join(examRoom);

        if (data.role === 'teacher') {
            client.join(`${examRoom}_monitor`);
            console.log(`[JoinExam] Teacher ${data.userId} joined monitor`);
        } else {
            // Student logic - Takeover (Kick Out) Model
            const studentRoom = `student_${data.userId}_exam_${data.examId}`;

            // 1. SURGICAL KICK: Disconnect only OTHER sockets in this student's room
            const peers = await this.server.in(studentRoom).fetchSockets();

            for (const s of peers) {
                if (s.id !== client.id) {
                    console.log(`[JoinExam] Surgical kick for old socket ${s.id} (user ${data.userId})`);
                    s.emit('error', {
                        message: 'Another instance of this exam is active. This session is now inactive.'
                    });
                    s.disconnect(true);
                }
            }

            // JOIN the room for future displacement
            client.join(studentRoom);
            this.activeConnections.set(client.id, data.userId);

            // 2. SET Redis ownership IMMEDIATELY
            const identity = {
                deviceId: data.deviceId,
                tabId: data.tabId,
                socketId: client.id,
                joinedAt: Date.now()
            };

            await this.redis.set(
                `exam:${data.examId}:student:${data.userId}:online`,
                JSON.stringify(identity),
                'EX',
                120
            );

            // Notify teachers
            this.server.to(`${examRoom}_monitor`).emit('student_status', {
                userId: data.userId,
                online: true
            });
        }
        return { status: 'joined' };
    }

    @SubscribeMessage('save_answer')
    async handleSaveAnswer(
        @MessageBody() data: { sessionId: string; answer: any },
        @ConnectedSocket() client: Socket,
    ) {
        await this.submissionService.queueAnswer(data.sessionId, data.answer);
        return { status: 'saved' };
    }

    @SubscribeMessage('log_violation')
    async handleLogViolation(
        @MessageBody() data: {
            sessionId: string;
            examId: string;
            userId: string;
            type: string;
            message: string;
            details?: any;
        },
        @ConnectedSocket() client: Socket,
    ) {
        const examSession = await this.prisma.examSession.findUnique({
            where: { id: data.sessionId },
            include: {
                violations: {
                    where: { type: { in: ['TAB_SWITCH', 'TAB_SWITCH_OUT', 'TAB_SWITCH_IN'] } }
                }
            }
        });

        // 1. BLOCK violations if session is already completed or terminated
        if (!examSession || examSession.status === 'COMPLETED' || examSession.status === 'TERMINATED') {
            return { status: 'rejected', reason: 'Session inactive' };
        }

        // Save to DB
        await this.prisma.violation.create({
            data: {
                sessionId: data.sessionId,
                type: data.type,
                message: data.message,
                severity: 'WARNING',
                timestamp: new Date()
            }
        });

        let tabSwitchOutCount = examSession.violations.filter((v: any) => v.type === 'TAB_SWITCH' || v.type === 'TAB_SWITCH_OUT').length;
        let tabSwitchInCount = examSession.violations.filter((v: any) => v.type === 'TAB_SWITCH_IN').length;

        // Since we just created a new one, increment the relevant count
        if (data.type === 'TAB_SWITCH' || data.type === 'TAB_SWITCH_OUT') tabSwitchOutCount++;
        if (data.type === 'TAB_SWITCH_IN') tabSwitchInCount++;

        this.server
            .to(`exam_${data.examId}_monitor`)
            .emit('live_violation', {
                userId: data.userId,
                type: data.type,
                message: data.message,
                details: data.details,
                tabSwitchOutCount,
                tabSwitchInCount,
                timestamp: new Date()
            });

        return { status: 'recorded' };
    }

    @SubscribeMessage('heartbeat')
    async handleHeartbeat(@MessageBody() data: { examId: string; userId: string; deviceId?: string; tabId?: string }, @ConnectedSocket() client: Socket) {
        if (!data.examId || !data.userId) return { status: 'error' };

        // Real-time Activity Check
        const user = await this.prisma.user.findUnique({
            where: { id: data.userId },
            select: { isActive: true }
        });

        if (!user || user.isActive === false) {
            client.emit('error', {
                message: 'ACCOUNT_SUSPENDED'
            });
            client.disconnect(true);
            return { status: 'suspended' };
        }

        // 1. Strict Ownership Check in Redis
        const presenceRaw = await this.redis.get(`exam:${data.examId}:student:${data.userId}:online`);
        if (presenceRaw) {
            try {
                const presence = JSON.parse(presenceRaw);

                // If another socket is registered as owner, THIS socket must die
                if (presence.socketId && presence.socketId !== client.id) {
                    console.warn(`[Heartbeat] Kicking obsolete socket ${client.id} for user ${data.userId}. New owner is ${presence.socketId}`);
                    client.emit('error', {
                        message: 'Another instance of this exam is active. This session is now inactive.'
                    });
                    client.disconnect(true);
                    this.activeConnections.delete(client.id);
                    return { status: 'kicked' };
                }

                // Identity check fallback
                if (data.deviceId !== presence.deviceId || data.tabId !== presence.tabId) {
                    console.warn(`[Heartbeat] Identity mismatch for socket ${client.id}. Kicking.`);
                    client.emit('error', { message: 'Session identity mismatch. Please log in again.' });
                    client.disconnect(true);
                    this.activeConnections.delete(client.id);
                    return { status: 'kicked' };
                }
            } catch (e) {
                console.error("[Heartbeat] Parse error", e);
            }
        }

        // 2. Refresh Ownership
        const identity = {
            deviceId: data.deviceId,
            tabId: data.tabId,
            socketId: client.id,
            timestamp: Date.now()
        };
        await this.redis.set(
            `exam:${data.examId}:student:${data.userId}:online`,
            JSON.stringify(identity),
            'EX',
            120
        );

        return { status: 'ok' };
    }

    async forceTerminate(examId: string, userId: string) {
        // 1. Broadcast error to student rooms
        const studentRoom = `student_${userId}_exam_${examId}`;
        this.server.to(studentRoom).emit('error', {
            message: 'EXAM_TERMINATED'
        });

        // 2. Disconnect sockets
        const sockets = await this.server.in(studentRoom).fetchSockets();
        for (const s of sockets) {
            s.disconnect(true);
        }

        // 3. Clear Redis
        await this.redis.del(`exam:${examId}:student:${userId}:online`);
        this.activeConnections.forEach((uid, sid) => {
            if (uid === userId) this.activeConnections.delete(sid);
        });
    }
}
