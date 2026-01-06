import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

async function handleRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
    const { path } = await params;
    const pathString = path.join('/');
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${BASE_URL}/${pathString}${request.nextUrl.search}`;
    
    // Copy body if method is not GET/HEAD
    const body = (request.method !== 'GET' && request.method !== 'HEAD') 
        ? await request.blob() 
        : undefined;

    try {
        const response = await fetch(url, {
            method: request.method,
            headers,
            body,
            cache: 'no-store'
        });

        // Forward response
        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
        });
    } catch (error) {
        console.error('API Proxy Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
