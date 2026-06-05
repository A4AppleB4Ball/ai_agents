import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getEntra } from "@/lib/auth/entra";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "@/lib/auth/config";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    throw new Error("Missing code or state in OAuth callback");
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("entra_state")?.value;
  const codeVerifier = cookieStore.get("entra_code_verifier")?.value;

  if (!storedState || !codeVerifier) {
    throw new Error("Missing OAuth state or code verifier cookies");
  }

  if (state !== storedState) {
    throw new Error("OAuth state mismatch");
  }

  const entra = getEntra();
  const tokens = await entra.validateAuthorizationCode(code, codeVerifier);
  const idToken = tokens.idToken();

  cookieStore.set(AUTH_COOKIE_NAME, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  cookieStore.delete("entra_state");
  cookieStore.delete("entra_code_verifier");

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  return NextResponse.redirect(new URL("/", `${proto}://${host}`));
}
