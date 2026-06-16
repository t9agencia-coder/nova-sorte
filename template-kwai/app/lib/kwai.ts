"use client"

export type KwaiEventName =
  | "EVENT_CONTENT_VIEW"
  | "EVENT_ADD_TO_CART"
  | "EVENT_PURCHASE"

export interface KwaiEventPayload {
  event: KwaiEventName
  value?: number
  currency?: string
  orderId?: string
  page?: string
  productSlug?: string
}

function getKwaiCallback(): string | null {
  if (typeof window === "undefined") return null
  try {
    const fromSession = sessionStorage.getItem("kwai_callback") || localStorage.getItem("kwai_callback")
    if (fromSession) return fromSession

    const cookieMatch = document.cookie.match(/(?:^|;\s*)kwai_click_id=([^;]+)/)
    if (cookieMatch) return decodeURIComponent(cookieMatch[1])

    const stored = localStorage.getItem("kwai_url_params") || sessionStorage.getItem("kwai_url_params")
    if (stored) {
      const params = JSON.parse(stored)
      const cb = params["kwai_callback"] || params["callback"] || params["click_id"]
      if (cb) return cb
    }

    const url = new URL(window.location.href)
    const utmContent = url.searchParams.get("utm_content") || ""
    if (utmContent.includes("::")) {
      const parts = utmContent.split("::")
      if (parts[1]) return parts[1]
    }
    return url.searchParams.get("click_id") || url.searchParams.get("callback") || null
  } catch {
    return null
  }
}

function getUtmData(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    const raw = sessionStorage.getItem("kwai_url_params") || localStorage.getItem("kwai_url_params") ||
                sessionStorage.getItem("utm_params") || localStorage.getItem("utm_params")
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function getKwaiCampaignData(): {
  campaignId?: string
  adSetId?: string
  creativeId?: string
  pixelId?: string
} {
  if (typeof window === "undefined") return {}
  try {
    const params = getUtmData()
    return {
      campaignId: params["utm_campaign"] || undefined,
      adSetId:    params["utm_medium"]   || undefined,
      creativeId: params["kwai_CreativeID"] || params["kwai_creativeid"] || undefined,
      pixelId:    params["kwai_pixel_id"]   || undefined,
    }
  } catch {
    return {}
  }
}

function getCustomerData(): { customerEmail?: string; customerName?: string; customerPhone?: string } {
  try {
    const raw = sessionStorage.getItem("orderData")
    if (!raw) return {}
    const data = JSON.parse(raw)
    return {
      customerEmail: data.email || undefined,
      customerName: data.nome || data.name || undefined,
      customerPhone: data.celular || data.phone || undefined,
    }
  } catch {
    return {}
  }
}

export async function trackEvent(payload: KwaiEventPayload): Promise<void> {
  if (typeof window === "undefined") return

  const callback = getKwaiCallback()
  const utms = getUtmData()
  const campaign = getKwaiCampaignData()
  const customerData = getCustomerData()

  const body = {
    ...payload,
    callback,
    ...campaign,
    utms,
    url: window.location.origin + "/",
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    ...customerData,
  }

  try {
    await fetch("/api/tracking/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    })
  } catch (e) {
    console.warn("[Kwai] Falha ao enviar para API:", e)
  }
}
