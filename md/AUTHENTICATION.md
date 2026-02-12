# Authentication System Documentation

This document describes how authentication works in this application and provides recommendations for improvements.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication Flow](#authentication-flow)
4. [Components](#components)
5. [Security Features](#security-features)
6. [Current Limitations](#current-limitations)
7. [Recommended Improvements](#recommended-improvements)

---

## Overview

This application uses **NextAuth.js v5** (Auth.js) for authentication. It implements a **single-user system** with a "master account" that controls access to the settings and management features of the media library.

**Key Characteristics:**
- **Single-user system**: Only one master account exists
- **Credentials-based**: Username/password authentication
- **JWT sessions**: Stateless session management
- **Protected routes**: `/settings/*` routes require authentication
- **First-time setup**: Initial account creation via `/setup` page

---

## Architecture

### Technology Stack

- **NextAuth.js v5** (`next-auth`): Authentication framework
- **bcryptjs**: Password hashing
- **SQLite + Drizzle ORM**: User storage
- **JWT**: Session tokens (stored in cookies)

### Database Schema

```typescript
// Users table (src/lib/db/schema.ts)
export const users = sqliteTable("users", {
  userId: integer("user_id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

**Key points:**
- Username must be unique
- Passwords are hashed with bcrypt (10 rounds)
- Timestamps track account creation and updates

---

## Authentication Flow

### 1. Initial Setup Flow

```
User visits app
    ↓
Check if user exists (/api/auth/check-setup)
    ↓
If no user exists → Redirect to /setup
    ↓
User creates master account
    ↓
POST /api/auth/setup
    ↓
Account created → Redirect to /login
```

**Setup Page** (`/setup`):
- Checks if setup is already complete
- Creates the first (and only) user account
- Validates username (min 3 chars) and password (min 8 chars)
- Hashes password with bcrypt before storing
- Prevents multiple account creation

### 2. Login Flow

```
User visits /login
    ↓
User enters credentials
    ↓
POST /api/auth/[...nextauth] (NextAuth handler)
    ↓
CredentialsProvider.authorize() called
    ↓
Query database for user by username
    ↓
Compare password with bcrypt.compare()
    ↓
If valid → Create JWT session token
    ↓
Set cookie: authjs.session-token
    ↓
Redirect to /settings
```

**Login Page** (`/login`):
- Client-side form using `signIn()` from `next-auth/react`
- Handles errors gracefully
- Redirects to `/settings` on success

### 3. Protected Route Access

```
User requests /settings/*
    ↓
Middleware runs (src/middleware.ts)
    ↓
Check for authjs.session-token cookie
    ↓
If no cookie → Redirect to /login?callbackUrl=/settings/...
    ↓
If cookie exists → Allow access
```

**Middleware** (`src/middleware.ts`):
- Protects all `/settings/*` routes
- Checks for session token cookie
- Redirects unauthenticated users to login
- Preserves intended destination via `callbackUrl`

### 4. Session Management

```
User authenticated
    ↓
JWT token created with user.id and user.name
    ↓
Token stored in cookie: authjs.session-token
    ↓
On each request:
    - Token validated
    - Session object created from token
    - Available via auth() in server components/API routes
```

**Session Structure:**
```typescript
{
  user: {
    id: string,      // User ID
    name: string,    // Username
  }
}
```

### 5. Logout Flow

```
User clicks logout
    ↓
signOut() called (next-auth/react)
    ↓
Session token cookie deleted
    ↓
Redirect to home page
```

---

## Components

### 1. Auth Configuration (`src/lib/auth.ts`)

**Purpose**: Central NextAuth configuration

**Key Features:**
- Credentials provider for username/password
- JWT session strategy
- Custom callbacks for token/session handling
- Custom login page route

```typescript
export const authConfig = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // 1. Find user by username
        // 2. Verify password with bcrypt
        // 3. Return user object (stored in JWT)
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add user data to JWT token
    },
    async session({ session, token }) {
      // Add user ID to session object
    },
  },
};
```

### 2. NextAuth API Route (`src/app/api/auth/[...nextauth]/route.ts`)

**Purpose**: NextAuth.js API endpoint handler

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

**Endpoints:**
- `GET /api/auth/[...nextauth]`: Session info, CSRF token
- `POST /api/auth/[...nextauth]`: Sign in, sign out

### 3. Setup API (`src/app/api/auth/setup/route.ts`)

**Purpose**: Create the initial master account

**Features:**
- Validates username (min 3 chars) and password (min 8 chars)
- Checks if user already exists (prevents multiple accounts)
- Hashes password with bcrypt (10 rounds)
- Creates user in database

**Security:**
- Only allows account creation if no users exist
- Validates input with Zod schema
- Password is hashed before storage

### 4. Check Setup API (`src/app/api/auth/check-setup/route.ts`)

**Purpose**: Check if initial setup is complete

**Returns:**
```json
{
  "needsSetup": boolean
}
```

### 5. Middleware (`src/middleware.ts`)

**Purpose**: Protect routes and handle redirects

**Protected Routes:**
- `/settings/*` - All settings pages
- `/setup` - Redirects authenticated users away

**How it works:**
1. Checks for `authjs.session-token` or `__Secure-authjs.session-token` cookie
2. If missing on protected route → redirect to `/login`
3. If present on `/setup` → redirect to `/settings`

**Limitation**: Only checks for cookie existence, doesn't validate token

### 6. Login Page (`src/app/login/page.tsx`)

**Purpose**: User login interface

**Features:**
- Username and password form
- Error handling
- Loading states
- Redirects to `/settings` on success

### 7. Setup Page (`src/app/setup/page.tsx`)

**Purpose**: Initial account creation

**Features:**
- Checks if setup is already complete
- Username, password, and confirm password fields
- Password validation (min 8 characters)
- Redirects to login after successful creation

### 8. Settings Page (`src/app/settings/page.tsx`)

**Purpose**: Main settings dashboard (protected)

**Features:**
- Logout button
- Links to manage different media types
- Only accessible when authenticated

---

## Security Features

### ✅ Implemented

1. **Password Hashing**
   - Uses bcrypt with 10 rounds
   - Passwords never stored in plain text

2. **JWT Sessions**
   - Stateless authentication
   - Token stored in HTTP-only cookie (when using secure cookies)

3. **Route Protection**
   - Middleware protects `/settings/*` routes
   - Unauthenticated users redirected to login

4. **Input Validation**
   - Username: min 3 characters
   - Password: min 8 characters
   - Zod schema validation on setup endpoint

5. **Single User System**
   - Prevents multiple account creation
   - Only one master account allowed

6. **Secure Cookie Support**
   - Checks for `__Secure-authjs.session-token` (HTTPS only)

---

## Current Limitations

### ⚠️ Security Issues

1. **API Routes Not Protected**
   - API routes under `/api/settings/*` are **not explicitly protected**
   - They rely on middleware protecting the `/settings` pages, but API routes can be called directly
   - **Risk**: Unauthorized access to management endpoints

2. **Middleware Only Checks Cookie Existence**
   - Doesn't validate the JWT token
   - **Risk**: Invalid/expired tokens might still grant access

3. **No Rate Limiting**
   - Login attempts are not rate-limited
   - **Risk**: Brute force attacks possible

4. **No Session Expiration**
   - JWT tokens don't expire (or expiration not configured)
   - **Risk**: Long-lived sessions if token is compromised

5. **No Password Reset**
   - No way to reset forgotten password
   - **Risk**: Locked out if password is forgotten

6. **No Account Management**
   - Cannot change username or password after creation
   - **Risk**: No way to update credentials

7. **No CSRF Protection**
   - While NextAuth provides CSRF tokens, they're not explicitly validated in custom API routes
   - **Risk**: CSRF attacks on state-changing operations

8. **No Audit Logging**
   - No logging of login attempts, failed authentications, or security events
   - **Risk**: Difficult to detect suspicious activity

9. **No Two-Factor Authentication**
   - Single-factor authentication only
   - **Risk**: Vulnerable if password is compromised

10. **No Account Lockout**
    - No protection against brute force attacks
    - **Risk**: Unlimited login attempts

---

## Recommended Improvements

### 🔒 High Priority (Security)

#### 1. Protect API Routes

**Problem**: API routes can be called directly without authentication.

**Solution**: Add authentication checks to all `/api/settings/*` routes.

```typescript
// src/app/api/settings/manage-ebooks/create-ebook/route.ts
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // ... rest of the code
}
```

**Alternative**: Create a reusable middleware function:

```typescript
// src/lib/auth-helpers.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  return null; // No error, user is authenticated
}

// Usage in API routes:
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  
  // ... rest of code
}
```

#### 2. Validate JWT Tokens in Middleware

**Problem**: Middleware only checks for cookie existence, not validity.

**Solution**: Use NextAuth's `auth()` function in middleware.

```typescript
// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith("/settings")) {
    const session = await auth();
    
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // ... rest of middleware
}
```

**Note**: This requires Next.js 13+ with proper middleware configuration.

#### 3. Add Rate Limiting

**Problem**: No protection against brute force attacks.

**Solution**: Implement rate limiting for login attempts.

```typescript
// src/lib/rate-limit.ts
import { LRUCache } from "lru-cache";

const loginAttempts = new LRUCache<string, number>({
  max: 500,
  ttl: 15 * 60 * 1000, // 15 minutes
});

export function checkRateLimit(identifier: string): boolean {
  const attempts = loginAttempts.get(identifier) || 0;
  
  if (attempts >= 5) {
    return false; // Rate limit exceeded
  }
  
  loginAttempts.set(identifier, attempts + 1);
  return true;
}

// Usage in auth.ts:
async authorize(credentials) {
  const identifier = credentials.username || request.ip;
  
  if (!checkRateLimit(identifier)) {
    throw new Error("Too many login attempts. Please try again later.");
  }
  
  // ... rest of auth logic
}
```

**Alternative**: Use a service like Upstash Redis for distributed rate limiting.

#### 4. Configure Session Expiration

**Problem**: Sessions don't expire, creating long-lived tokens.

**Solution**: Configure JWT expiration in NextAuth config.

```typescript
// src/lib/auth.ts
export const authConfig = {
  // ... existing config
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
```

#### 5. Add CSRF Protection

**Problem**: Custom API routes don't validate CSRF tokens.

**Solution**: Validate CSRF tokens in API routes.

```typescript
import { getCsrfToken } from "next-auth/react";

export async function POST(request: NextRequest) {
  const csrfToken = request.headers.get("x-csrf-token");
  const session = await auth();
  
  // Validate CSRF token
  if (!csrfToken || !validateCsrfToken(csrfToken, session)) {
    return NextResponse.json(
      { error: "Invalid CSRF token" },
      { status: 403 }
    );
  }
  
  // ... rest of code
}
```

### 🔧 Medium Priority (Functionality)

#### 6. Add Password Reset Functionality

**Solution**: Implement password reset flow.

```typescript
// Add to schema:
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  tokenId: integer("token_id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.userId),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  used: integer("used", { mode: "boolean" }).default(false).notNull(),
});

// API route: POST /api/auth/reset-password/request
// API route: POST /api/auth/reset-password/confirm
```

**Features:**
- Generate secure reset token
- Send email with reset link (or display token)
- Token expires after 1 hour
- One-time use tokens

#### 7. Add Account Management

**Solution**: Allow users to change username and password.

```typescript
// API route: PATCH /api/auth/update-account
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { username, currentPassword, newPassword } = await request.json();
  
  // Verify current password
  // Update username or password
  // Return success
}
```

**Features:**
- Change username (with validation)
- Change password (requires current password)
- Update password hash in database

#### 8. Add Audit Logging

**Solution**: Log authentication events.

```typescript
// Add to schema:
export const authLogs = sqliteTable("auth_logs", {
  logId: integer("log_id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.userId),
  eventType: text("event_type").notNull(), // "login", "logout", "failed_login", etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: integer("success", { mode: "boolean" }).notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Log in auth.ts:
async authorize(credentials) {
  try {
    // ... auth logic
    await logAuthEvent({
      userId: user[0].userId,
      eventType: "login",
      success: true,
    });
    return user;
  } catch (error) {
    await logAuthEvent({
      eventType: "failed_login",
      username: credentials.username,
      success: false,
    });
    throw error;
  }
}
```

#### 9. Add Account Lockout

**Solution**: Lock account after multiple failed login attempts.

```typescript
// Add to schema:
export const users = sqliteTable("users", {
  // ... existing fields
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockedUntil: integer("locked_until", { mode: "timestamp" }),
});

// In auth.ts:
async authorize(credentials) {
  const user = await db.select().from(users).where(eq(users.username, credentials.username));
  
  // Check if account is locked
  if (user[0].lockedUntil && user[0].lockedUntil > new Date()) {
    throw new Error("Account is locked. Please try again later.");
  }
  
  // ... verify password
  
  if (!isValid) {
    // Increment failed attempts
    const attempts = user[0].failedLoginAttempts + 1;
    const lockedUntil = attempts >= 5 
      ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
      : null;
    
    await db.update(users)
      .set({ failedLoginAttempts: attempts, lockedUntil })
      .where(eq(users.userId, user[0].userId));
    
    return null;
  }
  
  // Reset failed attempts on successful login
  await db.update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.userId, user[0].userId));
}
```

### 🎯 Low Priority (Enhancements)

#### 10. Add Two-Factor Authentication (2FA)

**Solution**: Implement TOTP-based 2FA.

```typescript
// Use library: otplib
import { authenticator } from "otplib";

// Add to schema:
export const users = sqliteTable("users", {
  // ... existing fields
  twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).default(false),
  twoFactorSecret: text("two_factor_secret"),
});

// API routes:
// POST /api/auth/2fa/setup - Generate secret and QR code
// POST /api/auth/2fa/verify - Verify TOTP code
// POST /api/auth/2fa/disable - Disable 2FA
```

#### 11. Add Remember Me Functionality

**Solution**: Extend session duration for "remember me" option.

```typescript
// In login page:
const result = await signIn("credentials", {
  username,
  password,
  remember: true, // User option
});

// In auth.ts:
callbacks: {
  async jwt({ token, user, trigger }) {
    if (user) {
      token.id = user.id;
      token.name = user.name;
      token.remember = user.remember; // Store remember preference
    }
    return token;
  },
},
session: {
  maxAge: (token) => token.remember ? 90 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 90 days or 7 days
},
```

#### 12. Add Social Login (Optional)

**Solution**: Add OAuth providers (Google, GitHub, etc.).

```typescript
import GoogleProvider from "next-auth/providers/google";

export const authConfig = {
  providers: [
    CredentialsProvider({ /* ... */ }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
};
```

**Note**: For a single-user system, this may be overkill, but useful if expanding to multi-user.

---

## Implementation Priority

### Phase 1: Critical Security Fixes
1. ✅ Protect API routes with authentication checks
2. ✅ Validate JWT tokens in middleware
3. ✅ Add rate limiting for login attempts
4. ✅ Configure session expiration

### Phase 2: Essential Features
5. ✅ Add password reset functionality
6. ✅ Add account management (change password/username)
7. ✅ Add audit logging

### Phase 3: Enhanced Security
8. ✅ Add account lockout after failed attempts
9. ✅ Add CSRF protection
10. ✅ Consider 2FA for high-security deployments

### Phase 4: Nice-to-Have
11. ✅ Remember me functionality
12. ✅ Social login (if expanding to multi-user)

---

## Testing Recommendations

1. **Test Authentication Flow**
   - First-time setup
   - Login with valid credentials
   - Login with invalid credentials
   - Logout

2. **Test Route Protection**
   - Access `/settings` without authentication
   - Access `/settings` with authentication
   - Access `/setup` when authenticated

3. **Test API Security**
   - Call API routes without authentication
   - Call API routes with valid session
   - Call API routes with expired/invalid token

4. **Test Rate Limiting**
   - Multiple failed login attempts
   - Verify rate limit triggers

5. **Test Session Management**
   - Session expiration
   - Token refresh (if implemented)

---

## Summary

The current authentication system provides basic security but has several gaps that should be addressed:

**Strengths:**
- ✅ Password hashing with bcrypt
- ✅ JWT-based sessions
- ✅ Route protection via middleware
- ✅ Input validation

**Weaknesses:**
- ❌ API routes not protected
- ❌ No rate limiting
- ❌ No session expiration configured
- ❌ No password reset
- ❌ No account management
- ❌ No audit logging

**Recommended Next Steps:**
1. Immediately protect all API routes
2. Add rate limiting to prevent brute force attacks
3. Configure session expiration
4. Implement password reset functionality
5. Add account management features

For a single-user media library application, the current system is functional but should be hardened before production deployment, especially if exposed to the internet.

