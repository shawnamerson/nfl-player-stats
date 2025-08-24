// app/players/page.tsx
import { sql } from "@vercel/postgres";
import Link from "next/link";
import PlayersToolbar from "@/components/PlayersToolbar";

type PageProps = {
  searchParams: Promise<{ q?: string; pos?: string; page?: string }>;
};

export const revalidate = 0;

export default async function PlayersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const pos = (sp.pos ?? "").trim() || null;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const limit = 60;
  const offset = (page - 1) * limit;

  // Positions for chips
  const posRes = await sql/* sql */`
    SELECT DISTINCT position
    FROM players
    WHERE league = 'nfl' AND position IS NOT NULL
    ORDER BY position ASC;
  `;
  const positions: string[] = posRes.rows.map((r: any) => String(r.position));

  // Sentinel flags + concrete values (avoid NULL-typed params)
  const hasQ = q.length > 0;
  const hasPos = !!pos;
  const qLike = `%${q.toLowerCase()}%`;
  const posVal = pos ?? "";

  const playersRes = await sql/* sql */`
    SELECT player_name, position, slug
    FROM players
    WHERE league = 'nfl'
      AND (${hasQ} = FALSE OR LOWER(player_name) LIKE ${qLike})
      AND (${hasPos} = FALSE OR position = ${posVal})
    ORDER BY player_name ASC
    LIMIT ${limit} OFFSET ${offset};
  `;
  const players = playersRes.rows;

  const nextPage = players.length === limit ? page + 1 : null;
  const prevPage = page > 1 ? page - 1 : null;

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header + filters */}
      <section className="rounded-3xl border border-zinc-800 p-6 shadow-sm bg-black">
        <h1 className="text-2xl font-semibold">NFL Players</h1>
        <p className="text-sm text-zinc-400">Browse by name or position, then open a player for weekly charts.</p>
        <div className="mt-4">
          <PlayersToolbar positions={positions} initialQ={q} initialPos={pos} />
        </div>
      </section>

      {/* Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {players.map((p: any) => (
          <PlayerCard key={p.slug} name={p.player_name} pos={p.position} slug={p.slug} />
        ))}
        {players.length === 0 && (
          <div className="col-span-full rounded-2xl border border-zinc-800 p-6 text-sm text-zinc-400">
            No players found. Try clearing filters.
          </div>
        )}
      </section>

      <Pager page={page} prevPage={prevPage} nextPage={nextPage} q={q} pos={pos} />
    </main>
  );
}

/* --- Presentational bits --- */

function PlayerCard({ name, pos, slug }: { name: string; pos: string | null; slug: string }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-lg">
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/20 to-indigo-400/20 blur-2xl" />
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ backgroundImage: "linear-gradient(135deg,#10b981,#6366f1)" }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{name}</div>
          <div className="text-xs text-zinc-400">{pos ?? "—"}</div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Link
          href={`/nfl/${encodeURIComponent(slug)}`}
          className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-medium text-white"
          style={{ backgroundImage: "linear-gradient(90deg,#10b981,#6366f1,#f472b6)" }}
        >
          View charts
        </Link>
      </div>
    </div>
  );
}

function Pager({
  page,
  prevPage,
  nextPage,
  q,
  pos,
}: {
  page: number;
  prevPage: number | null;
  nextPage: number | null;
  q: string;
  pos: string | null;
}) {
  const mkHref = (p?: number | null) => {
    if (!p) return "#";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (pos) params.set("pos", pos);
    params.set("page", String(p));
    return `/players?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 p-3 text-sm">
      <div className="text-zinc-400">Page {page}</div>
      <div className="flex gap-2">
        <Link
          aria-disabled={!prevPage}
          href={mkHref(prevPage)}
          className={`rounded-lg border px-3 py-1.5 ${
            prevPage ? "hover:bg-zinc-900" : "pointer-events-none opacity-40"
          } border-zinc-800`}
        >
          ← Prev
        </Link>
        <Link
          aria-disabled={!nextPage}
          href={mkHref(nextPage)}
          className={`rounded-lg border px-3 py-1.5 ${
            nextPage ? "hover:bg-zinc-900" : "pointer-events-none opacity-40"
          } border-zinc-800`}
        >
          Next →
        </Link>
      </div>
    </div>
  );
}
