import OpenAI from "openai"

// Attach the OpenAI client to Node's global object so it survives
// Next.js hot reloads in development. Without this, every file save
// would create a new client instance unnecessarily.
const globalForOpenAI = globalThis as unknown as { openai: OpenAI }

// Reuse the existing client if one is already attached to global,
// otherwise create a fresh one using the API key from the environment.
export const openai =
  globalForOpenAI.openai ?? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Only cache the client on the global object in development.
// In production the module is loaded once and never reloaded.
if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai
