import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withAuth } from "next-auth/middleware";

function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;

  // Allow access to API auth routes always
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // If user has custom auth token and trying to access auth pages, redirect to dashboard
  if (token && pathname.startsWith("/auth")) {
    console.log("[Middleware] Redirecting authenticated custom user to /dashboard/overview");
    return NextResponse.redirect(new URL("/dashboard/overview", request.url));
  }

  return NextResponse.next();
}

export default withAuth(middleware, {
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;

      // Always allow API auth routes
      if (pathname.startsWith("/api/auth")) {
        return true;
      }

      // Allow auth pages and home page
      if (pathname.startsWith("/auth") || pathname === "/") {
        return true;
      }

      // For other routes, check if NextAuth session exists OR custom token
      const customToken = req.cookies.get("auth-token")?.value;
      const hasValidSession = !!token; // NextAuth validates the session

      return hasValidSession || !!customToken;
    },
  },
  pages: {
    signIn: "/auth/v2/login",
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
