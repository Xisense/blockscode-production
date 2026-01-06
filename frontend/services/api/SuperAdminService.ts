import { AuthService } from "./AuthService";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const getHeaders = () => {
    const token = AuthService.getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const SuperAdminService = {
    async getStats() {
        try {
            const res = await fetch(`${BASE_URL}/super-admin/stats`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async getOrganizations() {
        try {
            const res = await fetch(`${BASE_URL}/super-admin/organizations`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch organizations');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async getOrganization(id: string) {
        try {
            const res = await fetch(`${BASE_URL}/super-admin/organizations/${id}`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch organization');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async createOrganization(data: any) {
        try {
            const headers = getHeaders();
            // Remove Content-Type to let browser set it with boundary for FormData
            // @ts-ignore
            delete headers['Content-Type'];

            const formData = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    formData.append(key, data[key]);
                }
            });

            const res = await fetch(`${BASE_URL}/super-admin/organizations`, {
                method: 'POST',
                headers: headers as any,
                body: formData
            });
            if (!res.ok) throw new Error('Failed to create organization');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async updateOrganization(id: string, data: any) {
        try {
            const res = await fetch(`${BASE_URL}/super-admin/organizations/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update organization');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async deleteOrganization(id: string) {
        try {
            const headers = getHeaders();
            // @ts-ignore
            delete headers['Content-Type']; // Fastify throws 400 if Content-Type is json but body is empty

            const res = await fetch(`${BASE_URL}/super-admin/organizations/${id}`, {
                method: 'DELETE',
                headers: headers
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete organization');
            }
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async getUsers(page = 1, limit = 10, search = '') {
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search
            }).toString();

            const res = await fetch(`${BASE_URL}/super-admin/users?${query}`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async updateUser(id: string, data: any) {
        try {
            const res = await fetch(`${BASE_URL}/super-admin/users/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update user');
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    },

    async deleteUser(id: string) {
        try {
            const headers = getHeaders();
            // @ts-ignore
            delete headers['Content-Type'];

            const res = await fetch(`${BASE_URL}/super-admin/users/${id}`, {
                method: 'DELETE',
                headers: headers
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete user');
            }
            return await res.json();
        } catch (error) {
            console.error('[SuperAdminService] Error', error);
            throw error;
        }
    }
};
