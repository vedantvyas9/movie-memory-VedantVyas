import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { openai } from "@/lib/openai"

// GET /api/fact — generate a fun fact about the user's favorite movie via
// OpenAI and persist the result to the Fact table for history.
export async function GET() {
  // Retrieve the session from the request cookie via NextAuth.
  const session = await auth()

  // Reject unauthenticated requests immediately.
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch only the favoriteMovie field to minimise the data read from the DB.
  // Filtering by session.user.id ensures we never read another user's data.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { favoriteMovie: true },
  })

  // A null favoriteMovie means the user hasn't completed onboarding yet.
  // We cannot generate a fact without a movie title, so return 400.
  if (!user?.favoriteMovie) {
    return NextResponse.json(
      { error: "No favorite movie set. Please complete onboarding." },
      { status: 400 }
    )
  }

  const movie = user.favoriteMovie

  // Call the OpenAI Chat Completions API to generate a single fun fact.
  // If the call fails for any reason (network error, quota exceeded, etc.),
  // catch and return a user-friendly 500 rather than leaking stack traces.
  let content: string
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Give me one fun, surprising fact about the movie "${movie}". Keep it under 2 sentences. Do not start with "Did you know".`,
        },
      ],
      max_tokens: 150,
    })

    // Extract the text from the first (and only) completion choice.
    // The non-null assertion is safe: the API always returns at least one choice.
    content = completion.choices[0].message.content!
  } catch {
    return NextResponse.json(
      { error: "Failed to generate a fact. Please try again." },
      { status: 500 }
    )
  }

  // Persist the generated fact. Storing the movie title as a snapshot means
  // historical facts remain attributable to the movie they were about, even if
  // the user later changes their favorite movie.
  const fact = await db.fact.create({
    data: {
      userId: session.user.id,
      movie,
      content,
    },
  })

  // Return the fact shape expected by the typed client in lib/api.ts.
  return NextResponse.json(
    {
      content: fact.content,
      movie: fact.movie,
      generatedAt: fact.createdAt.toISOString(),
    },
    { status: 200 }
  )
}
