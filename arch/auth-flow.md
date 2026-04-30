# Auth Flow

## Provider
Google OAuth 2.0 via NextAuth v5 (Auth.js). The Prisma adapter handles `User`, `Account`, and `Session` persistence automatically.

## OAuth Sequence

```
Browser             Next.js App          Google OAuth
   |                    |                    |
   | GET /              |                    |
   |<-- landing page -- |                    |
   |                    |                    |
   | "Sign in" click    |                    |
   |-- signIn("google")-|                    |
   |                    |-- redirect ------->|
   |                    |<-- auth code ------ |
   |                    |-- exchange token -->|
   |                    |<-- id_token ------- |
   |                    |                    |
   |                    | upsert User in DB  |
   |                    | set session cookie |
   |                    |                    |
   |<-- redirect to --- |                    |
   |   /onboarding or   |                    |
   |   /dashboard       |                    |
```

## Routing Logic

| Path | Condition | Action |
|------|-----------|--------|
| `/` | unauthenticated | render landing page |
| `/` | authenticated, `favoriteMovie === null` | `redirect('/onboarding')` |
| `/` | authenticated, `favoriteMovie` set | `redirect('/dashboard')` |
| `/onboarding` | unauthenticated | `redirect('/')` |
| `/onboarding` | `favoriteMovie` already set | `redirect('/dashboard')` |
| `/dashboard` | unauthenticated | `redirect('/')` |

## Middleware (`middleware.ts`)

Runs before rendering on `/dashboard` and `/onboarding`. Uses NextAuth's `auth` export to read the session from the request cookie. Redirects unauthenticated users to `/` without hitting the DB.

```
matcher: ['/dashboard', '/onboarding']
```

The landing page `/` is a server component that additionally checks `favoriteMovie` against the DB (one extra query) to decide whether to show the page or redirect. Middleware only checks authentication — the movie-null check happens in the page itself to avoid a DB call in middleware on every request.

## Onboarding Server Action

Defined in `app/onboarding/page.tsx` as a Next.js Server Action:

1. Call `auth()` — assert session exists
2. Parse and validate `movie`: trim, assert length 1–100
3. `db.user.update({ where: { id: session.user.id }, data: { favoriteMovie: movie } })`
4. `redirect('/dashboard')`

Validation error: re-render the form with an inline error message (no client JS required).

## Session Extension

NextAuth's `session` callback is used to attach `user.id` (DB primary key) to the session object, since by default only `name`, `email`, and `image` are included from the Google profile.

```ts
// in lib/auth.ts
callbacks: {
  session({ session, user }) {
    session.user.id = user.id
    return session
  }
}
```

## NextAuth v5 API Notes

- Use `auth()` (not `getServerSession()`) in Server Components and API routes
- Use `signIn` / `signOut` from `next-auth/react` in Client Components
- The catch-all route is `app/api/auth/[...nextauth]/route.ts` exporting `{ GET, POST }` from the handlers
- **IMPORTANT:** Before writing any auth code, read `node_modules/next/dist/docs/` for this specific Next.js version's App Router conventions.
