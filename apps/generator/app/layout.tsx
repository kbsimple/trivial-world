import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

/**
 * Root layout for Question Generator Web App
 * Per D-04: Next.js App Router for generator web app
 * Per UI-SPEC: Dark theme default, Inter font, consistent with mobile app
 */
export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Trivial World — Question Generator</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {/* Header with navigation per UI-SPEC */}
        <header className="flex items-center justify-between p-4 border-b border-card">
          <h1 className="text-2xl font-bold">
            Question Generator
          </h1>

          {/* Navigation links per UI-SPEC */}
          <nav className="flex gap-4">
            <Link
              href="/review"
              className="text-base font-semibold hover:text-primary transition-colors"
            >
              Review
            </Link>
            <Link
              href="/packs"
              className="text-base font-semibold hover:text-primary transition-colors"
            >
              Packs
            </Link>
          </nav>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </body>
    </html>
  );
}