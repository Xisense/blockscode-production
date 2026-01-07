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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
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

    console.log(`[Proxy] Request to /${pathString}`, { 
        hasToken: !!token, 
        tokenStart: token ? token.substring(0, 10) + '...' : 'N/A',
        contentType: request.headers.get('content-type') || 'none'
    });

    const headers: HeadersInit = {};

    // Forward the Content-Type header if present (important for multipart/form-data)
    const contentType = request.headers.get('content-type');
    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`; // For strategies checking Bearer
        headers['Cookie'] = `auth_token=${token}`;    // For strategies checking Cookie (redundancy)
    }

    const url = `${BASE_URL}/${pathString}${request.nextUrl.search}`;
    
    // Read body as ArrayBuffer to ensure intact data transmission
    // This avoids issues with streaming implementation mismatches
    const body = (request.method !== 'GET' && request.method !== 'HEAD') 
        ? await request.arrayBuffer() 
        : undefined;

    try {
        const response = await fetch(url, {
            method: request.method,
            headers,
            body,
            cache: 'no-store'
        });

        // Filter headers to avoid Content-Encoding issues since fetch auto-decompresses
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete('content-encoding');
        responseHeaders.delete('content-length');

        // Forward response
        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
    } catch (error) {
        console.error('API Proxy Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
