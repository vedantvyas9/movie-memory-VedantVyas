# Movie Memory

Movie Memory is a full-stack web app where users sign in with Google, record their favorite movie, and receive an AI-generated fun fact about it. Built as a take-home exercise using Next.js 16 App Router, Prisma, Postgres, NextAuth v5, and OpenAI.

**Variant chosen: B — Frontend/API-Focused (Client Orchestration)**

---

## Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd movie-memory
npm install

# 2. Set environment variables
cp .env.example .env.local
# Fill in all values — see Environment Variables section below

# 3. Create the local Postgres database
createdb movie_memory

# 4. Run migrations and generate the Prisma client
npx prisma migrate dev --name init
npx prisma generate

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Description | Where to get it |
|---|---|---|
| `NEXTAUTH_SECRET` | Secret used to sign session tokens | Run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Base URL of the app | `http://localhost:3000` for local dev |
| `GOOGLE_CLIENT_ID` | OAuth client ID | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Same as above |
| `DATABASE_URL` | Postgres connection string | `postgresql://localhost:5432/movie_memory` |
| `OPENAI_API_KEY` | OpenAI API key | platform.openai.com |

---

## Database Migrations

```bash
# First time
createdb movie_memory
npx prisma migrate dev --name init

# After schema changes
npx prisma migrate dev --name <description>
```

---

## Architecture

### Overview

The app is a single Next.js 16 repository with both the frontend and backend. There is no separate API server — route handlers in `app/api/` serve as the backend. The database is Postgres, accessed via Prisma. Authentication is handled by NextAuth v5 with the Prisma adapter, which automatically syncs Google profile data into the `User` table on every sign-in.

### Directory Layout

```
app/
  api/
    auth/[...nextauth]/route.ts   # NextAuth handler (GET + POST)
    me/route.ts                    # GET /api/me
    me/movie/route.ts              # PUT /api/me/movie
    fact/route.ts                  # GET /api/fact
  components/
    Providers.tsx                  # SessionProvider wrapper (client)
    SignInButton.tsx                # Google sign-in button (client)
  dashboard/page.tsx               # Main dashboard (client component)
  onboarding/page.tsx              # First-time movie entry (server action)
  page.tsx                         # Landing / redirect hub (server component)
  layout.tsx                       # Root layout — Inter font + providers
lib/
  auth.ts                          # NextAuth v5 config
  db.ts                            # Prisma client singleton
  api.ts                           # Typed API client (Variant B core)
  openai.ts                        # OpenAI client singleton
prisma/schema.prisma
proxy.ts                           # Route protection (Next.js 16 — replaces middleware.ts)
__tests__/
  api-client.test.ts
  movie-edit.test.tsx
```

> **Note:** Next.js 16 deprecates `middleware.ts` in favour of `proxy.ts`. The route guard lives in `proxy.ts` and uses the same NextAuth `auth()` integration.

### Data Model

Two application models:

**`User`** — created by the NextAuth Prisma adapter on first sign-in. `favoriteMovie` is nullable; `null` means the user has not completed onboarding.

**`Fact`** — one row per generated fact. Stores `movie` (snapshot of the title at generation time) so facts remain coherent if the user later changes their favorite movie.

```
User 1──* Fact   (Fact.userId → User.id)
```

### Request Flow

```
Browser                  Next.js (Edge/Node)           External
   │                            │                          │
   │  GET /                     │                          │
   │◄── landing page ───────────│                          │
   │                            │                          │
   │  signIn("google") ─────────┼──── OAuth redirect ─────►│ Google
   │                            │◄─── id_token ────────────│
   │                            │  upsert User in DB        │
   │◄── session cookie ─────────│                          │
   │                            │                          │
   │  GET /dashboard ───────────►  proxy.ts checks session  │
   │                            │  auth() + DB lookup       │
   │◄── dashboard page ─────────│                          │
   │                            │                          │
   │  GET /api/fact ────────────►  auth() → DB → OpenAI ───►│ OpenAI
   │◄── { content, movie, … } ──│◄── completion ───────────│
```

### API Routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/me` | Current user profile |
| `PUT` | `/api/me/movie` | Update favorite movie (validated server-side) |
| `GET` | `/api/fact` | Generate + store a fun fact via OpenAI |

All routes return `{ error: string }` on failure. The typed client in `lib/api.ts` normalises every non-2xx response into an `ApiError` (with a `.status` field) so the dashboard never inspects `response.ok` directly.

### Client-Side Fact Cache

The dashboard holds a module-level cache (`_factCache`) that survives client-side navigation. The cache enforces a 30-second rate limit on OpenAI calls:

| Trigger | Client cache | Server |
|---|---|---|
| Page load / back navigation | served from module cache | returns stored DB fact |
| "Get new fact" within 30s | returns cached fact, no call | — |
| "Get new fact" after 30s | cache expired, calls server | generates new fact via OpenAI, stores it |
| Movie changed | cache cleared | generates new fact via OpenAI, stores it |

The 30-second window applies even to explicit "Get new fact" clicks — the button is rate-limited, not a cache bypass. This prevents users from spamming OpenAI calls by clicking the button repeatedly. Changing the favorite movie always clears the cache and triggers a fresh generation regardless of the window.

---

## Variant B — Why

Variant B required three things that are more interesting to implement correctly than the Variant A caching problems:

1. **Typed API contracts** — every request/response shape is declared in `lib/api.ts`, so TypeScript catches shape mismatches at compile time rather than at runtime.
2. **Optimistic UI with rollback** — the inline movie edit updates the UI immediately and reverts silently on failure, which requires careful state management around the "previous value."
3. **Cache invalidation** — the 30-second fact cache must be cleared exactly when the movie changes, not earlier and not later. Getting the invalidation boundary right is the core engineering problem.

---

## Key Tradeoffs

**Plain `useState` + module-level cache vs SWR / React Query**
SWR would have handled deduplication, revalidation, and cache TTLs automatically. Plain state was chosen because the caching requirement is narrow (one resource, one TTL, one invalidation trigger) and adding SWR would have introduced a dependency to solve a problem that fits in ~15 lines of code. The tradeoff is that the cache logic lives in the component rather than in a data-fetching library, which is less conventional but easier to reason about for this scope.

**`favoriteMovie` as a nullable column on `User` vs a separate table**
A separate table would make sense if a user could have multiple movies or a history. Here it's strictly 1:1, and `null` gives us the "not onboarded" signal for free without a separate status flag or join.

**Client-side 30s cache vs server-side cache**
The spec calls for client-side caching. A server-side cache (Redis or DB-level TTL) would eliminate duplicate OpenAI calls across devices and browser tabs, but would add infrastructure complexity. The client cache is the right fit for this scope and is easy to verify in the browser's Network tab.

**30s window applies to explicit requests, not just auto-fetches**
The "Get new fact" button is rate-limited by the same 30-second client cache — it does not bypass it. This prevents OpenAI call spam at the cost of the user having to wait up to 30 seconds between new facts. The server route itself is stateless; rate enforcement lives entirely on the client.

---

## What I Would Improve With 2 More Hours

- **Fact history view** — every generated fact is stored in the `Fact` table but never surfaced in the UI. A simple list of past facts on the dashboard would make that data useful.
- **Streaming OpenAI responses** — using `ReadableStream` to stream the fact token-by-token would make the UI feel faster without changing the architecture significantly.

---

## AI Usage

```
┌─────────────────────────────────────────────────────────────────┐
│                     Development Workflow                        │
└─────────────────────────────────────────────────────────────────┘

  [Human] Read spec PDF
      │
      ▼
  [Claude] Generate arch/ docs          ← design decisions, data model,
      │     + plan.md                      API contracts, issue breakdown
      │
      ▼
  [Human] Review arch/ + plan.md        ← verified correctness, removed
      │     Audit against spec              over-engineering, added design system
      │
      ▼
  [Human] Create GitHub issues          ← gh issue create (from plan.md commands)
      │
      ▼
  [Claude agents] Implement issues
      │
      ├── Phase 1 (sequential)
      │     Issue 1: deps + schema ──► Issue 2: auth pages
      │
      ├── Phase 2 (parallel)
      │     Issue 3: API routes  ║  Issue 4: typed client
      │
      └── Phase 3 (sequential)
            Issue 5: dashboard ──► Issue 6: tests ──► Issue 7: README
      │
      ▼
  [Human] Verify each agent output      ← checked summary against spec,
      │     before merging PR              confirmed no hallucinations
      │
      ▼
  [gstack /review]  Pre-merge diff review
  [gstack /cso]     OWASP security scan
  [gstack /ship]    Final check + PR
```

- All design decisions, tradeoffs, and architecture choices are my own
- Every agent output was reviewed manually before committing
- The spec requirements were checked against the plan before any code was written
