"use client"
import HeroSection from "@/components/HeroSection";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function Home() {
  const user = useCurrentUser();
  const userId = user?.id;
  // #region agent log
  fetch("http://127.0.0.1:7885/ingest/e2ae3a21-ff15-4e12-90f1-78f203e315e8", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dadf4d" },
    body: JSON.stringify({
      sessionId: "dadf4d",
      runId: "m3-runtime-debug",
      hypothesisId: "H2",
      location: "app/page.tsx:9",
      message: "home-component-render",
      data: { hasUserId: Boolean(userId) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return (
    <main className="h-screen w-screen overflow-hidden">
      <div>
        <HeroSection userId={userId} />
      </div>
    </main>
  );
}
