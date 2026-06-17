const KWAI_API = 'https://www.adsnebula.com/log/common/api';

function getCredentials(productSlug) {
  if (productSlug) {
    var key = productSlug.toUpperCase();
    var pixelId = (process.env['KWAI_PIXEL_ID_' + key] || '').trim();
    var token = (process.env['KWAI_ACCESS_TOKEN_' + key] || '').trim();
    if (pixelId && token) return { pixelId: pixelId, accessToken: token };
  }
  return {
    pixelId: (process.env.KWAI_PIXEL_ID || '').trim(),
    accessToken: (process.env.KWAI_ACCESS_TOKEN || '').trim(),
  };
}

async function sendToAdsNebula(pixelId, accessToken, eventName, clickId, extra) {
  try {
    var payload = {
      access_token: accessToken,
      clickid: clickId,
      event_name: eventName,
      is_attributed: 1,
      mmpcode: 'PL',
      pixelId: pixelId,
      pixelSdkVersion: '9.9.9',
      testFlag: false,
      trackFlag: true,
      currency: 'BRL',
    };

    for (var k in extra) payload[k] = extra[k];

    var res = await fetch(KWAI_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    var text = await res.text();
    var parsed;
    try { parsed = JSON.parse(text); } catch(e) { parsed = text; }
    var ok = typeof parsed === 'object' && parsed !== null && parsed.result === 1;
    return { ok: ok, status: res.status, body: text, payload: payload };
  } catch (e) {
    return { ok: false, status: 0, body: e.message || 'Erro de rede', payload: {} };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    var body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
    var testEventCode = body.testEventCode;
    var productSlug = body.productSlug;
    var creds = getCredentials(productSlug);

    if (!creds.pixelId || !creds.accessToken) {
      return res.status(400).json({ ok: false, error: 'Pixel nao configurado. Configure KWAI_PIXEL_ID e KWAI_ACCESS_TOKEN.' });
    }

    var clickId = testEventCode || 'test_click_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    var events = [
      { event_name: 'EVENT_CONTENT_VIEW', extra: {} },
      { event_name: 'EVENT_ADD_TO_CART', extra: { value: '21.90' } },
      { event_name: 'EVENT_PURCHASE', extra: { value: '21.90', order_id: 'test_order_' + Date.now() } },
    ];

    var results = await Promise.all(events.map(function(ev) {
      return sendToAdsNebula(creds.pixelId, creds.accessToken, ev.event_name, clickId, ev.extra);
    }));

    var successCount = results.filter(function(r) { return r.ok; }).length;

    return res.status(200).json({
      ok: successCount === events.length,
      pixelUsed: creds.pixelId,
      clickIdUsed: clickId,
      eventsSent: events.map(function(e) { return e.event_name; }),
      successCount: successCount,
      totalCount: events.length,
      results: results.map(function(r, i) {
        var parsed;
        try { parsed = JSON.parse(r.body); } catch(e) { parsed = r.body; }
        return {
          event: events[i].event_name,
          status: r.status,
          body: r.body,
          success: r.ok,
          parsed: parsed,
        };
      }),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Erro interno' });
  }
}
