// components/SiteFooter.tsx
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-black">
      <div className="h-[2px] w-full bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-emerald-500" />
      <div className="mx-auto max-w-7xl p-6 text-xs text-zinc-400">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row">
          <div>© {new Date().getFullYear()} NFL Player Stats</div>
          <div className="flex gap-3">
            <Link href="/" className="link-neon">Home</Link>
            <Link href="/players" className="link-neon">Players</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
