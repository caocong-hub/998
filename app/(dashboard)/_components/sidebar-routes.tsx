"use client";

import { Layout, BookOpen, Sparkles, GraduationCap, Activity } from "lucide-react";
import { usePathname } from "next/navigation";

import { SidebarItem } from "./sidebar-item";

const guestRoutes = [
  {
    icon: Layout,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: BookOpen,
    label: "Teaching Pathway Architect",
    href: "/teaching-pathway",
  },
  {
    icon: Sparkles,
    label: "Personalized Problem Gen",
    href: "/personalized-generator",
  },
  {
    icon: GraduationCap,
    label: "Personalized Course Suggestion",
    href: "/personalized-courses",
  },
  {
    icon: Activity,
    label: "Emotion Recognition",
    href: "/emotion-recognition",
  },
];

const teacherRoutes = [
  {
    icon: Layout,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: BookOpen,
    label: "Teaching Pathway Architect",
    href: "/teaching-pathway",
  },
  {
    icon: Sparkles,
    label: "Personalized Problem Gen",
    href: "/personalized-generator",
  },
  {
    icon: GraduationCap,
    label: "Personalized Course Suggestion",
    href: "/personalized-courses",
  },
  {
    icon: Activity,
    label: "Emotion Recognition",
    href: "/emotion-recognition",
  },
]

export const SidebarRoutes = () => {
  const pathname = usePathname();

  const isTeacherPage = pathname?.includes("/teacher");

  const routes = isTeacherPage ? teacherRoutes : guestRoutes;

  return (
    <div className="flex flex-col w-full">
      {routes.map((route) => (
        <SidebarItem
          key={route.href}
          icon={route.icon}
          label={route.label}
          href={route.href}
        />
      ))}
    </div>
  )
}