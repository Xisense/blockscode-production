import { AuthService } from "./AuthService";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const getHeaders = () => {
    const token = AuthService.getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const AdminService = {
    async getStats(orgId?: string) {
        try {
            const url = orgId ? `${BASE_URL}/admin/stats?orgId=${orgId}` : `${BASE_URL}/admin/stats`;
            const res = await fetch(url, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch admin stats');
            return await res.json();
        } catch (error) {
            console.error('[AdminService] Error fetching stats', error);
            throw error;
        }
    },

    async getUsers(orgId?: string) {
        try {
            const url = orgId ? `${BASE_URL}/admin/users?orgId=${orgId}` : `${BASE_URL}/admin/users`;
            const res = await fetch(url, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            return await res.json();
        } catch (error) {
            console.error('[AdminService] Error fetching users', error);
            throw error;
        }
    },

    async createUser(userData: any, orgId?: string) {
        try {
            const url = orgId ? `${BASE_URL}/admin/users?orgId=${orgId}` : `${BASE_URL}/admin/users`;
            const res = await fetch(url, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(userData)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to create user');
            }
            return await res.json();
        } catch (error) {
            console.error('[AdminService] Error creating user', error);
            throw error;
        }
    },

    async createUsersBulk(users: any[], orgId?: string) {
        try {
            const url = orgId ? `${BASE_URL}/admin/users/bulk?orgId=${orgId}` : `${BASE_URL}/admin/users/bulk`;
            const res = await fetch(url, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ users })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to import users');
            }
            return await res.json();
        } catch (error) {
            console.error('[AdminService] Error importing users', error);
            throw error;
        }
    },

    async getSystemLogs(orgId?: string) {
        try {
            const url = orgId ? `${BASE_URL}/admin/logs?orgId=${orgId}` : `${BASE_URL}/admin/logs`;
            const res = await fetch(url, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch logs');
            return await res.json();
        } catch (error) {
            console.error('[AdminService] Error fetching logs', error);
            throw error;
        }
    },

    async getAnalytics(orgId?: string) {
        try {
            const url = orgId ? `${BASE_URL}/admin/analytics?orgId=${orgId}` : `${BASE_URL}/admin/analytics`;
            const res = await fetch(url, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch analytics');
            return await res.json();
        } catch (error) {
            console.error('[AdminService] Error fetching analytics', error);
            throw error;
        }
    },

    async getExams(orgId?: string) {
        try {
            const url = orgId ? `${BASE_URL}/admin/exams?orgId=${orgId}` : `${BASE_URL}/admin/exams`;
            const res = await fetch(url, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch admin exams');
            return await res.json();
        } catch (error) {
            console.error('[AdminService] Error fetching exams', error);
            throw error;
        }
    },

    async getCourses(orgId?: string) {
        try {
            const url = orgId ? `${BASE_URL}/admin/courses?orgId=${orgId}` : `${BASE_URL}/admin/courses`;
            const res = await fetch(url, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch admin courses');
            return await res.json();
        } catch (error) {
            console.error('[AdminService] Error fetching courses', error);
            throw error;
        }
    },

    async toggleUserStatus(id: string) {
        try {
            const res = await fetch(`${BASE_URL}/admin/users/${id}/status`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({})
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to update user status');
            }
            return await res.json();
        } catch (error) {
            console.error('[AdminService] Error toggling status', error);
            throw error;
        }
    },

    async deleteUser(id: string) {
        try {
            const headers = getHeaders();
            // Remove Content-Type for DELETE if no body is sent, as it can cause 400 in some Fastify setups
            delete (headers as any)['Content-Type'];

            const res = await fetch(`${BASE_URL}/admin/users/${id}`, {
                method: 'DELETE',
                headers: headers
            });
            if (!res.ok) {
                const text = await res.text();
                let errorData: any = {};
                try { errorData = JSON.parse(text); } catch (e) { errorData = { message: text }; }
                console.error('[AdminService] Delete failed:', res.status, errorData);
                throw new Error(errorData.message || 'Failed to delete user');
            }
            return await res.json().catch(() => ({ success: true }));
        } catch (error) {
            console.error('[AdminService] Error deleting user', error);
            throw error;
        }
    }
};
