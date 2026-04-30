import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/me — returns the current user's profile from the database.
// The user ID is always sourced from the server-side session; it is never
// read from the request, so one user cannot access another's profile.
export async function GET() {
  // Retrieve the session from the request cookie via NextAuth.
  // Returns null if the user is not signed in.
  const session = await auth()

  // Reject unauthenticated requests immediately.
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch the user record from the database using only the fields the client
  // needs. Selecting specific fields avoids leaking internal columns.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      favoriteMovie: true,
    },
  })

  // If the user row is somehow missing (e.g. deleted between sign-in and this
  // request), treat it as unauthorized rather than returning an empty object.
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Return the user profile. `name`, `image`, and `favoriteMovie` may be null;
  // the client is expected to handle those cases gracefully.
  return NextResponse.json(user, { status: 200 })
}
