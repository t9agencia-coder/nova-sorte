import { supabaseSelect, supabaseUpdate } from '../../lib/supabase.js';
import crypto from 'crypto';

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

function sha256(val) {
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    var body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
    var id = body.id;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Missing id' });
    }

    var rows = await supabaseSelect('tracking_events', '?select=*&id=eq.' + encodeURIComponent(id) + '&limit=1');

    if (!rows || rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Evento nao encontrado' });
    }

    var row = rows[0];
    var retries = (row.retries || 0) + 1;
    var utms = row.utms || {};
    var creds = getCredentials(row.product_slug);

    if (!row.click_id) {
      return res.status(400).json({ ok: false, error: 'Evento sem click_id, nao pode ser reenviado' });
    }

    var userData = {};
    if (row.customer_email) userData.email = sha256(row.customer_email);

    var payload = {
      access_token: creds.accessToken,
      clickid: row.click_id,
      event_name: row.event,
      is_attributed: 1,
      mmpcode: 'PL',
      pixelId: creds.pixelId,
      pixelSdkVersion: '9.9.9',
      testFlag: false,
      trackFlag: false,
      currency: row.currency || 'BRL',
    };

    if (utms['utm_campaign'])      payload.CampaignID = utms['utm_campaign'];
    if (utms['utm_medium'])        payload.adSETID = utms['utm_medium'];
    if (utms['kwai_CreativeID'] || utms['kwai_creativeid']) payload.CreativeID = utms['kwai_CreativeID'] || utms['kwai_creativeid'];
    if (row.value)                 payload.value = String(row.value);
    if (row.order_id)              payload.order_id = row.order_id;
    if (Object.keys(userData).length > 0) payload.user_data = JSON.stringify(userData);

    var result;
    try {
      var apiRes = await fetch(KWAI_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var text = await apiRes.text();
      var parsed;
      try { parsed = JSON.parse(text); } catch(e) { parsed = text; }
      var ok = typeof parsed === 'object' && parsed !== null && parsed.result === 1;
      result = { ok: ok, body: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2) };
    } catch (e) {
      result = { ok: false, body: e.message || 'Erro de rede' };
    }

    var kwaiStatus = result.ok ? 'sent' : 'error';

    await supabaseUpdate('tracking_events', id, {
      kwai_status: kwaiStatus,
      kwai_response: result.body,
      retries: retries,
    });

    return res.status(200).json({ ok: true, id: id, kwaiStatus: kwaiStatus, response: result.body });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
