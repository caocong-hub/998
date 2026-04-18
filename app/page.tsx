"use client"
import HeroSection from "@/components/HeroSection";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function Home() {
  const user = useCurrentUser();
  const userId = user?.id;
  return (
    <main className="h-screen w-screen overflow-hidden">
      <div>
        <HeroSection userId={userId} />
      </div>
    </main>
  );
}
