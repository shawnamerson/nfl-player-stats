// app/page.tsx
import Link from "next/link";
import HeroGraphic from "@/components/HeroGraphic";

export const metadata = {
  title: "NFL Player Props & Stats — Charts, Hit Rates, Projections",
  description:
    "Weekly QB/RB/WR/TE charts, prop hit-rates, and defense-adjusted projections.",
};

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl p-6 space-y-16">
      {/* HERO (black with aurora glow) */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-black p-8 shadow-2xl md:p-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30">
              New: defense-adjusted projections
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              NFL Player Props,{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                made obvious
              </span>.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-zinc-300">
              Visualize weekly performance, set prop lines, highlight hit weeks, and judge picks
              with opponent context.
            </p>

            {/* Primary actions (no pricing) */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/players" className="btn-neon">
                Explore Players
              </Link>
              <Link href="/players?pos=QB" className="btn-ghost-neon">
                Filter: QB
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
              <span>Fast charts</span> <span>•</span> <span>Hit-rate overlays</span>{" "}
              <span>•</span> <span>Opponent context</span>
            </div>
          </div>

          {/* Neon SVG graphic */}
          <HeroGraphic />
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {[
          [
            "Weekly charts per stat",
            "Separate bars for attempts, yards, TDs, INTs, long, sacks, and more.",
          ],
          [
            "Prop line overlays",
            "Enter your line and instantly highlight the hit weeks with a hit-rate.",
          ],
          [
            "Opponent context",
            "Defense-adjusted expectations by position for smarter picks.",
          ],
        ].map(([title, body]) => (
          <div key={title} className="card-pop p-5">
            <div className="text-base font-medium text-white">{title}</div>
            <div className="mt-2 text-sm text-zinc-400">{body}</div>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-5xl">
        <div className="surface p-6">
          <div className="mb-4 text-center text-xl font-semibold">How it works</div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Pick a player", "Start from Players and open any detail page."],
              ["Set a prop line", "Toggle stat charts and add your line; hits are highlighted."],
              ["Decide with context", "Hit-rate + defense strength guide your pick."],
            ].map(([t, b], i) => (
              <div key={t} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-fuchsia-500 text-xs font-medium text-white">
                  {i + 1}
                </div>
                <div className="mt-2 text-sm font-medium text-white">{t}</div>
                <div className="mt-1 text-sm text-zinc-400">{b}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 text-center">
            <Link href="/players" className="btn-neon">
              Explore Players
            </Link>
          </div>
        </div>
      </section>

      {/* CTA STRIP (no pricing) */}
      <section className="mx-auto max-w-5xl rounded-2xl border border-zinc-800 p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-lg font-semibold">Ready to find edges faster?</div>
            <div className="text-sm text-zinc-300">
              Browse players and drill into weekly charts in seconds.
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/players" className="btn-neon">
              Explore Players
            </Link>
            <Link href="/players?pos=WR" className="btn-ghost-neon">
              Filter: WR
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
