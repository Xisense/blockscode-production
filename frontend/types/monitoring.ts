export interface MonitoringEvent {
    submissionId?: string;
    examId?: string;
    studentId?: string;
    eventType: string;
    eventMessage: string;
    eventCategory?: string;
    severity?: 'info' | 'warning' | 'critical';
    eventData?: Record<string, any>;
    browserInfo?: {
        userAgent: string;
        platform: string;
        screen?: string;
    };
}

export interface ViolationEvent {
    submissionId?: string;
    examId?: string;
    studentId?: string;
    violationType: string;
    violationMessage: string;
    violationSeverity: 'warning' | 'critical';
    violationDetails?: Record<string, any>;
    actionTaken?: string;
    autoDetected?: boolean;
}
