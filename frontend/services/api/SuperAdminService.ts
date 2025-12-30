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
            const res = await fetch(`${BASE_URL}/super-admin/organizations`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
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
    }
};
