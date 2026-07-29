import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, mode: "mock", error: "Supabase cron credentials not configured" },
      { status: 503 },
    );
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("expire_offers");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    expiredOffers: data ?? 0,
    priceMode: "computed-on-read",
    ranAt: new Date().toISOString(),
  });
}
