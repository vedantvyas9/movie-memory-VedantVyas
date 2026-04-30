"use client"

// signIn() from next-auth/react triggers the Google OAuth redirect flow.
// It requires an onClick handler, which means it must live in a client component —
// server components cannot attach browser event listeners.
import { signIn } from "next-auth/react"

export function SignInButton() {
  // On click, initiate the Google OAuth flow. NextAuth handles the full
  // redirect sequence and eventually sets the session cookie.
  return (
    <button
      onClick={() => signIn("google")}
      className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-gray-700 transition-colors"
    >
      Sign in with Google
    </button>
  )
}
