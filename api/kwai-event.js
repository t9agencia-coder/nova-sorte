const ADS_NEBULA_URL = 'https://adsnebula.com/log/common/api';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clickid, event_name, currency, value, order_id } = req.body;

  if (!clickid || !event_name) {
    return res.status(400).json({ error: 'Missing required fields: clickid, event_name' });
  }

  const pixelId = process.env.KWAI_PIXEL_ID || '';
  const accessToken = process.env.KWAI_ACCESS_TOKEN || '';

  const payload = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    click_id: clickid,
    pixel_id: pixelId,
    mmpcode: 'PL',
    pixelSdkVersion: '9.9.9',
    is_attributed: 1,
    testFlag: false,
    trackFlag: false,
    currency: currency || 'BRL',
    value: parseFloat(value) || 0,
    order_id: order_id || ''
  };

  try {
    if (accessToken && pixelId) {
      const response = await fetch(ADS_NEBULA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      return res.status(200).json({ success: true, forwarded: true, kwai_response: data });
    }

    return res.status(200).json({ success: true, forwarded: false, message: 'No KWAI credentials configured. Set KWAI_PIXEL_ID and KWAI_ACCESS_TOKEN in Vercel env vars.' });
  } catch (error) {
    console.error('Error forwarding to Kwai:', error);
    return res.status(200).json({ success: true, forwarded: false, error: error.message });
  }
}
