import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Proxy runs on the edge runtime — Prisma (which requires Node.js) cannot be
// used here. Instead we check for the NextAuth session cookie directly.
// The real session validation still happens in every API route via auth(), so
// this check is purely for redirecting the browser to the login page early.
// NextAuth sets the cookie name based on the environment:
//   development  → authjs.session-token
//   production   → __Secure-authjs.session-token (requires HTTPS)
export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token")

  if (!hasSession) {
    return NextResponse.redirect(new URL("/", request.url))
  }
}

export const config = {
  // Only protect these two routes. The landing page (/) handles its own
  // auth/redirect logic to avoid a DB call on every unauthenticated visit.
  matcher: ["/dashboard", "/onboarding"],
}
