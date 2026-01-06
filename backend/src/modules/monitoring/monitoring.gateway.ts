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

    private activeConnections = new Map<string, { userId: string; examId: string }>(); // socketId -> Metadata

    afterInit(server: Server) {
        console.log('Proctoring Gateway initialized');
    }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    async handleDisconnect(client: Socket) {
        const meta = this.activeConnections.get(client.id);
        if (meta) {
            this.activeConnections.delete(client.id);
            console.log(`Client disconnected: ${client.id} (User: ${meta.userId}, Exam: ${meta.examId})`);
            
            // Notify teachers immediately
            this.server.to(`exam_${meta.examId}_monitor`).emit('student_status', {
                userId: meta.userId,
                online: false
            });
        } else {
            console.log(`Client disconnected: ${client.id}`);
        }
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
            this.activeConnections.set(client.id, { userId: data.userId, examId: data.examId });

            // 2. SET Redis ownership IMMEDIATELY
            // const identity = {
            //     deviceId: data.deviceId,
            //     tabId: data.tabId,
            //     socketId: client.id,
            //     joinedAt: Date.now()
            // };

            // await this.redis.set(
            //     `exam:${data.examId}:student:${data.userId}:online`,
            //     JSON.stringify(identity),
            //     'EX',
            //     120
            // );

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
                exam: true
            }
        });

        // 1. BLOCK violations if session is already completed or terminated
        if (!examSession) {
            console.log(`[Proctoring] Rejected violation: Session ${data.sessionId} not found`);
            return { status: 'rejected', reason: 'Session not found' };
        }
        if (examSession.status === 'COMPLETED' || examSession.status === 'TERMINATED') {
            console.log(`[Proctoring] Rejected violation: Session ${data.sessionId} is ${examSession.status}`);
            return { status: 'rejected', reason: 'Session inactive' };
        }

        // Save to DB (Fire and forget? No, wait for it to ensure consistency)
        await this.prisma.violation.create({
            data: {
                sessionId: data.sessionId,
                type: data.type,
                message: data.message,
                severity: 'WARNING',
                timestamp: new Date()
            }
        });

        // OPTIMIZATION: Count using DB aggregation instead of fetching all rows
        // This is much lighter on memory and bandwidth
        const [tabSwitchOutCount, tabSwitchInCount] = await Promise.all([
            this.prisma.violation.count({
                where: { 
                    sessionId: data.sessionId, 
                    type: { in: ['TAB_SWITCH', 'TAB_SWITCH_OUT'] } 
                }
            }),
            this.prisma.violation.count({
                where: { 
                    sessionId: data.sessionId, 
                    type: 'TAB_SWITCH_IN' 
                }
            })
        ]);

        // 2. CHECK TAB SWITCH LIMIT (Auto-termination)
        const limit = (examSession.exam as any)?.tabSwitchLimit;
        if (data.type === 'TAB_SWITCH_IN' && limit && tabSwitchInCount >= limit) {
            console.log(`[Proctoring] Auto-terminating session ${data.sessionId} for user ${data.userId} due to tab switch limit (${tabSwitchInCount}/${limit})`);

            await this.prisma.examSession.update({
                where: { id: data.sessionId },
                data: { status: 'TERMINATED', endTime: new Date() }
            });

            // Force kick student
            await this.forceTerminate(data.examId, data.userId);

            // Notify teachers about the termination
            this.server
                .to(`exam_${data.examId}_monitor`)
                .emit('student_terminated', {
                    userId: data.userId,
                    reason: `Exceeded Tab Switch Limit (${limit})`
                });

            return { status: 'terminated' };
        }

        this.server
            .to(`exam_${data.examId}_monitor`)
            .emit('live_violation', {
                userId: data.userId,
                type: data.type,
                message: data.message,
                details: data.details,
                tabOuts: tabSwitchOutCount,
                tabIns: tabSwitchInCount,
                timestamp: new Date()
            });

        console.log(`[Proctoring] Emitting live_violation to exam_${data.examId}_monitor:`, data.type);


        return { status: 'recorded' };
    }

    @SubscribeMessage('request_stream')
    async handleRequestStream(
        @MessageBody() data: { targetUserId: string; examId: string; teacherPeerId: string },
        @ConnectedSocket() client: Socket,
    ) {
        // Teacher requests stream from student
        // Broadcast to the specific student room
        const studentRoom = `student_${data.targetUserId}_exam_${data.examId}`;
        console.log(`[Proctoring] Streaming requested for user ${data.targetUserId} in exam ${data.examId} (Peer: ${data.teacherPeerId})`);

        this.server.to(studentRoom).emit('cmd_request_stream', {
            teacherSocketId: client.id,
            teacherPeerId: data.teacherPeerId
        });
        return { status: 'requested' };
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
        // await this.redis.del(`exam:${examId}:student:${userId}:online`);
        this.activeConnections.forEach((meta, sid) => {
            if (meta.userId === userId) this.activeConnections.delete(sid);
        });
    }
}
