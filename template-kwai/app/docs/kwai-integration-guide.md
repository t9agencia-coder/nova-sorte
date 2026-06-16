# Guia de Integração Kwai AdsNebula

> Versão: 1.1 — Completo, auto-suficiente, copy-paste ready.
> Baseado no padrão estabelecido no projeto vs-k1.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Setup no Dashboard Kwai](#2-setup-no-dashboard-kwai)
3. [Variáveis de Ambiente](#3-variáveis-de-ambiente)
4. [Dependências](#4-dependências)
5. [Schema do Banco (Supabase)](#5-schema-do-banco-supabase)
6. [Estrutura de Arquivos](#6-estrutura-de-arquivos)
7. [UTMTracker - Captura de Parâmetros](#7-umtracker---captura-de-parâmetros)
8. [Biblioteca Cliente - trackEvent()](#8-biblioteca-cliente---trackevent)
9. [Endpoint de Evento - Server-side](#9-endpoint-de-evento---server-side)
10. [Endpoint de Teste](#10-endpoint-de-teste)
11. [Webhooks - EVENT_PURCHASE](#11-webhooks---event_purchase)
12. [Reenvio de Eventos](#12-reenvio-de-eventos)
13. [Página de Documentação /docs/kwai](#13-página-de-documentação-docskwai)
14. [Admin - Painel de Eventos](#14-admin---painel-de-eventos)
15. [Agente Opencode](#15-agente-opencode)
16. [Como Testar](#16-como-testar)
17. [Regras Fixas do Payload](#17-regras-fixas-do-payload)
18. [Checklist de Implantação](#18-checklist-de-implantação)

---

## 1. Visão Geral

```
Usuário clica em anúncio Kwai
       │
       ▼
UTMTracker.tsx                      ← Parseia URL, salva click_id + UTMs
       │
       ▼
Páginas chamam trackEvent()          ← ContentView → AddToCart → Purchase
       │
       ▼
POST /api/tracking/event            ← Cliente envia para servidor
       │
       ▼
Servidor: 1. Insere no Supabase      ← tracking_events (kwai_status: "pending")
          2. Envia para AdsNebula    ← POST https://www.adsnebula.com/log/common/api
          3. Atualiza status         ← "sent" | "error" | "skipped"
       │
       ▼
Webhook do PIX (BlackPay/PodPay)    ← Quando pago, envia EVENT_PURCHASE
```

---

## 2. Setup no Dashboard Kwai

1. Acesse o [Gerenciador de Eventos do Kwai Ads](https://www.adsnebula.com/)
2. Crie um **Pixel** (ou use existente)
3. Anote o **Pixel ID** (ex: `123456789`)
4. Gere um **Access Token** no mesmo painel
5. (Opcional) Crie pixels separados por produto se quiser acompanhar métricas distintas

---

## 3. Variáveis de Ambiente

```env
# Obrigatórias — pixel principal
KWAI_PIXEL_ID=seu_pixel_id_aqui
KWAI_ACCESS_TOKEN=seu_access_token_aqui

# Opcionais — pixel por produto (slug em MAIÚSCULO, underscore no lugar de hífen)
# O slug "aspirador-de-po" vira KWAI_PIXEL_ID_ASPIRADOR_DE_PO
KWAI_PIXEL_ID_ASPIRADOR=outro_pixel_id
KWAI_ACCESS_TOKEN_ASPIRADOR=outro_access_token

# Opcional — força URL canônica em todos os eventos (segurança)
# Impede que URLs internas (/checkout, /payment) vazem para o Kwai
CANONICAL_EVENT_URL=https://seudominio.com/

# Obrigatórias do Supabase (já devem existir no projeto)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service_role_key
```

---

## 4. Dependências

O que o projeto já precisa ter:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "next": "^14.x",
    "react": "^18.x"
  }
}
```

Nenhum pacote extra é necessário. A lib `crypto` é nativa do Node.js (usada para SHA-256).

---

## 5. Schema do Banco (Supabase)

Execute no SQL Editor do Supabase:

```sql
CREATE TABLE IF NOT EXISTS tracking_events (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  value REAL,
  currency TEXT DEFAULT 'BRL',
  order_id TEXT,
  click_id TEXT,
  utms JSONB DEFAULT '{}',
  url TEXT,
  user_agent TEXT,
  timestamp BIGINT NOT NULL,
  kwai_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (kwai_status IN ('pending','sent','error','skipped')),
  kwai_response TEXT,
  retries INTEGER DEFAULT 0,
  page TEXT,
  pixel_id TEXT,
  product_slug TEXT
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_status ON tracking_events(kwai_status);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON tracking_events(timestamp DESC);
```

---

## 6. Estrutura de Arquivos

```
lib/
├── supabase-server.ts              ← Cria supabaseAdmin (lazy proxy)
└── pix-adapter.ts                  ← (já existente, não faz parte do tracking)

app/
├── lib/
│   └── kwai.ts                     ← Cliente-side: trackEvent()
├── components/
│   └── UTMTracker.tsx              ← Captura UTM/click_id da URL
├── api/
│   ├── tracking/
│   │   ├── event/route.ts          ← POST: recebe evento, envia para AdsNebula
│   │   ├── test/route.ts           ← POST: envia 3 eventos de teste
│   │   ├── resend/route.ts         ← POST: reenvia 1 evento por ID
│   │   ├── bulk-resend/route.ts    ← POST: reenvia lote dos últimos N minutos
│   │   └── visit/route.ts          ← POST: log de visita (opcional)
│   └── webhooks/
│       ├── blackpay/webhook/route.ts
│       └── podpay/webhook/route.ts
├── docs/
│   └── kwai/
│       └── page.tsx                ← Documentação ao vivo em /docs/kwai
└── admin/
    └── page.tsx                    ← Aba "Eventos" com status e reenvio
```

---

## 7. UTMTracker — Captura de Parâmetros

**Arquivo:** `app/components/UTMTracker.tsx`

```tsx
'use client'

import { useEffect } from 'react'

interface UrlParams {
  kwai: Record<string, string>
  utm: Record<string, string>
  all: Record<string, string>
}

function parseUtmContent(utmContent: string): Record<string, string> {
  const parts = utmContent.split('::')
  if (parts.length >= 3) {
    return {
      CreativeID: parts[0],
      callback: parts[1],
      pixel_id: parts[2],
    }
  }
  if (parts.length === 2) {
    return {
      CreativeID: parts[0],
      callback: parts[1],
    }
  }
  return { utm_content_raw: utmContent }
}

function parseUrlParams(): UrlParams {
  const params = new URLSearchParams(window.location.search)
  const kwaiKeys = [
    'click_id', 'pixel_id', 'CampaignID', 'adSETID', 'CreativeID', 'callback',
    '__CMPNID__', '__ADSETID__', '__ADID__', '__CALLBACK__', '__KS_PIXELID__',
  ]
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  const result: UrlParams = { kwai: {}, utm: {}, all: {} }

  params.forEach((value, key) => {
    result.all[key] = value
    const lower = key.toLowerCase()
    if (kwaiKeys.includes(key)) {
      result.kwai[key.replace(/^__|__$/g, '')] = value
    }
    if (utmKeys.includes(lower) || lower.startsWith('utm_')) {
      result.utm[key] = value
    }
    if (key === 'utm_content' && value.includes('::')) {
      const parsed = parseUtmContent(value)
      Object.entries(parsed).forEach(([k, v]) => {
        result.kwai[k] = v
        result.all[`kwai_${k}`] = v
      })
    }
  })

  return result
}

function saveKwaiClickId(clickId: string) {
  try {
    localStorage.setItem('kwai_click_id', clickId)
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString()
    document.cookie = `kwai_click_id=${encodeURIComponent(clickId)};expires=${expires};path=/;SameSite=Lax`
  } catch { /* */ }
}

function saveUrlParams(parsed: UrlParams) {
  if (Object.keys(parsed.all).length === 0) return

  const enrichedAll = { ...parsed.all, ...Object.fromEntries(
    Object.entries(parsed.kwai).map(([k, v]) => [`kwai_${k}`, v])
  ) }

  localStorage.setItem('kwai_url_params', JSON.stringify(enrichedAll))
  sessionStorage.setItem('kwai_url_params', JSON.stringify(enrichedAll))

  const existing = sessionStorage.getItem('utm_params')
  const merged = { ...(existing ? JSON.parse(existing) : {}), ...enrichedAll }
  sessionStorage.setItem('utm_params', JSON.stringify(merged))
  localStorage.setItem('utm_params', JSON.stringify(merged))

  const callback = parsed.kwai['callback'] || parsed.kwai['click_id'] || parsed.all['click_id']
  if (callback) {
    sessionStorage.setItem('kwai_callback', callback)
    localStorage.setItem('kwai_callback', callback)
    saveKwaiClickId(callback)
  }
}

export default function UTMTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const capture = () => {
      const parsed = parseUrlParams()
      if (Object.keys(parsed.all).length > 0) {
        saveUrlParams(parsed)
      } else {
        const stored = localStorage.getItem('kwai_url_params')
        if (stored) {
          try { sessionStorage.setItem('kwai_url_params', stored) } catch { /* */ }
        }
      }
    }

    capture()

    window.addEventListener('popstate', capture)
    const originalPushState = history.pushState
    history.pushState = function (...args) {
      originalPushState.apply(history, args)
      setTimeout(capture, 100)
    }

    return () => {
      window.removeEventListener('popstate', capture)
      history.pushState = originalPushState
    }
  }, [])

  return null
}
```

**Como usar no layout:**

```tsx
// app/layout.tsx
import UTMTracker from "@/app/components/UTMTracker"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <UTMTracker />
        {children}
      </body>
    </html>
  )
}
```

### Parâmetros reconhecidos na URL

| Parâmetro | Descrição |
|-----------|-----------|
| `click_id` | Identificador do clique |
| `callback` | Callback ID (sinônimo) |
| `CampaignID` | ID da campanha |
| `adSETID` | ID do conjunto de anúncios |
| `CreativeID` | ID do criativo |
| `pixel_id` | Pixel ID específico |
| `__CMPNID__` | CampaignID (formato raw) |
| `__ADSETID__` | AdSetID (formato raw) |
| `__ADID__` | CreativeID (formato raw) |
| `__CALLBACK__` | Callback (formato raw) |
| `__KS_PIXELID__` | Pixel ID (formato raw) |
| `utm_content` | Formato: `CreativeID::callback::pixel_id` |

---

## 8. Biblioteca Cliente — trackEvent()

**Arquivo:** `app/lib/kwai.ts`

```ts
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
```

### Como usar nas páginas:

```tsx
import { trackEvent } from "@/app/lib/kwai"

// Na home / página de produto:
trackEvent({ event: "EVENT_CONTENT_VIEW", page: "home" })

// No checkout:
trackEvent({ event: "EVENT_ADD_TO_CART", page: "checkout", productSlug: slug })

// No payment quando confirmar:
trackEvent({
  event: "EVENT_PURCHASE",
  value: 59.90,
  currency: "BRL",
  orderId: transactionId,
  page: "payment",
  productSlug: slug,
})
```

---

## 9. Endpoint de Evento — Server-side

### Pré-requisito: `lib/supabase-server.ts`

```ts
import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

function createLazyClient(): SupabaseClient {
  let client: SupabaseClient | null = null

  const handler: ProxyHandler<SupabaseClient> = {
    get(_target, prop) {
      if (!client) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error("Supabase env vars not configured")
        }
        client = createClient(supabaseUrl, supabaseServiceKey)
      }
      const val = (client as any)[prop]
      if (typeof val === "function") {
        return val.bind(client)
      }
      return val
    },
  }

  return new Proxy({} as SupabaseClient, handler)
}

export const supabaseAdmin = createLazyClient()
```

### Arquivo: `app/api/tracking/event/route.ts`

```ts
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
```

---

## 10. Endpoint de Teste

**Arquivo:** `app/api/tracking/test/route.ts`

```ts
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
```

---

## 11. Webhooks — EVENT_PURCHASE

Quando um webhook de pagamento chega, você deve enviar `EVENT_PURCHASE` para o Kwai.

### Padrão `sendKwaiPurchaseEvent()`

Cole este trecho no arquivo do seu webhook e chame quando o status for `COMPLETED`:

```ts
import { sendToKwaiAPI } from "../../tracking/event/route"

async function sendKwaiPurchaseEvent(order: any) {
  try {
    const utms = order.utms || {}

    const clickId    = utms["kwai_callback"] || utms["click_id"] || utms["callback"] || null
    const campaignId = utms["utm_campaign"]  || null
    const adSetId    = utms["utm_medium"]    || null
    const creativeId = utms["kwai_CreativeID"] || utms["kwai_creativeid"] || null

    const eventId = `webhook_evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    await supabaseAdmin.from("tracking_events").insert({
      id: eventId,
      event: "EVENT_PURCHASE",
      value: order.valor,
      currency: "BRL",
      order_id: order.transaction_id || order.id,
      click_id: clickId,
      utms,
      url: process.env.CANONICAL_EVENT_URL || "",
      user_agent: "Webhook",
      timestamp: Date.now(),
      kwai_status: "pending",
      retries: 0,
      page: "webhook",
    })

    const result = await sendToKwaiAPI({
      id: eventId,
      event: "EVENT_PURCHASE",
      value: order.valor,
      currency: "BRL",
      orderId: order.transaction_id || order.id,
      clickId,
      campaignId,
      adSetId,
      creativeId,
      utms,
      url: process.env.CANONICAL_EVENT_URL || "",
      userAgent: "Webhook",
      timestamp: Date.now(),
      kwaiStatus: "pending" as const,
      retries: 0,
      page: "webhook",
      customerEmail: order.email || undefined,
      customerName: order.nome || undefined,
      customerPhone: order.celular || order.phone || undefined,
    })

    await supabaseAdmin
      .from("tracking_events")
      .update({ kwai_status: result.ok ? "sent" : "error", kwai_response: result.body })
      .eq("id", eventId)
  } catch (err) {
    console.error("[Webhook] Erro Kwai:", err)
  }
}
```

**IMPORTANTE:** O `clickId` sempre vem de `order.utms`. O UTMTracker salva o callback como `kwai_callback`, `click_id` ou `callback` dentro dos UTMs do pedido. Nunca passe um clickId fixo ou vindo de outro lugar.

---

## 12. Reenvio de Eventos

### Reenvio individual: `app/api/tracking/resend/route.ts`

```ts
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
```

### Reenvio em lote: `app/api/tracking/bulk-resend/route.ts`

```ts
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
```

---

## 13. Página de Documentação /docs/kwai

**Arquivo:** `app/docs/kwai/page.tsx`

```tsx
export default function KwaiDocsPage() {
  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif", color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Integração Kwai AdsNebula</h1>
      <p style={{ color: "#94a3b8", marginBottom: 32 }}>
        Documentação dos parâmetros de tracking enviados para <code>https://www.adsnebula.com/log/common/api</code>
      </p>

      <Section title="Payload enviado (eventos reais)">
        <p><code>app/api/tracking/event/route.ts</code></p>
        <pre style={pre}>{`{
  access_token:   accessToken,
  clickid:        event.clickId,
  event_name:     event.event,
  is_attributed:  1,                // ⚠️ FIXO: sempre 1 (int)
  mmpcode:        "PL",             // ⚠️ FIXO: sempre "PL"
  pixelId,
  pixelSdkVersion: "9.9.9",         // ⚠️ FIXO: sempre "9.9.9"
  testFlag:       false,            // ⚠️ FIXO: false
  trackFlag:      false,            // ⚠️ FIXO: false
  currency:       "BRL",
  value:          String(valor),
  order_id:       event.orderId,
  CampaignID, adSETID, CreativeID,
  user_data:      JSON.stringify({ email, phone, name }),
}`}</pre>
      </Section>

      <Section title="Regras dos parâmetros">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#1e293b" }}>
              <Th>Parâmetro</Th><Th>Tipo</Th><Th>Valor</Th><Th>Regra</Th>
            </tr>
          </thead>
          <tbody>
            <Row name="is_attributed" type="int" value="1" rule="FIXO. Sempre 1." />
            <Row name="testFlag" type="boolean" value="false" rule="FIXO. false = evento real." />
            <Row name="trackFlag" type="boolean" value="false" rule="FIXO. false = campanha rodando." />
            <Row name="mmpcode" type="string" value='"PL"' rule="FIXO. Marca a fonte." />
            <Row name="pixelSdkVersion" type="string" value='"9.9.9"' rule="FIXO. Versão fixa." />
          </tbody>
        </table>
      </Section>

      <Section title="Endpoint de teste">
        <p><code>app/api/tracking/test/route.ts</code></p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#1e293b" }}>
              <Th>Parâmetro</Th><Th>Evento real</Th><Th>Teste</Th>
            </tr>
          </thead>
          <tbody>
            <tr><Td>testFlag</Td><Td><Badge>false</Badge></Td><Td><Badge>false</Badge></Td></tr>
            <tr><Td>trackFlag</Td><Td><Badge>false</Badge></Td><Td><Badge>true</Badge></Td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="Fluxo completo">
        <ol style={{ lineHeight: 2, fontSize: 14 }}>
          <li>Usuário clica em anúncio Kwai → gera click_id (callback)</li>
          <li>UTMTracker salva click_id em sessionStorage/cookie</li>
          <li>Páginas disparam trackEvent() → POST /api/tracking/event</li>
          <li>Servidor insere no Supabase tracking_events</li>
          <li>Servidor envia para adsnebula.com/log/common/api</li>
          <li>Kwai atualiza dashboard com o evento atribuído</li>
        </ol>
      </Section>

      <Section title="Histórico de bugs">
        <div style={{ background: "#1e293b", borderRadius: 8, padding: 16, fontSize: 13, lineHeight: 1.6 }}>
          <p><strong>Bug #1:</strong> trackFlag: true em eventos reais — Kwai interpretava como teste. Corrigido para false.</p>
          <p><strong>Bug #2:</strong> is_attributed: true (boolean) — API rejeitou com erro 10002. Valor correto é 1 (int).</p>
        </div>
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>{title}</h2>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, color: "#94a3b8", fontSize: 12 }}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b" }}>{children}</td>
}

function Row({ name, type, value, rule }: { name: string; type: string; value: string; rule: string }) {
  return (
    <tr>
      <Td><code style={{ color: "#38bdf8" }}>{name}</code></Td>
      <Td><span style={{ color: "#a78bfa", fontSize: 12 }}>{type}</span></Td>
      <Td><code style={{ color: "#4ade80" }}>{value}</code></Td>
      <Td><span style={{ color: "#94a3b8", fontSize: 13 }}>{rule}</span></Td>
    </tr>
  )
}

const pre: React.CSSProperties = {
  background: "#1e293b",
  padding: 16,
  borderRadius: 8,
  fontSize: 13,
  overflowX: "auto",
  lineHeight: 1.7,
  fontFamily: "monospace",
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ background: "#334155", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{children}</code>
  )
}
```

---

## 14. Admin — Painel de Eventos

No admin, inclua uma aba "Eventos" com:

```tsx
// Trecho funcional dentro do componente Admin
const [events, setEvents] = useState<any[]>([])
const [bulkResending, setBulkResending] = useState(false)
const [bulkResendResult, setBulkResendResult] = useState<any>(null)

async function fetchEvents() {
  try {
    const r = await fetch("/api/tracking/event")
    const d = await r.json()
    if (d.events) setEvents(d.events)
  } catch {}
}

return (
  <div>
    {/* Botão de teste */}
    <button onClick={async () => {
      const r = await fetch("/api/tracking/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      const d = await r.json()
      alert(d.ok ? "✅ Conexão ok!" : "❌ Falha: " + JSON.stringify(d))
    }}>
      Testar Conexão
    </button>

    {/* Botão de reenvio em lote */}
    <button onClick={async () => {
      if (!confirm("Reenviar eventos das últimas 2h?")) return
      setBulkResending(true)
      const r = await fetch("/api/tracking/bulk-resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sinceMinutes: 120 }),
      })
      const d = await r.json()
      setBulkResendResult(d)
      setBulkResending(false)
      fetchEvents()
    }}>
      {bulkResending ? "Reenviando…" : "Reenviar lote (2h)"}
    </button>

    {/* Tabela de eventos */}
    <table>
      <thead>
        <tr>
          <th>Evento</th>
          <th>Status</th>
          <th>Click ID</th>
          <th>Data</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {events.map((ev) => (
          <tr key={ev.id}>
            <td>{ev.event}</td>
            <td>
              <span style={{
                color: ev.kwaiStatus === "sent" ? "#22c55e"
                     : ev.kwaiStatus === "error" ? "#ef4444"
                     : ev.kwaiStatus === "skipped" ? "#6b7280"
                     : "#eab308"
              }}>
                {ev.kwaiStatus}
              </span>
            </td>
            <td>{ev.clickId?.slice(0, 30)}</td>
            <td>{new Date(ev.timestamp).toLocaleString("pt-BR")}</td>
            <td>
              <button onClick={async () => {
                const r = await fetch("/api/tracking/resend", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: ev.id }),
                })
                const d = await r.json()
                alert(d.ok ? `✅ Reenviado: ${d.kwaiStatus}` : `❌ ${d.error}`)
                fetchEvents()
              }}>
                Reenviar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    {/* Badge de erro no sidebar */}
    {/* {events.filter((e) => e.kwaiStatus === "error").length} */}
  </div>
)
```

---

## 15. Agente Opencode

**Arquivo:** `.opencode/agents/kwai-tracking.md`

```markdown
---
description: Use ONLY when editing or asking about Kwai AdsNebula tracking events, headers, or the is_attributed/testFlag/trackFlag parameters in event/route.ts or test/route.ts.
mode: all
---

# Kwai AdsNebula Tracking — Regras Fixas

## ⚠️ NUNCA ALTERE ESTES VALORES

No arquivo `app/api/tracking/event/route.ts`, os seguintes campos são **fixos** e **nunca devem ser alterados**:

```ts
{
  is_attributed: 1,        // SEMPRE 1 (int) — obrigatório, fixo
  mmpcode: "PL",           // SEMPRE "PL" — fixo
  pixelSdkVersion: "9.9.9",// SEMPRE "9.9.9" — fixo
  testFlag: false,          // SEMPRE false — eventos reais NÃO são teste
  trackFlag: false,         // SEMPRE false — campanha rodando (eventos reais)
}
```

## Regras por contexto

| Contexto | Arquivo | `testFlag` | `trackFlag` | `is_attributed` |
|----------|---------|------------|-------------|-----------------|
| Eventos reais (online) | `event/route.ts` | `false` | `false` | `1` |
| Eventos de teste | `test/route.ts` | `false` | `true` | `1` |

## Arquivos protegidos

- `app/api/tracking/event/route.ts` — payload inteiro
- `app/api/tracking/test/route.ts` — payload inteiro
- Qualquer alteração nos campos `is_attributed`, `testFlag`, `trackFlag`, `mmpcode`, `pixelSdkVersion` deve ser revisada contra esta regra.

## Motivo

Na primeira implementação, `trackFlag` foi enviado como `true` para eventos reais, fazendo o Kwai interpretar tudo como "test events". A correção foi documentar exatamente cada campo e seu valor fixo.
```

---

## 16. Como Testar

### Teste manual via Admin

1. No admin, clique em "Eventos" → "Testar Conexão"
2. O sistema envia 3 eventos (VIEW, ADD_TO_CART, PURCHASE) com `trackFlag: true`
3. No Gerenciador de Eventos do Kwai → aba **"Testar Eventos"**, você vê os 3 eventos
4. Se aparecerem, o pixel está configurado corretamente

### Teste via API direta

```bash
curl -X POST https://seudominio.com/api/tracking/test \
  -H "Content-Type: application/json" \
  -d '{"testEventCode": "meu_test_123"}'
```

### Verificar eventos no Supabase

```sql
SELECT id, event, kwai_status, kwai_response, click_id, timestamp
FROM tracking_events
ORDER BY timestamp DESC
LIMIT 20;
```

### Verificar se webhook enviou PURCHASE

```sql
SELECT * FROM tracking_events
WHERE event = 'EVENT_PURCHASE'
ORDER BY timestamp DESC;
```

### Logs no servidor

Os webhooks logam no console:
- `[BlackPay Webhook] Pedido X COMPLETED`
- `[PodPay Webhook] Pedido X COMPLETED`

Se o Kwai falhar, o erro aparece em `kwai_response` na tabela.

---

## 17. Regras Fixas do Payload

**⚠️ NUNCA ALTERAR ESTES VALORES:**

| Parâmetro | Valor | Tipo | Motivo |
|-----------|-------|------|--------|
| `is_attributed` | `1` | int | Flag de atribuição. **NÃO** usar boolean (`true`) — API rejeita com erro 10002 |
| `mmpcode` | `"PL"` | string | Marca a fonte de dados |
| `pixelSdkVersion` | `"9.9.9"` | string | Versão fixa do SDK |
| `testFlag` | `false` | boolean | Eventos reais nunca são teste |
| `trackFlag` | `false` | boolean | `false` = campanha rodando; `true` = só aparece na aba "Test Events" |

### Histórico de bugs (NÃO REPETIR):

1. **Bug #1 (07/06/2026):** `trackFlag: true` em eventos reais — Kwai interpretava tudo como "test events". Eventos reais apareciam como teste no dashboard, distorcendo métricas de atribuição.
2. **Bug #2 (07/06/2026):** `is_attributed: true` (boolean) — API rejeitou com erro `10002`. O valor correto é `1` como inteiro.

---

## 18. Checklist de Implantação

- [ ] **Dashboard Kwai:** Pixel criado, Pixel ID e Access Token anotados
- [ ] **Variáveis de ambiente:** `KWAI_PIXEL_ID` e `KWAI_ACCESS_TOKEN` no `.env.local` e na Vercel
- [ ] **Supabase:** Tabela `tracking_events` criada via SQL
- [ ] **UTMTracker:** Adicionado ao `layout.tsx` raiz
- [ ] **kwai.ts:** `trackEvent()` importado e chamado nas páginas (home, produto, checkout, payment)
- [ ] **Event route:** `app/api/tracking/event/route.ts` criado com POST + GET
- [ ] **Test route:** `app/api/tracking/test/route.ts` criado
- [ ] **Resend routes:** `resend/route.ts` e `bulk-resend/route.ts` criados
- [ ] **Webhooks:** Cada webhook de pagamento chama `sendKwaiPurchaseEvent()`
- [ ] **Admin:** Aba "Eventos" com lista, status, reenvio e teste
- [ ] **Doc viva:** `app/docs/kwai/page.tsx` acessível em `/docs/kwai`
- [ ] **Agente opencode:** `.opencode/agents/kwai-tracking.md` com regras fixas
- [ ] **`testFlag` e `trackFlag` como `false`** em eventos reais (nunca `true`)
- [ ] **`is_attributed` como `1` (int)**, não `true` (boolean)
- [ ] **SHA-256 hash** de email/phone/name antes de enviar
- [ ] **Tratamento de `skipped`** quando não há `clickId`
- [ ] **Teste de conexão** realizado e aprovado no admin
