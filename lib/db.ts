import { PrismaClient } from "@prisma/client"

// Attach the Prisma client to Node's global object so it survives
// Next.js hot reloads in development. Without this, every file save
// would create a new database connection, quickly exhausting the pool.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Reuse the existing client if one is already attached to global,
// otherwise create a fresh one. In production there are no hot reloads
// so a new client is always created (and only once).
export const db =
  globalForPrisma.prisma ?? new PrismaClient()

// Only cache the client on the global object in development.
// In production we skip this — the module is loaded once and never reloaded.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
