"use client"

// SessionProvider is a React context provider from next-auth/react.
// It must live in a client component because React context is not available
// in server components. We isolate it here so app/layout.tsx can remain a
// server component and still make session data available to client subtrees.
import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  // SessionProvider reads the session from /api/auth/session and exposes it
  // via the useSession() hook to any client component in the tree.
  return <SessionProvider>{children}</SessionProvider>
}
