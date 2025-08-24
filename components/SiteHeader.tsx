// components/SiteHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/players", label: "Players" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          NFL Player Stats
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active =
              pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`link-neon ${active ? "link-neon-active" : ""}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* neon accent bar */}
      <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-fuchsia-500" />
    </header>
  );
}
