import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import type { StoredEvent } from "../event/route"
import { sendToKwaiAPI } from "../event/route"

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json()

    const { data: rows, error: fetchError } = await supabaseAdmin
      .from("tracking_events")
      .select("*")
      .eq("id", id)
      .limit(1)

    if (fetchError) throw fetchError
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Evento não encontrado" }, { status: 404 })
    }

    const row = rows[0]
    const retries = (row.retries || 0) + 1

    const utms: Record<string, string> = row.utms || {}
    const event: StoredEvent = {
      id: row.id,
      event: row.event,
      value: row.value,
      currency: row.currency || "BRL",
      orderId: row.order_id,
      clickId: row.click_id,
      campaignId: utms["utm_campaign"] || null,
      adSetId:    utms["utm_medium"]   || null,
      creativeId: utms["kwai_CreativeID"] || utms["kwai_creativeid"] || null,
      utms,
      url: row.url,
      userAgent: row.user_agent || "",
      timestamp: row.timestamp,
      kwaiStatus: "pending",
      retries,
      page: row.page,
    }

    const result = await sendToKwaiAPI(event)
    const kwaiStatus = result.ok ? "sent" : "error"

    await supabaseAdmin
      .from("tracking_events")
      .update({ kwai_status: kwaiStatus, kwai_response: result.body, retries })
      .eq("id", id)

    return NextResponse.json({ ok: true, kwaiStatus, response: result.body })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
