import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8010";

async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Extract the path after /api/
  const url = new URL(request.url);
  const proxyPath = url.pathname.replace(/^\/api/, "");
  const targetUrl = `${BACKEND_URL}${proxyPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set("Authorization", `Bearer ${token}`);
  // Remove host header so the backend sees its own host
  headers.delete("host");

  const body = request.method !== "GET" && request.method !== "HEAD"
    ? await request.arrayBuffer()
    : undefined;

  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const responseHeaders = new Headers(backendResponse.headers);
  // Remove transfer-encoding to prevent issues with Next.js response handling
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
