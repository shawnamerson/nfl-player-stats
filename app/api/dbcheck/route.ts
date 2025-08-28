// app/api/dbcheck/route.ts
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  try {
    const r = await sql`select now() as now, current_database() as db, current_user as user`;
    return NextResponse.json({ ok: true, ...r.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
