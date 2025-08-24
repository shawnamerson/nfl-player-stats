// components/PlayersToolbar.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PlayersToolbar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState<string>(sp.get("q") ?? "");
  const [pos, setPos] = useState<string>(sp.get("pos") ?? "");

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setPos(sp.get("pos") ?? "");
  }, [sp]);

  const submit = () => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (pos) p.set("pos", pos);
    const qs = p.toString();
    router.push(qs ? `/players?${qs}` : "/players");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name"
        className="w-48 rounded-lg border px-3 py-1.5 text-sm"
      />
      <select
        value={pos}
        onChange={(e) => setPos(e.target.value)}
        className="rounded-lg border px-2 py-1.5 text-sm"
      >
        <option value="">All</option>
        <option value="QB">QB</option>
        <option value="RB">RB</option>
        <option value="WR">WR</option>
        <option value="TE">TE</option>
      </select>
      <button
        onClick={submit}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white"
      >
        Apply
      </button>
    </div>
  );
}
