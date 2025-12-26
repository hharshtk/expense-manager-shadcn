import { type NextRequest, NextResponse } from "next/server";

/**
 * Runs before requests complete.
 * Use for rewrites, redirects, or header changes.
 * Refer to Next.js Proxy docs for more examples.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/auth/v2/login", "/auth/v2/register", "/auth/v1/login", "/auth/v1/register", "/"];

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/unauthorized"];

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  // If user is not authenticated and trying to access protected route
  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL("/auth/v2/login", request.url));
  }

  // If user is not authenticated and route is not public (catch-all for other routes)
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth/v2/login", request.url));
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (token && pathname.startsWith("/auth/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

/**
 * Matcher runs for all routes except static files and API routes.
 * To skip assets or APIs, use a negative matcher from docs.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)",
  ],
};
