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
    var sinceMinutes = body.sinceMinutes || 120;
    var since = Date.now() - sinceMinutes * 60 * 1000;

    var rows = await supabaseSelect('tracking_events', '?select=*&gte.timestamp=' + since + '&order=timestamp.desc');

    if (!rows || rows.length === 0) {
      return res.status(200).json({ ok: true, total: 0, message: 'Nenhum evento encontrado no periodo' });
    }

    var results = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var retries = (row.retries || 0) + 1;
      var utms = row.utms || {};
      var creds = getCredentials(row.product_slug);

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

      await supabaseUpdate('tracking_events', row.id, {
        kwai_status: kwaiStatus,
        kwai_response: result.body,
        retries: retries,
      });

      results.push({ id: row.id, event: row.event, ok: result.ok, kwaiStatus: kwaiStatus, response: result.body });
    }

    var successCount = results.filter(function(r) { return r.ok; }).length;

    return res.status(200).json({
      ok: true,
      total: results.length,
      successCount: successCount,
      errorCount: results.length - successCount,
      results: results,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
