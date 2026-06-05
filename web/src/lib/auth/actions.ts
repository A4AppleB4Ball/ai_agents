"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { generateState, generateCodeVerifier } from "arctic";
import { decodeJwt } from "jose";
import { getEntra } from "@/lib/auth/entra";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { AuthUser } from "@/lib/auth/types";

export async function loginWithEntra(): Promise<string> {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const entra = getEntra();
  const url = entra.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  const cookieStore = await cookies();

  cookieStore.set("entra_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
  });

  cookieStore.set("entra_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
  });

  return url.toString();
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = decodeJwt(token);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      cookieStore.delete(AUTH_COOKIE_NAME);
      return null;
    }
    return {
      email: (payload.preferred_username || payload.email) as string,
      name: payload.name as string,
      user_id: payload.oid as string,
    };
  } catch {
    cookieStore.delete(AUTH_COOKIE_NAME);
    return null;
  }
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}
