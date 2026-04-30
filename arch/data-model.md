# Data Model

## Database
**Local Postgres** running on the developer's machine.

```
DATABASE_URL="postgresql://localhost:5432/movie_memory"
```

Create the database before running migrations:
```bash
createdb movie_memory
# or via psql: CREATE DATABASE movie_memory;
```

Then run:
```bash
npx prisma migrate dev --name init
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// NextAuth v5 Prisma adapter models (Account, Session, VerificationToken)
// are added automatically — see @auth/prisma-adapter docs.

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  googleId      String?   @unique  // populated by NextAuth adapter
  favoriteMovie String?             // null = not yet onboarded
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  facts         Fact[]
  accounts      Account[]
  sessions      Session[]
}

model Fact {
  id        String   @id @default(cuid())
  userId    String
  movie     String   // snapshot of User.favoriteMovie at generation time
  content   String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
}

// NextAuth required models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

## Entity Relationships

```
User 1──* Fact      (user.id → fact.userId)
User 1──* Account   (managed by NextAuth adapter)
User 1──* Session   (managed by NextAuth adapter)
```

## Design Rationale

### `User.favoriteMovie` is nullable
`null` is the "not yet onboarded" sentinel. No separate status flag needed. Auth redirect logic becomes: `if (!user.favoriteMovie) redirect('/onboarding')`.

### `Fact.movie` stores the title at generation time
User can later change their favorite movie. Historical facts remain attributable to the movie they were actually about. This also means `GET /api/fact` can display "fact about [Fact.movie]" rather than "[User.favoriteMovie]" if they diverge.

### `@@index([userId, createdAt])`
`GET /api/fact` runs `findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })` to retrieve the most recent fact. Without this index that's a full table scan on `Fact`.

### NextAuth adapter models
`@auth/prisma-adapter` requires `Account`, `Session`, and `VerificationToken` models. They're included in schema explicitly (rather than relying on the adapter to auto-create them) so migrations are fully version-controlled.

## Validation Rules (server-side, applies to all writes)

| Field | Rule |
|-------|------|
| `User.favoriteMovie` | `trim()`, min 1 char, max 100 chars |
