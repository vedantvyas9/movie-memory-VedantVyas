# Architecture Overview

## Variant
**Variant B — Frontend/API-Focused (Client Orchestration)**

## Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 16 App Router | Required; RSC + API routes in one repo, no separate server |
| Auth | NextAuth v5 (Auth.js) | First-class App Router support; Google provider built-in; Prisma adapter handles DB sync |
| DB ORM | Prisma + Postgres | Required; type-safe queries; migration tooling |
| AI | OpenAI `gpt-4o-mini` | Cheap, fast, sufficient for one-sentence fun-fact generation |
| Styling | TailwindCSS | Required |
| Testing | Vitest + React Testing Library | Fast ESM-native runner; no Babel config needed |

## Directory Layout

```
app/
  api/
    auth/[...nextauth]/route.ts   # NextAuth catch-all handler
    me/route.ts                    # GET /api/me
    me/movie/route.ts              # PUT /api/me/movie
    fact/route.ts                  # GET /api/fact
  dashboard/
    page.tsx                       # Main dashboard (client component)
  onboarding/
    page.tsx                       # First-time movie entry (server action)
  page.tsx                         # Landing / redirect hub
  layout.tsx                       # Root layout with SessionProvider
lib/
  auth.ts                          # NextAuth config (Google provider + Prisma adapter)
  db.ts                            # Prisma client singleton
  api.ts                           # Typed client wrapper (Variant B core)
  openai.ts                        # OpenAI client singleton
prisma/
  schema.prisma
middleware.ts                      # Session-based route protection
__tests__/
  api-client.test.ts               # API client error handling
  movie-edit.test.ts               # Optimistic update + revert behavior
```

## Key Design Decisions

**`favoriteMovie` on `User` (not a join table)**
It's a 1:1 scalar. `null` cleanly signals "not yet onboarded" without a separate status enum or table. Querying it is a single column read on an already-loaded row.

**No external cache (no Redis)**
Variant B specifies client-side caching. A 30-second `useState` cache with timestamp is sufficient and keeps infrastructure minimal.

**No SWR / React Query**
Plain `useState` + `useEffect` handles the 30s window without additional dependencies. The caching logic is ~10 lines and easy to reason about.

**OpenAI server-side only**
`lib/openai.ts` is imported only in `app/api/fact/route.ts`. The API key never touches the client bundle.

**All API routes scope by `session.user.id`**
Every DB query includes a `where: { userId: session.user.id }` clause. The session comes from `auth()` on the server — never from request params.

**Fact stores movie title at generation time**
If the user later edits their favorite movie, historical facts remain coherent — they're attributable to the movie they were about, not the current movie.
