// app/players/page.tsx
import { sql } from "@vercel/postgres";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<{ q?: string; pos?: string; page?: string }>;
};

type PlayerRow = {
  player_name: string;
  position: string | null;
  slug: string;
};

export default async function PlayersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const pos = (sp.pos ?? "").trim().toUpperCase();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const limit = 30;
  const offset = (page - 1) * limit;

  const playersRes = await sql/* sql */ `
    SELECT player_name, position, slug
    FROM players
    WHERE league = 'nfl'
      AND (${q === ""} OR player_name ILIKE ${"%" + q + "%"})
      AND (${pos === ""} OR position = ${pos})
    ORDER BY player_name ASC
    LIMIT ${limit + 1} OFFSET ${offset};
  `;
  const rows = playersRes.rows as PlayerRow[];
  const hasMore = rows.length > limit;
  const players = hasMore ? rows.slice(0, limit) : rows;

  const hrefFor = (nextPage?: number | null) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (pos) p.set("pos", pos);
    if (nextPage && nextPage > 1) p.set("page", String(nextPage));
    const qs = p.toString();
    return qs ? `/players?${qs}` : `/players`;
  };

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Players</h1>
          <p className="text-sm text-slate-600">
            Search and browse NFL players
          </p>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          action="/players"
          method="get"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            className="w-48 rounded-lg border px-3 py-1.5 text-sm"
          />
          <select
            name="pos"
            defaultValue={pos}
            className="rounded-lg border px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="QB">QB</option>
            <option value="RB">RB</option>
            <option value="WR">WR</option>
            <option value="TE">TE</option>
          </select>
          <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">
            Filter
          </button>
        </form>
      </header>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {players.map((p) => (
          <li key={p.slug} className="rounded-xl border p-4">
            <div className="text-sm text-slate-500">{p.position ?? "—"}</div>
            <Link href={`/nfl/${p.slug}`} className="text-base font-semibold">
              {p.player_name}
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
        <div className="text-sm text-slate-600">Page {page}</div>
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
