import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// PUT /api/me/movie — update the current user's favorite movie.
// The update is scoped to session.user.id, so a user can never overwrite
// another user's record even if they manipulate the request.
export async function PUT(request: NextRequest) {
  // Retrieve the session from the request cookie via NextAuth.
  const session = await auth()

  // Reject unauthenticated requests immediately.
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse the request body as JSON. If the body is missing or malformed
  // (not valid JSON), the parse will throw and we return a 400.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    )
  }

  // Extract the movie field and verify it is a string before trimming.
  // Using `typeof` guards against null, numbers, arrays, and other non-strings.
  const raw = (body as Record<string, unknown>)?.movie
  if (typeof raw !== "string") {
    return NextResponse.json(
      { error: "Movie title must be between 1 and 100 characters." },
      { status: 400 }
    )
  }

  // Trim leading/trailing whitespace, then enforce the 1–100 character limit.
  const trimmed = raw.trim()
  if (trimmed.length < 1 || trimmed.length > 100) {
    return NextResponse.json(
      { error: "Movie title must be between 1 and 100 characters." },
      { status: 400 }
    )
  }

  // Persist the validated title. Filtering by session.user.id guarantees that
  // only the authenticated user's row is updated.
  await db.user.update({
    where: { id: session.user.id },
    data: { favoriteMovie: trimmed },
  })

  // Return the saved title so the client can update its local state
  // without requiring a follow-up GET request.
  return NextResponse.json({ favoriteMovie: trimmed }, { status: 200 })
}
