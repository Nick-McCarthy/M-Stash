import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /settings routes
  if (pathname.startsWith("/settings")) {
    // Check for NextAuth session token cookie
    // NextAuth v5 uses 'authjs.session-token' cookie name
    const sessionToken =
      request.cookies.get("authjs.session-token") ||
      request.cookies.get("__Secure-authjs.session-token");

    if (!sessionToken) {
      // Redirect to login if not authenticated
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Block access to /setup if user is already authenticated
  // (If they're logged in, setup is definitely complete)
  if (pathname === "/setup") {
    const sessionToken =
      request.cookies.get("authjs.session-token") ||
      request.cookies.get("__Secure-authjs.session-token");

    if (sessionToken) {
      // User is authenticated, redirect to settings
      return NextResponse.redirect(new URL("/settings", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*", "/setup"],
};
