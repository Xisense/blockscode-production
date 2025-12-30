import { MonitoringEvent, ViolationEvent } from '@/types/monitoring'; // We will create this type definition file next

import { AuthService } from './AuthService';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const getHeaders = () => {
    const token = AuthService.getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const MonitoringService = {
    async logEvent(event: MonitoringEvent): Promise<void> {
        try {
            if (typeof window !== 'undefined' && (window as any).api) {
                // Electron Bridge
                (window as any).api.sendToMain('log-event', event);
            }

            const response = await fetch(`${BASE_URL}/exam/monitoring/log-event`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(event),
            });

            if (!response.ok) throw new Error('Failed to log event');
        } catch (error) {
            console.warn('[MonitoringService] Log Event failed (running offline/fallback):', error);
        }
    },

    async logViolation(violation: ViolationEvent): Promise<void> {
        try {
            if (typeof window !== 'undefined' && (window as any).api) {
                (window as any).api.sendToMain('log-violation', violation);
            }

            const response = await fetch(`${BASE_URL}/exam/monitoring/log-violation`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(violation),
            });

            if (!response.ok) throw new Error('Failed to log violation');
        } catch (error) {
            console.error('[MonitoringService] Log Violation failed:', error);
        }
    },

    async sendHeartbeat(): Promise<void> {
        try {
            const response = await fetch(`${BASE_URL}/exam/monitoring/heartbeat`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ deviceId: 'browser' })
            });
            if (!response.ok) throw new Error('Heartbeat failed');
        } catch (error) {
            // Silent fail for heartbeat in dev/offline mode
        }
    },

    async checkHealth(): Promise<boolean> {
        try {
            const res = await fetch(`${BASE_URL}/exam/isDOUp`);
            const data = await res.json();
            return data.status === 'up';
        } catch (e) {
            console.warn('[MonitoringService] Health check failed, assuming offline mode.');
            return true; // Assume up to prevent blocking user in dev
        }
    }
};
