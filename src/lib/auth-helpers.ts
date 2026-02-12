import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Require authentication for API routes.
 * Returns an error response if user is not authenticated, or null if authenticated.
 * 
 * @returns NextResponse with 401 error if not authenticated, or null if authenticated
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authError = await requireAuth();
 *   if (authError) return authError;
 *   
 *   // User is authenticated, proceed with request
 *   // ... rest of code
 * }
 * ```
 */
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

/**
 * Get the current authenticated session.
 * Returns the session object if authenticated, or null if not authenticated.
 * 
 * @returns Session object or null
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const session = await getSession();
 *   
 *   if (!session) {
 *     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   }
 *   
 *   // Use session.user.id, session.user.name, etc.
 * }
 * ```
 */
export async function getSession() {
  return await auth();
}

