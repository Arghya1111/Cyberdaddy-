import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'https://cyberdaddy.onrender.com').replace(
  /\/$/,
  '',
);

export const dynamic = 'force-dynamic';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const subpath = path.join('/');
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/v1/${subpath}/${search}`;

  const headers = new Headers();
  const auth = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');
  if (auth) headers.set('Authorization', auth);
  if (contentType) headers.set('Content-Type', contentType);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const backendResponse = await fetch(targetUrl, init);
  const body = await backendResponse.arrayBuffer();

  const responseHeaders = new Headers();
  const contentTypeHeader = backendResponse.headers.get('content-type');
  if (contentTypeHeader) {
    responseHeaders.set('Content-Type', contentTypeHeader);
  }

  return new NextResponse(body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
