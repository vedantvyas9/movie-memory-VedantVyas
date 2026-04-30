// Server component — renders the onboarding form and embeds a server action.
// No "use client" directive; all logic runs on the server.
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

// Server Action — invoked when the user submits the form.
// 'use server' must be the first statement in the function body so the Next.js
// compiler treats it as a server action (runs as a POST to the same route).
async function saveMovie(formData: FormData) {
  "use server"

  // Always re-call auth() inside a server action — the action runs on a different
  // POST request than the page render, so we cannot rely on a captured session.
  const session = await auth()
  if (!session) {
    redirect("/")
    return
  }

  // Extract and trim the movie title from the submitted form data.
  const raw = formData.get("movie")
  const movie = typeof raw === "string" ? raw.trim() : ""

  // Server-side validation — per CLAUDE.md: trim, min 1 char, max 100 chars.
  if (movie.length < 1 || movie.length > 100) {
    // Pass the error back to the page via a URL search param. The page is a
    // server component so we cannot return JSX from the action directly;
    // redirecting with ?error= is the no-client-JS alternative to useActionState.
    redirect(
      "/onboarding?error=" +
        encodeURIComponent(
          "Movie title must be between 1 and 100 characters."
        )
    )
    return
  }

  // Persist to DB — scoped to the authenticated user to prevent cross-user writes.
  await db.user.update({
    where: { id: session.user.id },
    data: { favoriteMovie: movie },
  })

  // Onboarding complete — send the user to the dashboard.
  redirect("/dashboard")
}

export default async function OnboardingPage({
  searchParams,
}: {
  // searchParams is a Promise in Next.js 16 — must be awaited before reading.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Middleware already guards this route, but we double-check here for defense-in-depth
  // and to satisfy TypeScript's non-null requirements downstream.
  const session = await auth()
  if (!session) {
    redirect("/")
  }

  // If the user has already completed onboarding, skip directly to the dashboard.
  const user = await db.user.findUnique({
    where: { id: session!.user.id },
    select: { favoriteMovie: true },
  })
  if (user?.favoriteMovie) {
    redirect("/dashboard")
  }

  // Read the validation error injected by the server action on a failed submission.
  // searchParams is a Promise in Next.js 16, so we must await it.
  const { error } = await searchParams

  return (
    // Page wrapper: full-height white background, consistent horizontal padding.
    <div className="min-h-screen bg-white px-6 py-16 md:px-12">
      {/* Content column: max-w-2xl per design system layout spec */}
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Page title — left-aligned (no text-center outside landing) */}
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
          What&apos;s your favorite movie?
        </h1>

        {/* Short description below the heading */}
        <p className="text-sm text-gray-500">
          We&apos;ll generate a fun fact about it each time you visit.
        </p>

        {/* Onboarding form — action wired to the saveMovie server action above */}
        <form action={saveMovie} className="space-y-4">
          <div>
            {/* Input label — text-sm, secondary color per design system */}
            <label
              htmlFor="movie"
              className="block text-sm font-normal text-gray-500 mb-1"
            >
              Movie title
            </label>

            {/* Text input — design system Input component styles */}
            <input
              id="movie"
              name="movie"
              type="text"
              placeholder="e.g. Inception"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />

            {/* Inline validation error — shown when ?error= is present in the URL */}
            {typeof error === "string" && (
              <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
          </div>

          {/* Submit CTA — primary button style per design system */}
          <button
            type="submit"
            className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-gray-700 transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
