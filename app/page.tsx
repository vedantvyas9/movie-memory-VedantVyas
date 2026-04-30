// Server component — no "use client" directive needed.
// Acts as the routing hub: authenticated users are redirected based on their
// onboarding status; unauthenticated users see the landing page.
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { SignInButton } from "./components/SignInButton"

export default async function Home() {
  // auth() reads the session from the database via the NextAuth Prisma adapter.
  // Returns null if no valid session cookie is present.
  const session = await auth()

  if (session?.user?.id) {
    // Authenticated — check DB to determine where to send the user.
    // This is the only place that queries favoriteMovie on landing; middleware
    // intentionally skips this check to avoid a DB call on every request.
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { favoriteMovie: true },
    })

    if (user?.favoriteMovie) {
      // Already onboarded — go straight to the dashboard.
      redirect("/dashboard")
    } else {
      // Authenticated but not yet onboarded — capture their favorite movie first.
      redirect("/onboarding")
    }
  }

  // Unauthenticated path: render the landing page.
  return (
    // Outer wrapper: full-height white page, flex-centered so content sits in the middle.
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 md:px-12">
      {/* Content column: max-w-2xl per design system layout spec */}
      <div className="max-w-2xl w-full space-y-8">
        {/* Page title — text-center is allowed for the landing headline per design.md */}
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 text-center">
          Movie Memory
        </h1>

        {/* One-sentence tagline — light weight, secondary color */}
        <p className="text-base font-light text-gray-500 text-center">
          Track the films that moved you, and discover something new each time.
        </p>

        {/* CTA — centered; SignInButton is a client component that calls signIn("google") */}
        <div className="flex justify-center">
          <SignInButton />
        </div>
      </div>
    </div>
  )
}
