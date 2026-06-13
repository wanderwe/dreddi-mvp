"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LocalizedLink } from "@/app/components/LocalizedLink";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/admins", label: "Admins" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/feedback", label: "Feedback" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-slate-100">
      <nav className="flex gap-1 border-b border-white/10 pb-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname.endsWith("/admin")
              : pathname.includes(item.href);
          return (
            <LocalizedLink
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {item.label}
            </LocalizedLink>
          );
        })}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
