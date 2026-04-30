"use client"

// Dashboard is a Client Component — it owns all interactive state: user profile,
// inline movie edit (with optimistic update), and a 30-second client-side fact cache.
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { signOut } from "next-auth/react"
import {
  getMe,
  updateMovie,
  getFact,
  ApiError,
  type MeResponse,
  type FactResponse,
} from "@/lib/api"

// Module-level cache — lives outside the component so it survives back/forward
// navigation within the same browser tab. Without this, every navigation remounts
// the component and re-fetches from scratch, causing a loading flash and an
// unnecessary OpenAI call on every page visit.
// Cleared implicitly when the user signs out (signOut triggers a full page reload).
let _userCache: MeResponse | null = null
let _factCache: { data: FactResponse; at: number } | null = null

export default function DashboardPage() {
  // ── User profile ─────────────────────────────────────────────────────────────
  // Initialise from module cache so returning to this page skips the loading state.
  const [user, setUser] = useState<MeResponse | null>(_userCache)
  const [userLoading, setUserLoading] = useState(_userCache === null)
  const [userError, setUserError] = useState<string | null>(null)

  // ── Inline movie edit ─────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [movieSaving, setMovieSaving] = useState(false)
  const [movieError, setMovieError] = useState<string | null>(null)

  // ── Fact cache ────────────────────────────────────────────────────────────────
  // Restore fact from module cache if still within the 30-second window.
  const factFromCache =
    _factCache && Date.now() - _factCache.at < 30_000 ? _factCache.data : null
  const [fact, setFact] = useState<FactResponse | null>(factFromCache)
  const [factLoading, setFactLoading] = useState(false)
  const [factError, setFactError] = useState<string | null>(null)
  // Ref keeps the timestamp stable across renders so callbacks never see a stale value.
  const cachedAtRef = useRef<number | null>(factFromCache ? _factCache!.at : null)

  // ── Mount: fetch user profile and initial fact in parallel ────────────────────
  useEffect(() => {
    // Cancellation flag prevents state updates after the component unmounts
    // (handles React 18 strict-mode double-invocation in development).
    let cancelled = false

    async function fetchUser() {
      setUserLoading(true)
      try {
        const me = await getMe()
        if (!cancelled) {
          _userCache = me  // persist to module cache for next navigation
          setUser(me)
        }
      } catch (err) {
        if (!cancelled)
          setUserError(err instanceof ApiError ? err.message : "Failed to load profile.")
      } finally {
        if (!cancelled) setUserLoading(false)
      }
    }

    async function fetchFactOnMount() {
      setFactLoading(true)
      setFactError(null)
      try {
        const result = await getFact()
        if (!cancelled) {
          _factCache = { data: result, at: Date.now() }  // persist to module cache
          setFact(result)
          cachedAtRef.current = Date.now()
        }
      } catch (err) {
        if (!cancelled)
          setFactError(err instanceof ApiError ? err.message : "Failed to load fact.")
      } finally {
        if (!cancelled) setFactLoading(false)
      }
    }

    // Skip fetches when module cache already has fresh data — prevents redundant
    // network calls and loading states on back/forward navigation.
    if (!_userCache) {
      fetchUser()
    }

    if (!_factCache || Date.now() - _factCache.at >= 30_000) {
      fetchFactOnMount()
    }

    return () => {
      cancelled = true
    }
  }, [])

  // ── Fetch fact on demand (cache-aware) ────────────────────────────────────────
  // force=false: respect the 30-second window. force=true: always go to server.
  async function handleGetFact(force: boolean) {
    if (
      !force &&
      cachedAtRef.current !== null &&
      Date.now() - cachedAtRef.current < 30_000
    ) {
      return // still within the 30-second window
    }
    setFactLoading(true)
    setFactError(null)
    try {
      // force=true bypasses the server-side DB cache so a new OpenAI fact is generated.
      const result = await getFact(true)
      _factCache = { data: result, at: Date.now() }  // update module cache
      setFact(result)
      cachedAtRef.current = Date.now()
    } catch (err) {
      setFactError(err instanceof ApiError ? err.message : "Failed to load fact.")
    } finally {
      setFactLoading(false)
    }
  }

  // ── Enter edit mode ───────────────────────────────────────────────────────────
  function handleEditClick() {
    setEditValue(user?.favoriteMovie ?? "")
    setMovieError(null)
    setEditMode(true)
  }

  // ── Cancel edit ───────────────────────────────────────────────────────────────
  function handleCancelEdit() {
    setEditMode(false)
    setMovieError(null)
  }

  // ── Save movie with optimistic update + revert on failure ─────────────────────
  async function handleSaveMovie() {
    const trimmed = editValue.trim()
    // Snapshot the current value so we can revert if the API call fails.
    const previous = user?.favoriteMovie ?? null

    // Optimistically apply the new value before the round-trip completes.
    setUser((prev) => (prev ? { ...prev, favoriteMovie: trimmed } : prev))
    setMovieSaving(true)
    setMovieError(null)

    try {
      const result = await updateMovie(trimmed)
      // Server confirmed — lock in the canonical value and update module cache.
      setUser((prev) => {
        const updated = prev ? { ...prev, favoriteMovie: result.favoriteMovie } : prev
        if (updated) _userCache = updated
        return updated
      })
      setEditMode(false)
      // Only bust the fact cache when the movie actually changed; if the user
      // saved the same title, the existing fact is still accurate.
      if (result.favoriteMovie !== previous) {
        _factCache = null  // invalidate module cache so next navigation re-fetches
        setFact(null)
        cachedAtRef.current = null
        await handleGetFact(false)
      }
    } catch (err) {
      // Revert to the previous movie name, keep edit mode open, show the error.
      setUser((prev) => (prev ? { ...prev, favoriteMovie: previous } : prev))
      setMovieError(err instanceof ApiError ? err.message : "Failed to update movie.")
    } finally {
      setMovieSaving(false)
    }
  }

  // ── Full-page loading ─────────────────────────────────────────────────────────
  if (userLoading) {
    return (
      <div className="min-h-screen bg-white px-6 py-16 md:px-12">
        <div className="max-w-2xl mx-auto">
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    )
  }

  // ── Full-page error ───────────────────────────────────────────────────────────
  if (userError || !user) {
    return (
      <div className="min-h-screen bg-white px-6 py-16 md:px-12">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-red-600">{userError ?? "Unable to load your profile."}</p>
        </div>
      </div>
    )
  }

  // Destructure after null-guard above so TypeScript narrows the type.
  const { name, email, image, favoriteMovie } = user
  const displayName = name ?? "Anonymous"
  // Avatar initial: prefer name, fall back to email initial, then '?'
  const avatarInitial = (name ?? email ?? "?")[0].toUpperCase()

  return (
    <div className="min-h-screen bg-white px-6 py-16 md:px-12">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* ── 1. User row: avatar + name/email + sign out ─────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Profile image with initials fallback per design.md avatar spec */}
            {image ? (
              <Image
                src={image}
                alt={displayName}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-semibold">
                {avatarInitial}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-gray-900">{displayName}</p>
              <p className="text-sm text-gray-500">{email}</p>
            </div>
          </div>
          {/* Ghost sign-out link, right-aligned in the user row per design spec */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600"
          >
            Sign out
          </button>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────────────── */}
        <div className="border-b border-gray-100" />

        {/* ── 2. Movie section ─────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Favorite movie</p>

          {editMode ? (
            // Edit mode: text input + Save (primary) + Cancel (ghost)
            <div className="space-y-3">
              <input
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Enter your favorite movie"
                maxLength={100}
                disabled={movieSaving}
                autoFocus
              />
              {/* Inline error shown only on API failure — stays until user edits or cancels */}
              {movieError && (
                <p className="text-sm text-red-600">{movieError}</p>
              )}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveMovie}
                  disabled={movieSaving}
                  className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {movieSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={movieSaving}
                  className="text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Display mode: movie title (xl, semibold) + inline Edit ghost button
            <div className="flex items-baseline gap-4">
              {favoriteMovie ? (
                <p className="text-xl font-semibold text-gray-900">{favoriteMovie}</p>
              ) : (
                <p className="text-xl font-semibold text-gray-400 italic">Not set</p>
              )}
              <button
                onClick={handleEditClick}
                className="text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* ── Divider ─────────────────────────────────────────────────────────── */}
        <div className="border-b border-gray-100" />

        {/* ── 3. Fact section ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Fun fact</p>

          {/* Fact content area — one of: loading / error / fact / empty placeholder */}
          {factLoading ? (
            <span className="text-sm text-gray-400">Loading...</span>
          ) : factError ? (
            <p className="text-sm text-red-600">{factError}</p>
          ) : fact ? (
            <div className="space-y-2">
              <p className="text-base font-light text-gray-700">{fact.content}</p>
              <p className="text-xs text-gray-400">
                About: {fact.movie}&nbsp;&middot;&nbsp;Generated at:{" "}
                {new Date(fact.generatedAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No fact yet — click &ldquo;Get new fact&rdquo; to generate one.
            </p>
          )}

          {/* Respects the 30-second cache — goes to server only when the window has expired */}
          <button
            onClick={() => handleGetFact(false)}
            disabled={factLoading}
            className="text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600 disabled:opacity-50"
          >
            Get new fact
          </button>
        </div>

      </div>
    </div>
  )
}
