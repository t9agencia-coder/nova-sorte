# Template Kwai AdsNebula Tracking

Template pronto para copiar e colar em qualquer projeto Next.js.

## O que vem incluído

```
template-kwai/
├── AGENTS.md                          ← Cérebro: metas, regras, contexto (copia pra raiz)
├── .opencode/
│   └── agents/kwai-tracking.md        ← Trava de segurança do opencode
├── lib/
│   └── supabase-server.ts             ← Cliente Supabase lazy (service role)
├── app/
│   ├── lib/
│   │   └── kwai.ts                    ← trackEvent() client-side
│   ├── components/
│   │   └── UTMTracker.tsx             ← Captura click_id + UTMs da URL
│   ├── api/
│   │   └── tracking/
│   │       ├── event/route.ts         ← POST (enviar) + GET (listar)
│   │       ├── test/route.ts          ← POST 3 eventos de teste
│   │       ├── resend/route.ts        ← Reenviar 1 evento
│   │       └── bulk-resend/route.ts   ← Reenviar lote
│   └── docs/
│       └── kwai/
│           ├── page.tsx               ← Documentação viva em /docs/kwai
│           └── kwai-integration-guide.md  ← Guia completo passo a passo
├── admin-example/
│   └── AdminKwaiEvents.tsx            ← Componente admin funcional
└── .env.example                       ← Variáveis necessárias
```

## Como usar

1. **Copie tudo** para a raiz do novo projeto:
   ```bash
   xcopy /E /I template-kwai\* novo-projeto\
   ```

2. **Copie o AGENTS.md** para a raiz:
   ```bash
   copy template-kwai\AGENTS.md novo-projeto\
   ```

3. **Copie .opencode/** (se ainda não existe):
   ```bash
   xcopy /E /I template-kwai\.opencode novo-projeto\.opencode
   ```

4. **Configure as env vars** (veja `.env.example`)

5. **Execute o SQL** no Supabase (tabela `tracking_events`)

6. **Adicione UTMTracker** no `app/layout.tsx`

7. **Chame trackEvent()** nas páginas

## Dependências

- `@supabase/supabase-js` (já deve estar no projeto)
- `next`, `react`, `crypto` (nativo Node.js)
