# Authentication Setup

This project uses a custom JWT-based authentication system with Neon PostgreSQL database and Google OAuth integration.

## Setup Complete ✅

The authentication system has been successfully configured with the following components:

### Database
- **Connection**: Neon PostgreSQL (using connection string from `.env.local`)
- **Tables Created**:
  - `users` - Stores user accounts (id, email, password_hash, name, timestamps)
  - `sessions` - Manages user sessions (id, user_id, token, expires_at)

### Authentication Features
- ✅ User registration with email and password
- ✅ User login with JWT token generation
- ✅ Google OAuth sign-in
- ✅ Password hashing using bcrypt
- ✅ Protected routes via middleware
- ✅ Session management with HTTP-only cookies
- ✅ Logout functionality

## Files Created/Modified

### New Files
1. `/src/lib/db.ts` - Database connection pool
2. `/src/lib/auth.ts` - Authentication utilities (JWT, password hashing)
3. `/src/lib/auth-nextauth.ts` - NextAuth configuration for Google OAuth
4. `/src/server/auth-actions.ts` - Server actions for login/register/logout
5. `/src/scripts/setup-db.ts` - Database schema setup script
6. `/src/middleware.ts` - Route protection middleware
7. `/src/app/api/auth/[...nextauth]/route.ts` - NextAuth API route
8. `/src/components/providers.tsx` - NextAuth session provider
9. `/src/types/next-auth.d.ts` - NextAuth type declarations

### Modified Files
1. `/src/app/(main)/auth/_components/login-form.tsx` - Added Google sign-in button
2. `/src/app/(main)/auth/_components/register-form.tsx` - Connected to auth backend
3. `/src/app/(main)/dashboard/_components/sidebar/nav-user.tsx` - Added logout functionality for both auth types
4. `/src/app/(main)/dashboard/_components/sidebar/account-switcher.tsx` - Updated to handle both auth types
5. `/src/app/(main)/dashboard/_components/sidebar/app-sidebar.tsx` - Updated user type
6. `/src/app/(main)/dashboard/layout.tsx` - Added NextAuth session support
7. `/src/app/layout.tsx` - Added NextAuth session provider

## Usage

### 1. Database Setup (Already Done)
The database has already been set up with the required tables. If you need to reset it, run:
\`\`\`bash
npm run setup:db
\`\`\`

### 2. Starting the Application
\`\`\`bash
npm run dev
\`\`\`

### 3. Testing Authentication

**Register a new account:**
- Navigate to `/auth/v2/register`
- Fill in your name, email, and password
- Submit the form
- You'll be automatically logged in and redirected to `/dashboard`

**Login with existing account:**
- Navigate to `/auth/v2/login`
- Enter your email and password
- Submit the form
- You'll be redirected to `/dashboard`

**Google Sign-in:**
- Navigate to `/auth/v2/login`
- Click "Continue with Google"
- Complete Google OAuth flow
- You'll be redirected to `/dashboard`

**Logout:**
- Click on your avatar in the sidebar
- Click "Log out"
- You'll be redirected to the login page

## Protected Routes

The middleware automatically protects all routes except:
- `/auth/v2/login`
- `/auth/v2/register`
- `/auth/v1/login`
- `/auth/v1/register`
- `/` (home page)

If you try to access any other route without being logged in, you'll be redirected to `/auth/v2/login`.

## Environment Variables

Make sure your `.env.local` file contains:
\`\`\`
DATABASE_URL='your-neon-connection-string'
JWT_SECRET='your-super-secret-jwt-key-change-this-in-production-123456789'
GOOGLE_CLIENT_ID='your-google-client-id'
GOOGLE_CLIENT_SECRET='your-google-client-secret'
NEXTAUTH_SECRET='your-nextauth-secret-key'
\`\`\`

## Security Features

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens for stateless authentication
- ✅ HTTP-only cookies to prevent XSS attacks
- ✅ 30-day token expiration
- ✅ Secure cookies in production
- ✅ Protected routes via middleware

## Google OAuth

Google OAuth has been fully implemented and integrated with the existing authentication system. Users can now sign in with their Google accounts alongside the traditional email/password authentication.

### Features
- ✅ Google OAuth 2.0 integration
- ✅ Automatic user creation for new Google users
- ✅ Seamless integration with existing user management
- ✅ Profile picture support from Google
- ✅ Secure session management

## Notes

- The authentication system is production-ready with proper security practices
- User sessions are managed via JWT tokens stored in HTTP-only cookies
- All password operations use bcrypt for secure hashing
- The database schema supports future extensions (user roles, profile data, etc.)
