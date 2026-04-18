"use client";

import { LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { IconType } from "react-icons";

interface SidebarItemProps {
  icon: LucideIcon | IconType;
  label: string;
  href: string;
};

export const SidebarItem = ({
  icon: Icon,
  label,
  href,
}: SidebarItemProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const isActive =
    (pathname === "/" && href === "/") ||
    pathname === href ||
    pathname?.startsWith(`${href}/`);

  const onClick = () => {
    router.push(href);
  }

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "relative w-full flex items-center text-slate-500 text-sm font-[500] px-5 transition-all hover:text-slate-600 hover:bg-slate-300/20",
        isActive && "text-text-secondary font-[700] bg-active hover:bg-sky-200/20 hover:text-text-secondary"
      )}
    >
      <div className="absolute left-5 flex items-center py-4">
        <Icon
          size={22}
          className={cn(
            "text-slate-500",
            isActive && "text-text-secondary"
          )}
        />
      </div>
      <div className="w-full text-center py-4 px-4 whitespace-normal break-words leading-tight">
        {label}
      </div>
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 opacity-0 border-2 border-custom-primary h-full transition-all",
          isActive && "opacity-100"
        )}
      />
    </button>
  )
}