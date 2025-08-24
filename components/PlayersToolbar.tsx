// components/PlayersToolbar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type Props = {
  positions: string[];
  initialQ?: string;
  initialPos?: string | null;
};

export default function PlayersToolbar({ positions, initialQ = "", initialPos = null }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState<string>(initialQ);
  const [pos, setPos] = useState<string | null>(initialPos);

  const href = useMemo(() => {
    const p = new URLSearchParams(sp?.toString() || "");
    q.trim() ? p.set("q", q.trim()) : p.delete("q");
    pos ? p.set("pos", pos) : p.delete("pos");
    p.set("page", "1");
    const query = p.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [q, pos, pathname, sp]);

  useEffect(() => {
    const t = setTimeout(() => router.push(href), 250);
    return () => clearTimeout(t);
  }, [href, router]);

  const submitNow = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      router.push(href);
    }
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Search */}
      <div className="relative w-full md:max-w-md">
        <label htmlFor="players-search" className="sr-only">Search players</label>
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
        <input
          id="players-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={submitNow}
          placeholder="Search players…"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-8 py-2 text-sm text-white outline-none
                     focus:ring-2 focus:ring-emerald-500/40"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQ("")}
            className="absolute right-2 top-2 rounded p-1 text-zinc-400 hover:bg-zinc-900"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Position chips */}
      <div className="flex flex-wrap gap-2">
        <Chip label="All" active={!pos} onClick={() => setPos(null)} />
        {positions.map((p) => (
          <Chip key={p} label={p} active={pos === p} onClick={() => setPos(p)} />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2",
        active
          ? "border-transparent text-white focus:ring-emerald-500/40"
          : "border-zinc-700 text-zinc-300 hover:bg-zinc-900 focus:ring-emerald-500/30",
      ].join(" ")}
      style={active ? {
        backgroundImage: "linear-gradient(90deg,#10b981,#6366f1,#f472b6)",
        boxShadow: "0 0 20px rgba(16,185,129,.25), 0 0 20px rgba(99,102,241,.2), 0 0 20px rgba(244,114,182,.2)"
      } : {}}
    >
      {label}
    </button>
  );
}
