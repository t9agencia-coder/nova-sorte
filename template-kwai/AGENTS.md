## Goal
- Integrar Kwai AdsNebula tracking (EVENT_CONTENT_VIEW, EVENT_ADD_TO_CART, EVENT_PURCHASE).

## Constraints & Preferences
- UTMTracker salva click_id da URL em sessionStorage/localStorage/cookie.
- trackEvent() coleta callback + UTMs + campaign data + customer data e POST para /api/tracking/event.
- Server-side insere no Supabase tracking_events e envia para adsnebula.com/log/common/api.
- Webhooks de pagamento enviam EVENT_PURCHASE com clickId extraído de order.utms.
- Admin tem aba "Eventos" com status badges, reenvio e teste de conexão.
- Dados do cliente (email, phone, name) são SHA-256 antes de enviar.

## Regras Fixas (NUNCA ALTERAR)
- is_attributed: 1 (int, NÃO boolean)
- mmpcode: "PL"
- pixelSdkVersion: "9.9.9"
- testFlag: false (true apenas no endpoint de teste)
- trackFlag: false (true apenas no endpoint de teste)

## Env Vars Necessárias
- KWAI_PIXEL_ID
- KWAI_ACCESS_TOKEN
- KWAI_PIXEL_ID_{SLUG} (opcional, por produto)
- KWAI_ACCESS_TOKEN_{SLUG} (opcional, por produto)
- CANONICAL_EVENT_URL (opcional, segurança)
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## Arquivos Relevantes
- app/lib/kwai.ts
- app/components/UTMTracker.tsx
- app/api/tracking/event/route.ts
- app/api/tracking/test/route.ts
- app/api/tracking/resend/route.ts
- app/api/tracking/bulk-resend/route.ts
- lib/supabase-server.ts
- .opencode/agents/kwai-tracking.md
- app/docs/kwai-integration-guide.md
