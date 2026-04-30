// Root layout — wraps every page in the app.
// Applies the Inter font (design system) and the SessionProvider (for client components).
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./components/Providers"

// Load Inter with only the three weights the design system uses.
// Unused weights are excluded to avoid loading unnecessary font files.
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "600"] })

export const metadata: Metadata = {
  title: "Movie Memory",
  description: "Track the films that moved you.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // Apply Inter font class to <html> so all text inherits it.
    // antialiased smooths font rendering on all platforms.
    <html lang="en" className={`${inter.className} antialiased`}>
      {/* Providers wraps children with SessionProvider so client components
          (e.g. SignInButton) can call useSession() to access the current session. */}
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
