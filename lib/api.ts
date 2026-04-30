// Response types matching the shapes documented in arch/api-routes.md.
// All nullable fields reflect real nullability in the database schema.

export type MeResponse = {
  id: string
  name: string | null
  email: string
  image: string | null
  favoriteMovie: string | null
}

export type UpdateMovieResponse = {
  favoriteMovie: string
}

export type FactResponse = {
  content: string
  movie: string
  generatedAt: string
}

// ApiError is thrown for any non-2xx response.
// Callers use `instanceof ApiError` to distinguish API failures from network errors,
// and inspect `.status` to branch on 401 vs 400 vs 500.
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// Private fetch helper. Sets Content-Type automatically and normalises every
// non-2xx response into a thrown ApiError so callers never have to inspect
// response.ok themselves.
async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    // All error responses follow the shape { error: string } per arch/api-routes.md.
    const body = await response.json() as { error?: string }
    throw new ApiError(response.status, body.error ?? response.statusText)
  }

  return response.json() as Promise<T>
}

// Fetch the current authenticated user's profile.
// Returns null-safe fields — callers must handle name/image/favoriteMovie being null.
export async function getMe(): Promise<MeResponse> {
  return request<MeResponse>('/api/me')
}

// Update the current user's favorite movie.
// The server trims and validates the title (1–100 chars); throws ApiError(400) on failure.
export async function updateMovie(movie: string): Promise<UpdateMovieResponse> {
  return request<UpdateMovieResponse>('/api/me/movie', {
    method: 'PUT',
    body: JSON.stringify({ movie }),
  })
}

// Generate and return a fun fact about the current user's favorite movie.
// Pass force=true to bypass the DB cache and always call OpenAI (used by "Get new fact").
// Throws ApiError(400) if no favorite movie is set, ApiError(500) on OpenAI failure.
export async function getFact(force = false): Promise<FactResponse> {
  return request<FactResponse>(force ? '/api/fact?force=true' : '/api/fact')
}
