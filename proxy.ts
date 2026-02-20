import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyAuthToken } from "@/features/auth/jwt";
import { AUTH_COOKIE_NAME, CUSTOMER_AUTH_COOKIE_NAME } from "@/lib/cookies";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const adminToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const adminPayload = adminToken ? verifyAuthToken(adminToken) : null;
  const isAdminAuthenticated = adminPayload?.role === "ADMIN";

  const customerToken = request.cookies.get(CUSTOMER_AUTH_COOKIE_NAME)?.value;
  const customerPayload = customerToken ? verifyAuthToken(customerToken) : null;
  const isCustomerAuthenticated = customerPayload?.role === "CUSTOMER";

  const isAdminRoute = pathname.startsWith("/admin");
  const isCustomerRoute =
    pathname === "/" ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/success");
  const isCustomerProtectedRoute =
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/success");
  const isAuthRoute = pathname === "/login" || pathname === "/setup-admin";
  const isCustomerAuthRoute =
    pathname === "/user-login" || pathname === "/user-register";

  if (isAdminRoute) {
    if (!adminToken || !isAdminAuthenticated) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      if (adminToken && !isAdminAuthenticated) {
        response.cookies.delete(AUTH_COOKIE_NAME);
      }
      return response;
    }
    return NextResponse.next();
  }

  if (isAdminAuthenticated && (isCustomerRoute || isAuthRoute)) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (adminToken && !isAdminAuthenticated && isAuthRoute) {
    const response = NextResponse.next();
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  if (isCustomerProtectedRoute && !isCustomerAuthenticated) {
    const response = NextResponse.redirect(new URL("/user-login", request.url));
    if (customerToken && !isCustomerAuthenticated) {
      response.cookies.delete(CUSTOMER_AUTH_COOKIE_NAME);
    }
    return response;
  }

  if (isCustomerAuthenticated && isCustomerAuthRoute) {
    return NextResponse.redirect(new URL("/products", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/user-login",
    "/user-register",
    "/setup-admin",
    "/admin/:path*",
    "/products/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/success/:path*",
  ],
};
