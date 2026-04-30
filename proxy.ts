import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// auth() from NextAuth v5 wraps our handler and populates req.auth with the
// current session (read from the database via PrismaAdapter). If there is no
// valid session, redirect the user to the landing page so they can sign in.
// This proxy only checks authentication — favoriteMovie checks are done inside
// the page components themselves to avoid a DB call on every matched request.
export const proxy = auth((req) => {
  if (!req.auth) {
    // Unauthenticated — send back to the landing page where "Sign in with Google" lives.
    return NextResponse.redirect(new URL("/", req.url))
  }
})

export const config = {
  // Only run on these two routes. The landing page (/) is intentionally excluded
  // because it handles its own auth/redirect logic based on favoriteMovie presence.
  matcher: ["/dashboard", "/onboarding"],
}
