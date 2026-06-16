import { NextRequest, NextResponse } from "next/server"

const KWAI_ADS_NEBULA_API = "https://www.adsnebula.com/log/common/api"

function getTestCredentials(productSlug?: string) {
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

export async function sendToAdsNebula(
  pixelId: string,
  accessToken: string,
  eventName: string,
  callback: string,
  extra: Record<string, unknown> = {},
  testEventCode?: string
): Promise<{ ok: boolean; status: number; body: string; payload: Record<string, unknown> }> {
  try {
    const payload: Record<string, unknown> = {
      access_token: accessToken,
      clickid: callback,
      event_name: eventName,
      is_attributed: 1,
      mmpcode: "PL",
      pixelId,
      pixelSdkVersion: "9.9.9",
      testFlag: false,
      trackFlag: true,
      ...extra,
    }

    const res = await fetch(KWAI_ADS_NEBULA_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    let parsed: any = text
    try { parsed = JSON.parse(text) } catch {}
    const ok = typeof parsed === "object" && parsed?.result === 1
    return { ok, status: res.status, body: text, payload }
  } catch (e: any) {
    return { ok: false, status: 0, body: e?.message || "Erro de rede", payload: {} }
  }
}

export async function POST(request: NextRequest) {
  try {
    const bodyJson = await request.json()
    const testEventCode = bodyJson.testEventCode as string | undefined
    const productSlug = bodyJson.productSlug as string | undefined

    const { pixelId, accessToken } = getTestCredentials(productSlug)

    if (!pixelId || !accessToken) {
      return NextResponse.json(
        { ok: false, error: "Pixel não configurado" },
        { status: 400 }
      )
    }

    const clickId = testEventCode || `test_click_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const events = [
      { event_name: "EVENT_CONTENT_VIEW", extra: { currency: "BRL" } },
      { event_name: "EVENT_ADD_TO_CART", extra: { currency: "BRL", value: "58.98" } },
      { event_name: "EVENT_PURCHASE", extra: { currency: "BRL", value: "58.98" } },
    ]

    const results = await Promise.all(
      events.map((ev) =>
        sendToAdsNebula(pixelId, accessToken, ev.event_name, clickId, ev.extra, testEventCode)
      )
    )

    const allOk = results.every((r) => r.ok)
    const successCount = results.filter((r) => r.ok).length

    return NextResponse.json({
      ok: allOk,
      pixelUsed: pixelId,
      clickIdUsed: clickId,
      eventsSent: events.map((e) => e.event_name),
      successCount,
      totalCount: events.length,
      results: results.map((r, i) => ({
        event: events[i].event_name,
        status: r.status,
        body: r.body,
        payload: r.payload,
        parsed: (() => { try { return JSON.parse(r.body) } catch { return r.body } })(),
        success: r.ok,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno" }, { status: 500 })
  }
}
