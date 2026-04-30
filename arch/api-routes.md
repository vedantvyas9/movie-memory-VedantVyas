# API Routes

All routes require an authenticated session. Unauthenticated requests return `401 { "error": "Unauthorized" }`.

---

## GET /api/me

Returns the current user's profile from the database.

**Auth:** required  
**Method:** GET

**Response 200:**
```json
{
  "id": "clxxxxxxx",
  "name": "Vedant Vyas",
  "email": "user@example.com",
  "image": "https://lh3.googleusercontent.com/...",
  "favoriteMovie": "Inception"
}
```

Notes:
- `image` may be `null` — client must handle gracefully (show initials fallback)
- `name` may be `null` — client must handle gracefully
- `favoriteMovie` may be `null` — user has not completed onboarding

---

## PUT /api/me/movie

Update the current user's favorite movie. Invalidates the fact cache on the client.

**Auth:** required  
**Method:** PUT  
**Content-Type:** application/json

**Request body:**
```json
{ "movie": "The Dark Knight" }
```

**Server-side validation:**
1. Parse body as JSON
2. Assert `movie` is a string
3. Trim whitespace
4. Assert length ≥ 1 and ≤ 100 characters

**Response 200:**
```json
{ "favoriteMovie": "The Dark Knight" }
```

**Response 400 (validation failure):**
```json
{ "error": "Movie title must be between 1 and 100 characters." }
```

**Response 400 (bad body):**
```json
{ "error": "Invalid request body." }
```

---

## GET /api/fact

Generate a fun fact about the current user's favorite movie via OpenAI. Stores the result in the `Fact` table.

**Auth:** required  
**Method:** GET

**Precondition:** `User.favoriteMovie` must not be null.

**OpenAI prompt:**
```
Give me one fun, surprising fact about the movie "{movie}". 
Keep it under 2 sentences. Do not start with "Did you know".
```

**Model:** `gpt-4o-mini`

**Response 200:**
```json
{
  "content": "The hallway fight scene in Inception took 3 weeks to film and used a real rotating set.",
  "movie": "Inception",
  "generatedAt": "2026-04-29T12:00:00.000Z"
}
```

**Response 400 (no movie set):**
```json
{ "error": "No favorite movie set. Please complete onboarding." }
```

**Response 500 (OpenAI failure):**
```json
{ "error": "Failed to generate a fact. Please try again." }
```

---

## Error Shape (all routes)

Every non-2xx response is a JSON object:
```json
{ "error": "<human-readable string>" }
```

The typed client in `lib/api.ts` parses all non-2xx responses and throws an `ApiError`:
```ts
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
```

---

## Typed Client (`lib/api.ts`)

The client wraps `fetch` with:
- Base URL from `process.env.NEXT_PUBLIC_APP_URL` (or relative paths — relative is fine for same-origin)
- Typed request/response interfaces for each endpoint
- Non-2xx responses parsed and thrown as `ApiError`
- No auth tokens in client code — cookies are sent automatically (same-origin)

```ts
// Exported functions:
getMe(): Promise<MeResponse>
updateMovie(movie: string): Promise<UpdateMovieResponse>
getFact(): Promise<FactResponse>
```

---

## Security Guarantees

| Route | Guarantee |
|-------|-----------|
| All | `session.user.id` sourced from server-side `auth()` call, never from request |
| `PUT /api/me/movie` | `db.user.update({ where: { id: session.user.id } })` — cannot update other users |
| `GET /api/fact` | `db.fact.create({ data: { userId: session.user.id } })` — scoped to caller |
| All | OpenAI API key accessed via `process.env.OPENAI_API_KEY` server-side only |
