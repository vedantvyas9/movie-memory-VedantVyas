import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import type { DefaultSession } from "next-auth"

// Module augmentation: NextAuth's Session type only includes name, email, and image
// by default. We extend it here so TypeScript knows session.user.id exists
// and is always a string (the DB primary key), not undefined.
declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"] // keep the default fields (name, email, image)
  }
}

// Initialize NextAuth and export the four things the rest of the app needs:
//   handlers  — GET/POST functions wired up in app/api/auth/[...nextauth]/route.ts
//   auth      — call this in Server Components / API routes to get the current session
//   signIn    — trigger a sign-in flow (used in Server Actions)
//   signOut   — trigger a sign-out flow (used in Server Actions)
export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter tells NextAuth to store users, sessions, and accounts in
  // our Postgres database instead of using JWTs stored only in cookies.
  adapter: PrismaAdapter(db),

  providers: [
    // Enable "Sign in with Google". NextAuth handles the full OAuth redirect
    // flow; we just supply the app credentials from Google Cloud Console.
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    // The session callback runs every time a session is read (e.g. on every
    // page load). By default NextAuth does NOT include the DB user ID in the
    // session. We attach it here so every API route can do:
    //   const session = await auth()
    //   session.user.id  ← the actual DB primary key
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
