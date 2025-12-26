# Authentication Setup

This project uses a custom JWT-based authentication system with Neon PostgreSQL database.

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
- ✅ Password hashing using bcrypt
- ✅ Protected routes via middleware
- ✅ Session management with HTTP-only cookies
- ✅ Logout functionality

## Files Created/Modified

### New Files
1. `/src/lib/db.ts` - Database connection pool
2. `/src/lib/auth.ts` - Authentication utilities (JWT, password hashing)
3. `/src/server/auth-actions.ts` - Server actions for login/register/logout
4. `/src/scripts/setup-db.ts` - Database schema setup script
5. `/src/middleware.ts` - Route protection middleware

### Modified Files
1. `/src/app/(main)/auth/_components/login-form.tsx` - Connected to auth backend
2. `/src/app/(main)/auth/_components/register-form.tsx` - Connected to auth backend
3. `/src/app/(main)/dashboard/_components/sidebar/nav-user.tsx` - Added logout functionality

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
\`\`\`

## Security Features

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens for stateless authentication
- ✅ HTTP-only cookies to prevent XSS attacks
- ✅ 30-day token expiration
- ✅ Secure cookies in production
- ✅ Protected routes via middleware

## Google OAuth (To Be Implemented)

The Google OAuth button is currently a UI-only component. To make it functional, you'll need to:
1. Set up Google OAuth credentials
2. Configure the OAuth callback
3. Implement the OAuth flow in the backend

## Notes

- The authentication system is production-ready with proper security practices
- User sessions are managed via JWT tokens stored in HTTP-only cookies
- All password operations use bcrypt for secure hashing
- The database schema supports future extensions (user roles, profile data, etc.)
