// app/cfb/players/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sql } from "@/lib/db";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<{ q?: string; pos?: string; page?: string }>;
};

type PlayerRow = {
  player_name: string;
  position: string | null;
  slug: string;
};

export default async function PlayersCFB({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const pos = (sp.pos ?? "").trim().toUpperCase();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const limit = 30;
  const offset = (page - 1) * limit;

  const out = await sql/* sql */ `
    SELECT player_name, position, slug
    FROM players
    WHERE league = 'cfb'
      AND (${q === ""} OR player_name ILIKE ${"%" + q + "%"})
      AND (${pos === ""} OR position = ${pos})
    ORDER BY player_name ASC
    LIMIT ${limit + 1} OFFSET ${offset};
  `;
  const rows = out.rows as PlayerRow[];
  const hasMore = rows.length > limit;
  const players = hasMore ? rows.slice(0, limit) : rows;

  const hrefFor = (nextPage?: number | null) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (pos) p.set("pos", pos);
    if (nextPage && nextPage > 1) p.set("page", String(nextPage));
    const qs = p.toString();
    return qs ? `/cfb/players?${qs}` : `/cfb/players`;
  };

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">College Players</h1>
          <p className="text-sm text-zinc-400">Search FBS players</p>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          action="/cfb/players"
          method="get"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            className="w-48 rounded-lg border border-zinc-700 bg-black px-3 py-1.5 text-sm text-white"
          />
          <select
            name="pos"
            defaultValue={pos}
            className="rounded-lg border border-zinc-700 bg-black px-2 py-1.5 text-sm text-white"
          >
            <option value="">All</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
          </select>
          <button className="rounded-lg bg-fuchsia-600 px-3 py-1.5 text-sm text-white">
            Filter
          </button>
        </form>
      </header>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <li key={p.slug} className="h-full">
            <Link
              href={`/cfb/${p.slug}`}
              aria-label={`View ${p.player_name} details`}
              className="group block h-full rounded-xl border border-zinc-800 bg-black/40 p-4 transition
                         hover:border-pink-500/70 hover:shadow-[0_0_0_2px_rgba(236,72,153,0.25)]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/60
                         active:scale-[0.995] touch-manipulation"
            >
              <div className="text-sm text-zinc-400">{p.position ?? "—"}</div>
              <div className="mt-1 text-base font-semibold text-white transition-colors group-hover:text-pink-300">
                {p.player_name}
              </div>
              <div className="mt-2 text-xs text-zinc-500 group-hover:text-zinc-300">
                Tap to view weekly charts & props
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <nav className="flex items-center justify-between">
        <Link
          href={hrefFor(page - 1)}
          aria-disabled={page <= 1}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            page <= 1 ? "pointer-events-none opacity-50" : ""
          }`}
        >
          ← Prev
        </Link>
        <div className="text-sm text-zinc-400">Page {page}</div>
        <Link
          href={hrefFor(page + 1)}
          aria-disabled={!hasMore}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            !hasMore ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Next →
        </Link>
      </nav>
    </main>
  );
}
