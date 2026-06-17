const PODPAY_API = 'https://api.podpay.app/v1/transactions';

export default async function handler(req, res) {
  const apiKey = process.env.PODPAY_API_KEY;

  if (!apiKey || apiKey.startsWith('SUA_CHAVE')) {
    return res.status(500).json({
      success: false,
      error: { message: 'PodPay API key not configured. Set PODPAY_API_KEY in env.' }
    });
  }

  // GET: consultar status da transação
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: { message: 'Missing id param' } });
    }

    try {
      const response = await fetch(`${PODPAY_API}/${id}`, {
        headers: { 'x-api-key': apiKey }
      });
      const data = await response.json();
      if (response.ok) {
        return res.status(200).json({ success: true, data });
      } else {
        return res.status(200).json({ success: false, error: data.error || data });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  // POST: criar transação PIX
  if (req.method === 'POST') {
    const { amount, customer, items } = req.body;

    if (!amount || !customer) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields: amount, customer' }
      });
    }

    const idempotencyKey = `saque_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const webhookUrl = `https://${req.headers.host}/api/webhook-podpay`;

    try {
      const response = await fetch(PODPAY_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          paymentMethod: 'pix',
          postbackUrl: webhookUrl,
          amount,
          customer,
          items: items || [{
            title: 'Taxa de confirmação de identidade',
            unitPrice: amount,
            quantity: 1,
            tangible: false
          }]
        })
      });

      const data = await response.json();
      if (response.ok) {
        return res.status(200).json({ success: true, data });
      } else {
        return res.status(200).json({ success: false, error: data.error || data });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: { message: err.message } });
    }
  }

  return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
}
