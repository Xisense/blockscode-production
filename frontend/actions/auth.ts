'use server'

import { cookies } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function loginAction(email: string, password: string) {
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
            // Set HTTP-Only Cookie
            // Expires in 7 days (matching typical JWT life or specific requirement)
            await (await cookies()).set('auth_token', data.access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 
            });
            
            // Also return user data for client-side context if needed
            // But we don't set cookie on client
        }
        
        return { success: true, user: data.user, access_token: data.access_token };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function logoutAction() {
    await (await cookies()).delete('auth_token');
    return { success: true };
}

export async function getAuthToken() {
    return (await cookies()).get('auth_token')?.value;
}
