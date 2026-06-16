import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import type { StoredEvent } from "../event/route"
import { sendToKwaiAPI } from "../event/route"

export async function POST(request: NextRequest) {
  try {
    const { sinceMinutes = 60 } = await request.json()
    const since = Date.now() - sinceMinutes * 60 * 1000

    const { data: rows, error } = await supabaseAdmin
      .from("tracking_events")
      .select("*")
      .gte("timestamp", since)
      .order("timestamp", { ascending: false })

    if (error) throw error
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, total: 0, message: "Nenhum evento encontrado no período" })
    }

    const results: { id: string; event: string; ok: boolean; kwaiStatus: string; response: string }[] = []

    for (const row of rows) {
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
        retries: (row.retries || 0) + 1,
        page: row.page,
      }

      const result = await sendToKwaiAPI(event)
      const kwaiStatus = result.ok ? "sent" : "error"

      await supabaseAdmin
        .from("tracking_events")
        .update({ kwai_status: kwaiStatus, kwai_response: result.body, retries: (row.retries || 0) + 1 })
        .eq("id", row.id)

      results.push({ id: row.id, event: row.event, ok: result.ok, kwaiStatus, response: result.body })
    }

    const successCount = results.filter((r) => r.ok).length

    return NextResponse.json({
      ok: true,
      total: results.length,
      successCount,
      errorCount: results.length - successCount,
      results,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
