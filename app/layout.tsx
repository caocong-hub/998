import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { existsSync } from "node:fs";
import { join } from "node:path";
import { auth } from '@/auth'
import './globals.css'
import { ConfettiProvider } from '@/components/providers/confetti-provider'
import { ToastProvider } from '@/components/providers/toaster-provider'
const inter = Inter({ subsets: ['latin'] })
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100","200","300","400","500","600","700","800","900"],
});


export const metadata: Metadata = {
  title: 'Education',
  description: 'An LMS Platform',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();
  const pageArtifactPath = join(process.cwd(), ".next", "server", "app", "page.js");
  const authArtifactPath = join(process.cwd(), ".next", "server", "app", "api", "auth", "[...nextauth]", "route.js");
  // #region agent log
  fetch("http://127.0.0.1:7885/ingest/e2ae3a21-ff15-4e12-90f1-78f203e315e8", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dadf4d" },
    body: JSON.stringify({
      sessionId: "dadf4d",
      runId: "m3-runtime-debug-v2",
      hypothesisId: "H5",
      location: "app/layout.tsx:31",
      message: "layout-render-artifact-check",
      data: {
        hasSession: Boolean(session?.user),
        pageArtifactExists: existsSync(pageArtifactPath),
        authArtifactExists: existsSync(authArtifactPath),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return (
    <SessionProvider session={session}>
      <html lang="en">
        <body className={poppins.className}>
          <ConfettiProvider />
          <ToastProvider />
          {children}
        </body>
      </html>
    </SessionProvider>
  )
}
