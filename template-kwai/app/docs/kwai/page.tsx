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
