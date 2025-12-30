import { useState, useEffect } from 'react';

export interface NetworkStatus {
    isOnline: boolean;
    downlink: number; // Mbps
    effectiveType: string;
    rtt: number;
}

export function useNetworkMonitor() {
    const [status, setStatus] = useState<NetworkStatus>({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        downlink: 0,
        effectiveType: 'unknown',
        rtt: 0
    });

    useEffect(() => {
        const updateStatus = () => {
            const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
            setStatus({
                isOnline: navigator.onLine,
                downlink: conn ? conn.downlink : 0,
                effectiveType: conn ? conn.effectiveType : 'unknown',
                rtt: conn ? conn.rtt : 0
            });
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);

        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn) {
            conn.addEventListener('change', updateStatus);
        }

        updateStatus();

        return () => {
            window.removeEventListener('online', updateStatus);
            window.removeEventListener('offline', updateStatus);
            if (conn) {
                conn.removeEventListener('change', updateStatus);
            }
        };
    }, []);

    return status;
}
