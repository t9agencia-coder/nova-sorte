// Exemplo de componente admin para exibir eventos Kwai
// Copie e adapte para o seu painel admin

import { useState, useEffect, useCallback } from "react"

interface TrackingEvent {
  id: string
  event: string
  value?: number
  currency?: string
  orderId?: string
  clickId?: string | null
  timestamp: number
  kwaiStatus: "pending" | "sent" | "error" | "skipped"
  kwaiResponse?: string
  retries: number
  page?: string
}

export default function AdminKwaiEvents() {
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkResending, setBulkResending] = useState(false)
  const [bulkResendResult, setBulkResendResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const r = await fetch("/api/tracking/event")
      const d = await r.json()
      if (d.events) setEvents(d.events)
    } catch (e) {
      console.error("Erro ao buscar eventos:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const filteredEvents = events
  const eventosSent = filteredEvents.filter((e) => e.kwaiStatus === "sent").length
  const eventosError = filteredEvents.filter((e) => e.kwaiStatus === "error").length

  const statusColor = (status: string) => {
    switch (status) {
      case "sent":    return "#22c55e"
      case "error":   return "#ef4444"
      case "skipped": return "#6b7280"
      default:        return "#eab308"
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Eventos Kwai Ads</h2>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 20px" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>TOTAL</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{filteredEvents.length}</div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 20px" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>ENVIADOS</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: "#22c55e" }}>{eventosSent}</div>
        </div>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: "12px 20px" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>ERROS</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: eventosError > 0 ? "#ef4444" : "#94a3b8" }}>{eventosError}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={async () => {
          setBulkResending(true)
          setBulkResendResult(null)
          try {
            const r = await fetch("/api/tracking/bulk-resend", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sinceMinutes: 120 }),
            })
            const d = await r.json()
            setBulkResendResult(d)
            await fetchEvents()
          } catch {} finally { setBulkResending(false) }
        }} disabled={bulkResending}>
          {bulkResending ? "Reenviando…" : "Reenviar lote (2h)"}
        </button>

        <button onClick={async () => {
          setTestLoading(true)
          setTestResult(null)
          try {
            const r = await fetch("/api/tracking/test", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            })
            const d = await r.json()
            setTestResult(d)
          } catch {} finally { setTestLoading(false) }
        }} disabled={testLoading}>
          {testLoading ? "Enviando…" : "Testar Conexão"}
        </button>
      </div>

      {bulkResendResult && (
        <p>{bulkResendResult.successCount}/{bulkResendResult.total} eventos reenviados</p>
      )}

      {testResult && (
        <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p>{testResult.ok ? "✅ Eventos enviados!" : "❌ Falha"}</p>
          {testResult.ok && <p>Pixel: {testResult.pixelUsed} | Click: {testResult.clickIdUsed}</p>}
          {testResult.results?.map((r: any, i: number) => (
            <p key={i} style={{ fontSize: 12, color: r.success ? "#22c55e" : "#ef4444" }}>
              {r.event}: {r.success ? "ok" : `falha (${r.status})`}
            </p>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? <p>Carregando…</p> : (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1e293b", textAlign: "left" }}>
              <th style={{ padding: "8px 12px" }}>Evento</th>
              <th style={{ padding: "8px 12px" }}>Status</th>
              <th style={{ padding: "8px 12px" }}>Click ID</th>
              <th style={{ padding: "8px 12px" }}>Data</th>
              <th style={{ padding: "8px 12px" }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((ev) => (
              <tr key={ev.id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "8px 12px" }}>{ev.event}</td>
                <td style={{ padding: "8px 12px" }}>
                  <span style={{ color: statusColor(ev.kwaiStatus), fontWeight: 600 }}>
                    {ev.kwaiStatus}
                  </span>
                </td>
                <td style={{ padding: "8px 12px", color: "#94a3b8", fontSize: 12 }}>
                  {ev.clickId?.slice(0, 30) || "-"}
                </td>
                <td style={{ padding: "8px 12px", color: "#94a3b8", fontSize: 12 }}>
                  {new Date(ev.timestamp).toLocaleString("pt-BR")}
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <button onClick={async () => {
                    const r = await fetch("/api/tracking/resend", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: ev.id }),
                    })
                    const d = await r.json()
                    alert(d.ok ? `✅ Reenviado: ${d.kwaiStatus}` : `❌ ${d.error}`)
                    fetchEvents()
                  }} style={{ fontSize: 11, padding: "4px 10px" }}>
                    Reenviar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
