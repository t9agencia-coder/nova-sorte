export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing required param: id' });
  }

  const pago = false;
  const status = 'PENDING';

  return res.status(200).json({
    pago,
    status,
    transaction_id: id,
    message: pago ? 'Pagamento confirmado!' : 'Aguardando pagamento...'
  });
}
