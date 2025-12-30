const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const AuthService = {
    async login(email: string, password: string): Promise<any> {
        try {
            const res = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await res.json();
            if (data.access_token) {
                localStorage.setItem('auth_token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            return data;
        } catch (error) {
            console.error('[AuthService] Login error:', error);
            throw error;
        }
    },

    async checkSession(): Promise<any> {
        try {
            const token = this.getToken();
            if (!token) return null;

            const res = await fetch(`${BASE_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                if (error.message === 'ACCOUNT_SUSPENDED') {
                    this.logout('suspended');
                } else if (res.status === 401) {
                    this.logout();
                }
                throw new Error(error.message || 'Session invalid');
            }

            const userData = await res.json();
            // Sync local storage
            localStorage.setItem('user', JSON.stringify({
                ...this.getUser(),
                ...userData
            }));
            return userData;
        } catch (error) {
            console.error('[AuthService] Session check skipped (offline or error)');
            return null;
        }
    },

    async examLogin(email: string, testCode: string, password?: string): Promise<any> {
        try {
            // Clear previous session
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            localStorage.removeItem('currentExamSessionId');

            const res = await fetch(`${BASE_URL}/auth/exam-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, testCode, password })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Exam login failed');
            }

            const data = await res.json();
            if (data.access_token) {
                localStorage.setItem('auth_token', data.access_token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }
            return data;
        } catch (error) {
            console.error('[AuthService] Exam login error:', error);
            throw error;
        }
    },

    async register(data: any): Promise<any> {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async updateProfile(data: { name: string }): Promise<any> {
        const token = this.getToken();
        const res = await fetch(`${BASE_URL}/auth/profile`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to update profile');
        }

        const updatedUser = await res.json();
        // Update local session
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
    },

    async changePassword(data: { currentPass: string; newPass: string }): Promise<any> {
        const token = this.getToken();
        const res = await fetch(`${BASE_URL}/auth/change-password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to change password');
        }

        return await res.json();
    },

    getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('auth_token');
        }
        return null;
    },

    getUser(): any | null {
        if (typeof window !== 'undefined') {
            const user = localStorage.getItem('user');
            return user ? JSON.parse(user) : null;
        }
        return null;
    },

    getRole(): string | null {
        const user = this.getUser();
        return user?.role || null;
    },

    logout(reason?: string) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        if (reason === 'suspended') {
            window.location.href = '/login?error=suspended';
        } else {
            window.location.href = '/login';
        }
    }
};
