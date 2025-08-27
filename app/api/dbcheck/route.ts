// app/api/dbcheck/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  const envFlags = {
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    DATABASE_URL: !!process.env.DATABASE_URL,
  };

  try {
    const ping = await sql`select now() as now, current_database() as db`;
    return NextResponse.json({ ok: true, env: envFlags, db: ping.rows[0] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, env: envFlags, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
