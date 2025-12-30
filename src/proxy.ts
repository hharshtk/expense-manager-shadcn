import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withAuth } from "next-auth/middleware";

function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const nextAuthToken = request.cookies.get("next-auth.session-token")?.value;
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/auth", "/api/auth"];

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard"];

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  // Check if user has either custom auth token or NextAuth session
  const isAuthenticated = token || nextAuthToken;

  // If user is not authenticated and trying to access protected route
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated && pathname.startsWith("/auth/") && !pathname.startsWith("/auth/v2/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export default withAuth(middleware, {
  callbacks: {
    authorized: ({ token, req }) => {
      // Allow access to public routes
      const { pathname } = req.nextUrl;
      const publicRoutes = ["/auth", "/api/auth"];
      const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

      if (isPublicRoute) return true;

      // For protected routes, check if user has session
      return !!token;
    },
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
