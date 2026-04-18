"use client";

import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";
import { redirect } from "next/navigation";

export default function Dashboard() {
  const user = useCurrentUser();
  const userId = user?.id;

  if (!userId) {
    redirect("/auth/login");
  }

  const schedule = [
    { time: "09:00", title: "Review notes" },
    { time: "11:00", title: "Practice set" },
    { time: "14:00", title: "Watch lecture" },
  ];

  const chart = [
    { label: "Mon", value: 60 },
    { label: "Tue", value: 45 },
    { label: "Wed", value: 80 },
    { label: "Thu", value: 30 },
    { label: "Fri", value: 55 },
  ];

  const modules = [
    {
      title: "Teaching Pathway Architect",
      desc: "Upload PDF or paste text to map knowledge points.",
      href: "/teaching-pathway",
    },
    {
      title: "Personalized Problem Generation",
      desc: "Click once to generate 5 tailored problems.",
      href: "/personalized-generator",
    },
    {
      title: "Personalized Course Suggestion",
      desc: "Give directions and feedback to get top course picks.",
      href: "/personalized-courses",
    },
    {
      title: "Emotion Recognition",
      desc: "Live camera/audio sentiment with floating mini window.",
      href: "/emotion-recognition",
    },
  ];

  const days = Array.from({ length: 35 }).map((_, i) => i + 1);
  const today = new Date().getDate();

  return (
    <main className="min-h-screen w-full bg-slate-50 px-6 py-6">
      <div className="flex flex-col md:flex-row gap-6">
        <section className="flex-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Dashboard
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Quick overview of your learning day.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Modules</p>
              <div className="mt-3 space-y-3 text-sm text-slate-600">
                {modules.map((m) => (
                  <div key={m.href} className="space-y-1">
                    <Link
                      href={m.href}
                      className="font-semibold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1"
                    >
                      {m.title}
                      <span className="text-xs font-normal text-blue-600">→</span>
                    </Link>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      {m.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Today’s schedule</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {schedule.map((item) => (
                  <li key={item.time} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 w-12">
                      {item.time}
                    </span>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <aside className="w-full md:w-80 lg:w-96 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Calendar
            </p>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-slate-600">
              {["M", "T", "W", "T", "F", "S", "S"].map((d) => (
                <div key={d} className="font-semibold text-slate-500 py-1">
                  {d}
                </div>
              ))}
              {days.map((d) => (
                <div
                  key={d}
                  className={`py-2 rounded-lg border text-slate-700 ${
                    d === today
                      ? "bg-indigo-50 border-indigo-200 font-semibold text-indigo-700"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Weekly activity
            </p>
            <div className="mt-4 space-y-2">
              {chart.map((c) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{c.label}</span>
                    <span>{c.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${c.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
