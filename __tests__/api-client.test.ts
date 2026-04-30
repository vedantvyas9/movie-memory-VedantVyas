/**
 * Tests for the typed API client in lib/api.ts.
 *
 * Strategy: mock global.fetch so we can control every response without a
 * running server.  The tests verify that the `request` helper inside api.ts
 * correctly converts non-2xx responses into thrown ApiErrors with the right
 * status code and message, and that successful responses are returned as-is.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { getMe, updateMovie, getFact, ApiError } from '@/lib/api'

// Helper that builds a minimal Response-like object accepted by the fetch mock.
// Only the fields that lib/api.ts actually reads (ok, status, json) are needed.
function mockFetchResponse(
  status: number,
  ok: boolean,
  body: Record<string, unknown>,
): Response {
  return {
    status,
    ok,
    json: async () => body,
  } as unknown as Response
}

describe('API client', () => {
  // Restore the real fetch after each test so mocks don't bleed across tests
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── getMe ────────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('throws ApiError with status 401 on unauthorized response', async () => {
      // Simulate a 401 coming back from GET /api/me (unauthenticated session)
      vi.spyOn(global, 'fetch').mockResolvedValue(
        mockFetchResponse(401, false, { error: 'Unauthorized' }),
      )

      let caught: unknown
      try {
        await getMe()
      } catch (e) {
        caught = e
      }

      // Must be the typed ApiError so callers can branch on instanceof
      expect(caught).toBeInstanceOf(ApiError)
      // Status code drives UI branching (redirect to login on 401)
      expect((caught as ApiError).status).toBe(401)
      // Message comes verbatim from the { error: "..." } response body
      expect((caught as ApiError).message).toBe('Unauthorized')
    })

    it('throws ApiError with status 500 on server error', async () => {
      // Simulate an unexpected server crash (e.g. database connection failure)
      vi.spyOn(global, 'fetch').mockResolvedValue(
        mockFetchResponse(500, false, { error: 'Internal server error' }),
      )

      let caught: unknown
      try {
        await getMe()
      } catch (e) {
        caught = e
      }

      expect(caught).toBeInstanceOf(ApiError)
      expect((caught as ApiError).status).toBe(500)
    })
  })

  // ── updateMovie ──────────────────────────────────────────────────────────────

  describe('updateMovie', () => {
    it('returns favoriteMovie on success', async () => {
      // Server echoes back the trimmed, validated movie title on 200
      vi.spyOn(global, 'fetch').mockResolvedValue(
        mockFetchResponse(200, true, { favoriteMovie: 'Dune' }),
      )

      const result = await updateMovie('Dune')

      // The caller uses result.favoriteMovie to update local state
      expect(result.favoriteMovie).toBe('Dune')
    })
  })

  // ── getFact ──────────────────────────────────────────────────────────────────

  describe('getFact', () => {
    it('throws ApiError on 500 (OpenAI failure)', async () => {
      // OpenAI can fail intermittently; the route returns 500 in that case
      vi.spyOn(global, 'fetch').mockResolvedValue(
        mockFetchResponse(500, false, {
          error: 'Failed to generate a fact. Please try again.',
        }),
      )

      let caught: unknown
      try {
        await getFact()
      } catch (e) {
        caught = e
      }

      expect(caught).toBeInstanceOf(ApiError)
      expect((caught as ApiError).status).toBe(500)
      expect((caught as ApiError).message).toBe(
        'Failed to generate a fact. Please try again.',
      )
    })
  })
})
