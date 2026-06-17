const KWAI_EVENT_API = process.env.CANONICAL_EVENT_URL
  ? process.env.CANONICAL_EVENT_URL.replace(/\/+$/, '') + '/api/kwai/event'
  : 'https://nova-sorte-funil.vercel.app/api/kwai/event';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
  }

  const body = req.body;

  console.log('[WEBHOOK PodPay] Recebido:', JSON.stringify(body));

  const event = body.data || body;
  const transactionId = event.id || body.id;
  const status = event.status || body.status;

  console.log(`[WEBHOOK PodPay] Transação ${transactionId} → ${status}`);

  // Se pagamento confirmado, envia EVENT_PURCHASE para Kwai
  if (status === 'paid' || status === 'completed') {
    try {
      const amount = event.amount || event.value || 0;
      const centsToReais = amount > 100 ? amount / 100 : amount;
      const kwaiPayload = {
        event: 'EVENT_PURCHASE',
        value: centsToReais,
        currency: 'BRL',
        orderId: transactionId,
        page: '/checkup/purchase',
        callback: event.clickId || event.click_id || null,
        timestamp: Date.now(),
      };

      await fetch(KWAI_EVENT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kwaiPayload),
      });

      console.log(`[WEBHOOK PodPay] EVENT_PURCHASE enviado para Kwai (${transactionId})`);
    } catch (kwaiErr) {
      console.error(`[WEBHOOK PodPay] Erro ao enviar EVENT_PURCHASE:`, kwaiErr.message);
    }
  }

  return res.status(200).json({ received: true });
}
