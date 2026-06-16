import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-server"
import crypto from "crypto"

export interface StoredEvent {
  id: string
  event: string
  value?: number
  currency?: string
  orderId?: string
  clickId?: string | null
  campaignId?: string | null
  adSetId?: string | null
  creativeId?: string | null
  utms?: Record<string, string>
  url?: string
  userAgent?: string
  timestamp: number
  kwaiStatus: "pending" | "sent" | "error" | "skipped"
  kwaiResponse?: string
  retries: number
  page?: string
  customerEmail?: string
  customerName?: string
  customerPhone?: string
  pixelId?: string
  productSlug?: string
}

const KWAI_ADS_NEBULA_API = "https://www.adsnebula.com/log/common/api"

function getCredentials(productSlug?: string) {
  if (productSlug) {
    const key = productSlug.toUpperCase()
    const pixelId = (process.env[`KWAI_PIXEL_ID_${key}`] || "").trim()
    const accessToken = (process.env[`KWAI_ACCESS_TOKEN_${key}`] || "").trim()
    if (pixelId && accessToken) return { pixelId, accessToken }
  }
  return {
    pixelId: (process.env.KWAI_PIXEL_ID || "").trim(),
    accessToken: (process.env.KWAI_ACCESS_TOKEN || "").trim(),
  }
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

export async function sendToKwaiAPI(
  event: StoredEvent,
  productSlug?: string
): Promise<{ ok: boolean; body: string; skipped?: boolean }> {
  const { pixelId, accessToken } = getCredentials(productSlug)

  if (!pixelId || !accessToken) {
    return { ok: false, body: "KWAI_PIXEL_ID ou KWAI_ACCESS_TOKEN não configurado" }
  }

  if (!event.clickId) {
    return { ok: true, body: "skipped - sem Kwai click ID", skipped: true }
  }

  const userData: Record<string, string> = {}
  if (event.customerEmail) userData.email = sha256(event.customerEmail)
  if (event.customerPhone) userData.phone = sha256(event.customerPhone)
  if (event.customerName)  userData.name  = sha256(event.customerName)

  const payload: Record<string, unknown> = {
    access_token: accessToken,
    clickid: event.clickId,
    event_name: event.event,
    is_attributed: 1,
    mmpcode: "PL",
    pixelId,
    pixelSdkVersion: "9.9.9",
    testFlag: false,
    trackFlag: false,
    ...(event.campaignId ? { CampaignID: event.campaignId } : {}),
    ...(event.adSetId    ? { adSETID:    event.adSetId }    : {}),
    ...(event.creativeId ? { CreativeID: event.creativeId } : {}),
    currency: event.currency || "BRL",
    ...(event.value   ? { value: String(event.value) } : {}),
    ...(event.orderId ? { order_id: event.orderId }    : {}),
    ...(Object.keys(userData).length > 0 ? { user_data: JSON.stringify(userData) } : {}),
  }

  try {
    const res = await fetch(KWAI_ADS_NEBULA_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    let parsed: any = text
    try { parsed = JSON.parse(text) } catch { /* keep raw text */ }
    const ok = typeof parsed === "object" && parsed?.result === 1
    return { ok, body: typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2) }
  } catch (e: any) {
    return { ok: false, body: e?.message || "Erro de rede" }
  }
}

function mapRow(row: any): StoredEvent {
  return {
    id: row.id,
    event: row.event,
    value: row.value,
    currency: row.currency,
    orderId: row.order_id,
    clickId: row.click_id,
    utms: row.utms || {},
    url: row.url,
    userAgent: row.user_agent,
    timestamp: row.timestamp,
    kwaiStatus: row.kwai_status,
    kwaiResponse: row.kwai_response,
    retries: row.retries,
    page: row.page,
    pixelId: row.pixel_id || undefined,
    productSlug: row.product_slug || undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const timestamp = body.timestamp || Date.now()

    const canonicalUrl = process.env.CANONICAL_EVENT_URL || (request.headers.get("origin") || "") + "/"

    const productSlug = body.productSlug || undefined
    const { pixelId } = getCredentials(productSlug)

    const { error: insertError } = await supabaseAdmin.from("tracking_events").insert({
      id,
      event: body.event,
      value: body.value || null,
      currency: body.currency || "BRL",
      order_id: body.orderId || null,
      click_id: body.callback || body.clickId || null,
      utms: body.utms || {},
      url: canonicalUrl,
      user_agent: body.userAgent || request.headers.get("user-agent") || "",
      timestamp,
      kwai_status: "pending",
      kwai_response: null,
      retries: 0,
      page: body.page || null,
      pixel_id: pixelId || null,
      product_slug: body.productSlug || null,
    })

    if (insertError) throw insertError

    const event: StoredEvent = {
      id,
      event: body.event,
      value: body.value,
      currency: body.currency || "BRL",
      orderId: body.orderId,
      clickId:    body.callback   || body.clickId    || null,
      campaignId: body.campaignId || null,
      adSetId:    body.adSetId    || null,
      creativeId: body.creativeId || null,
      utms: body.utms,
      url: body.url,
      userAgent: body.userAgent || request.headers.get("user-agent") || "",
      timestamp,
      kwaiStatus: "pending",
      retries: 0,
      page: body.page,
      customerEmail: body.customerEmail,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
    }

    const result = await sendToKwaiAPI(event, productSlug)
    const kwaiStatus = result.skipped ? "skipped" : (result.ok ? "sent" : "error")

    await supabaseAdmin
      .from("tracking_events")
      .update({ kwai_status: kwaiStatus, kwai_response: result.body })
      .eq("id", id)

    return NextResponse.json({ ok: true, id, kwaiStatus })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

export async function GET() {
  const { data: events, error } = await supabaseAdmin
    .from("tracking_events")
    .select("*")
    .order("timestamp", { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: events.map(mapRow), total: events.length })
}
