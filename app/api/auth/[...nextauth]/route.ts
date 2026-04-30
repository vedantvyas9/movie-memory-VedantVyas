import { handlers } from "@/lib/auth"

// The [...nextauth] folder name is a Next.js catch-all route, meaning this
// file handles any request to /api/auth/* (e.g. /api/auth/signin,
// /api/auth/callback/google, /api/auth/session, /api/auth/signout).
// NextAuth generates the GET and POST handler functions for all of these
// endpoints automatically — we just re-export them here.
export const { GET, POST } = handlers
