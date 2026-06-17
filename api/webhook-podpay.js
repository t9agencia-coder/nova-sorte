export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
  }

  const body = req.body;

  // Log básico (os logs aparecem no dashboard da Vercel)
  console.log('[WEBHOOK PodPay] Recebido:', JSON.stringify(body));

  // PodPay pode enviar o objeto direto ou dentro de data
  const event = body.data || body;
  const transactionId = event.id || body.id;
  const status = event.status || body.status;

  console.log(`[WEBHOOK PodPay] Transação ${transactionId} → ${status}`);

  // Sempre retorna 200 para confirmar recebimento
  return res.status(200).json({ received: true });
}
