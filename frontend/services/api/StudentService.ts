import { AuthService } from "./AuthService";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const getHeaders = () => {
    const token = AuthService.getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface StudentStats {
    completedModules: number;
    averageScore: number;
    streak: number;
    totalXP: number;
}

export interface StudentModule {
    title: string;
    slug: string;
    sections: number;
    percent: number;
    status: string;
}

export const StudentService = {
    async getStats(): Promise<StudentStats> {
        try {
            const res = await fetch(`${BASE_URL}/student/stats`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Failed to fetch stats', error);
            throw error;
        }
    },

    async getModules(): Promise<StudentModule[]> {
        try {
            const res = await fetch(`${BASE_URL}/student/modules`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch modules');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getCourses() {
        try {
            const res = await fetch(`${BASE_URL}/student/courses`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch courses');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getAttempts() {
        try {
            const res = await fetch(`${BASE_URL}/student/attempts`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch attempts');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getAnalytics() {
        try {
            const res = await fetch(`${BASE_URL}/student/analytics`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getProfile() {
        try {
            const res = await fetch(`${BASE_URL}/student/profile`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch profile');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async updateProfile(data: { name?: string }) {
        try {
            const res = await fetch(`${BASE_URL}/student/profile`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update profile');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getBookmarks() {
        try {
            const res = await fetch(`${BASE_URL}/student/bookmarks`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch bookmarks');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async addBookmark(unitId: string) {
        try {
            const res = await fetch(`${BASE_URL}/student/bookmarks/${unitId}`, {
                method: 'POST',
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to add bookmark');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async removeBookmark(unitId: string) {
        try {
            const res = await fetch(`${BASE_URL}/student/bookmarks/${unitId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to remove bookmark');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async getUnitSubmissions(unitId: string) {
        try {
            const res = await fetch(`${BASE_URL}/student/units/${unitId}/submissions`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch unit submissions');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    },

    async submitUnit(unitId: string, data: { status: string; content: any; score?: number }) {
        try {
            const res = await fetch(`${BASE_URL}/student/units/${unitId}/submit`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to submit unit');
            return await res.json();
        } catch (error) {
            console.error('[StudentService] Error', error);
            throw error;
        }
    }
};
