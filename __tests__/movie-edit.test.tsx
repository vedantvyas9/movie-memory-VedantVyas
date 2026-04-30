/**
 * Tests for the inline movie-edit flow inside DashboardPage.
 *
 * DashboardPage is the only component that owns the edit state — no sub-component
 * was extracted, so these tests render the full page and interact with it via the
 * public UI (buttons, inputs, visible text) rather than testing internal state.
 *
 * Mocking strategy:
 *   - @/lib/api functions (getMe, updateMovie, getFact) → vi.fn() so each test
 *     can control resolve / reject.  ApiError is the REAL class so `instanceof`
 *     checks in the component still work.
 *   - next-auth/react → stub signOut; we never click Sign Out in these tests.
 *   - next/image → return null; our test user has image=null so Image never renders.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getMe, updateMovie, getFact, ApiError } from '@/lib/api'

// ── Module mocks (hoisted above imports by Vitest's transform) ────────────────

// next/image does internal Next.js plumbing that breaks outside the Next.js
// runtime; returning null is fine because our test user has image=null anyway.
vi.mock('next/image', () => ({
  default: () => null,
}))

// next-auth/react requires a server-side session context we don't have in jsdom.
// Only signOut is called by the component; stub it with a no-op.
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

// Keep the real ApiError (so `instanceof ApiError` in the component works) but
// replace the three fetch-wrapping functions with controllable vi.fn() stubs.
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,       // ApiError, types, etc. come through unchanged
    getMe: vi.fn(),
    updateMovie: vi.fn(),
    getFact: vi.fn(),
  }
})

// Import AFTER vi.mock declarations so the component receives the mocked module.
import DashboardPage from '@/app/dashboard/page'

// ── Shared fixtures ───────────────────────────────────────────────────────────

// Minimal user object with a known favoriteMovie for all tests in this suite
const BASE_USER = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  image: null,
  favoriteMovie: 'Inception',
}

// Minimal fact — its content doesn't affect any edit-flow assertion
const BASE_FACT = {
  content: 'The hallway fight in Inception took 3 weeks to film.',
  movie: 'Inception',
  generatedAt: new Date().toISOString(),
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('DashboardPage — inline movie edit', () => {
  beforeEach(() => {
    // Default happy-path mocks; individual tests override where necessary.
    vi.mocked(getMe).mockResolvedValue(BASE_USER)
    vi.mocked(getFact).mockResolvedValue(BASE_FACT)
    // updateMovie default is a no-op resolve; success/failure tests override it.
    vi.mocked(updateMovie).mockResolvedValue({ favoriteMovie: 'Inception' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Test a: edit input appears on "Edit" click ──────────────────────────────

  it('shows edit input on Edit button click', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)

    // Wait for the profile fetch to resolve so the movie section is visible.
    // findBy* has a built-in timeout and fails if the element never appears.
    await screen.findByText('Inception')

    // Enter edit mode
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    // The input must be present and pre-filled with the current movie title
    expect(screen.getByRole('textbox')).toHaveValue('Inception')
  })

  // ── Test b: failed save reverts the movie and shows an error ─────────────────

  it('reverts to original movie on save failure', async () => {
    const user = userEvent.setup()

    // Simulate an unexpected server error during the PUT request
    vi.mocked(updateMovie).mockRejectedValue(new ApiError(500, 'Server error'))

    render(<DashboardPage />)
    await screen.findByText('Inception')

    // Enter edit mode, replace the movie title with a new value
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Dune')

    // Attempt to save — the component applies an optimistic update then reverts
    // on failure (see handleSaveMovie in app/dashboard/page.tsx).
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // Error message is rendered while still in edit mode (edit mode stays open
    // on failure so the user can correct the input without losing their work).
    const errorEl = await screen.findByText('Server error')
    expect(errorEl).toBeInTheDocument()

    // Cancel to exit edit mode; this clears the error and shows the movie text.
    // The displayed movie must be the original "Inception" — not "Dune" — which
    // confirms the optimistic update was correctly rolled back in the catch block.
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Inception')).toBeInTheDocument()
  })

  // ── Test c: successful save updates the displayed movie ──────────────────────

  it('updates displayed movie on save success', async () => {
    const user = userEvent.setup()

    // Server confirms the new title; also prepare getFact for the post-save
    // re-fetch (handleSaveMovie busts the cache and calls getFact after success).
    vi.mocked(updateMovie).mockResolvedValue({ favoriteMovie: 'Dune' })
    vi.mocked(getFact).mockResolvedValue({
      content: 'Dune took four years to adapt.',
      movie: 'Dune',
      generatedAt: new Date().toISOString(),
    })

    render(<DashboardPage />)
    await screen.findByText('Inception')

    // Enter edit mode and type the new title
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Dune')

    // Save — setEditMode(false) is called on success so we leave edit mode
    await user.click(screen.getByRole('button', { name: /Save/i }))

    // After the round-trip completes the display-mode text should show "Dune"
    await waitFor(() => {
      expect(screen.getByText('Dune')).toBeInTheDocument()
    })
  })
})
