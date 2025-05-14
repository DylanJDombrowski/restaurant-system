import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Skip password protection in development
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  // Check if user has valid session
  const authCookie = request.cookies.get("vercel-auth");

  if (!authCookie) {
    // Redirect to password page
    const url = new URL("/api/auth/password", request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
