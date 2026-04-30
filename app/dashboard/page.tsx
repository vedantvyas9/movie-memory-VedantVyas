// Dashboard shell — full UI is implemented in Issue 5. This file WILL be replaced.
// For now: verifies auth and onboarding status, renders a placeholder.
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  // auth() returns the active session or null if no valid session cookie exists.
  const session = await auth()
  if (!session) {
    // Middleware already blocks unauthenticated requests, but we guard here
    // for defense-in-depth and to narrow the TypeScript type below.
    redirect("/")
  }

  // Fetch the user row to verify onboarding completion.
  // session.user.id was attached by the session callback in lib/auth.ts.
  const user = await db.user.findUnique({
    where: { id: session!.user.id },
    select: { favoriteMovie: true },
  })

  if (!user?.favoriteMovie) {
    // Authenticated but not onboarded — send them to set their favorite movie.
    redirect("/onboarding")
  }

  // Page wrapper: max-w-2xl, px-6, py-16 per design system spec.
  // Full dashboard layout is implemented in Issue 5.
  return (
    <div className="min-h-screen bg-white px-6 py-16 md:px-12">
      <div className="max-w-2xl mx-auto">
        {/* Placeholder — replaced in Issue 5 */}
        <div>Dashboard — coming soon. User: {session!.user.email}</div>
      </div>
    </div>
  )
}
