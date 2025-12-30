import { useEffect, useRef } from 'react';
import { MonitoringService } from '@/services/api/MonitoringService';
import { MonitoringEvent, ViolationEvent } from '@/types/monitoring';

export function useElectronMonitoring(examId: string, studentId: string) {
    const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Start Heartbeat - Simplified for Web
        // In pure web, we rely on Socket, but if we need HTTP heartbeat:
        heartbeatInterval.current = setInterval(() => {
            MonitoringService.sendHeartbeat();
        }, 30000); // 30s heartbeat

        return () => {
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
            }
        };
    }, []);

    const logEvent = (eventType: string, message: string, data?: any) => {
        const event: MonitoringEvent = {
            examId,
            studentId,
            eventType,
            eventMessage: message,
            eventData: { ...data, timestamp: new Date().toISOString() },
            browserInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform
            }
        };
        MonitoringService.logEvent(event);
    };

    const logViolation = (type: string, message: string, details?: any) => {
        const violation: ViolationEvent = {
            examId,
            studentId,
            violationType: type,
            violationMessage: message,
            violationSeverity: 'critical',
            violationDetails: details,
            autoDetected: true
        };
        MonitoringService.logViolation(violation);
    };

    return {
        logEvent,
        logViolation
    };
}
