// middleware.ts - Fixed to allow admin API routes
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip all middleware logic in development
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Allow API routes to handle their own authentication
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow the /staff page to be accessed without authentication
  // so it can check for POS registration and show the PIN login.
  if (pathname === "/staff") {
    return NextResponse.next();
  }

  // Check if user has a valid session for all other protected routes
  const authCookie = request.cookies.get("vercel-auth");

  if (!authCookie) {
    // If no cookie, redirect to the password page
    const url = new URL("/api/auth/password", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect all routes except for:
  // - /api/* (API routes handle their own auth)
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
