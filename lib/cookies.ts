import type { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "admin_auth_token";
export const CUSTOMER_AUTH_COOKIE_NAME = "customer_auth_token";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...baseCookieOptions(),
    maxAge: 0,
  });
}

export function setCustomerAuthCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set(CUSTOMER_AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearCustomerAuthCookie(response: NextResponse): void {
  response.cookies.set(CUSTOMER_AUTH_COOKIE_NAME, "", {
    ...baseCookieOptions(),
    maxAge: 0,
  });
}
