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
