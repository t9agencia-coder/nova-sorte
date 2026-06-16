function generatePixCode(amount, nome) {
  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = [
    '000201',
    '26360014BR.GOV.BCB.PIX',
    `52040000${String(amount).replace('.', '').padStart(10, '0')}`,
    `5303986`,
    `5802BR`,
    `5925${nome.substring(0, 25).toUpperCase()}`,
    `6008BRASILIA`,
    `62070503***`,
    `6304`
  ].join('\n');

  return { pixCode: payload, transactionId: txId };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { valor, nome, cpf, email } = req.body;

  if (!valor) {
    return res.status(400).json({ error: 'Missing required field: valor' });
  }

  const cleanName = (nome || 'Cliente').trim().substring(0, 25);
  const amount = parseFloat(String(valor).replace(',', '.'));

  const { pixCode, transactionId } = generatePixCode(amount, cleanName);

  return res.status(200).json({
    success: true,
    pix_code: pixCode,
    pix_qr_code: null,
    id: transactionId,
    transaction_id: transactionId,
    message: 'PIX gerado com sucesso (simulado)'
  });
}
