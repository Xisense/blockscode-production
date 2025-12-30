import { UnitQuestion } from '@/app/components/UnitRenderer';
import { AuthService } from './AuthService';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const getHeaders = () => {
    const token = AuthService.getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const ExamService = {
    async getExamBySlug(slug: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/${slug}?json=1`, {
                headers: getHeaders()
            });
            if (!res.ok) {
                if (res.status === 401) throw new Error('401 Unauthorized');
                throw new Error(`API Error: ${res.status}`);
            }
            return await res.json();
        } catch (error) {
            console.error(`[ExamService] API GetExam failed for ${slug}`, error);
            throw error;
        }
    },

    async getExamPublicStatus(slug: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/${slug}/public-status`);
            if (!res.ok) throw new Error('Failed to fetch status');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to fetch public status', error);
            throw error;
        }
    },

    async startExam(slug: string, deviceId?: string, userId?: string, tabId?: string, metadata?: any): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/${slug}/start`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ deviceId: deviceId || 'web-browser', userId, tabId, metadata })
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                if (res.status === 409 || (errorData.message && errorData.message.includes('ALREADY'))) {
                    throw new Error('EXAM_ALREADY_ACTIVE');
                }
                throw new Error('Failed to start exam');
            }
            return await res.json();
        } catch (error) {
            console.error(`[ExamService] startExam failed for ${slug}`, error);
            throw error;
        }
    },

    async getAppConfig(): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/app-config`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Config API not available');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to fetch app config', error);
            throw error;
        }
    },

    async getStrictness(examId: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/getCurrentTypeOfExecution?quizId=${examId}`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Strictness API not available');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to fetch strictness', error);
            throw error;
        }
    },

    async submitSection(sessionId: string, sectionId: string, answers: any): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/submission/section`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ sessionId, sectionId, answers })
            });
            if (!res.ok) throw new Error('Failed to submit section');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to submit section', error);
            throw error;
        }
    },

    async submitExam(sessionId: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/submission/submit`, { // Assuming endpoint
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ sessionId })
            });
            if (!res.ok) throw new Error('Failed to submit exam');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to submit exam', error);
            throw error;
        }
    },

    async saveFeedback(slug: string, userId: string, rating: number, comment: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/exam/${slug}/feedback`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ userId, rating, comment })
            });
            if (!res.ok) throw new Error('Failed to save feedback');
            return await res.json();
        } catch (error) {
            console.error('[ExamService] Failed to save feedback', error);
            throw error;
        }
    }
};
