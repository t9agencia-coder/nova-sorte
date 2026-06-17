import { supabaseInsert, supabaseUpdate, supabaseSelect, isConfigured } from '../../lib/supabase.js';
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

async function sendToKwai(event, productSlug) {
  var creds = getCredentials(productSlug);

  if (!creds.pixelId || !creds.accessToken) {
    return { ok: false, body: 'KWAI_PIXEL_ID ou KWAI_ACCESS_TOKEN nao configurado' };
  }

  if (!event.clickId) {
    return { ok: true, body: 'skipped - sem Kwai click ID', skipped: true };
  }

  var userData = {};
  if (event.customerEmail) userData.email = sha256(event.customerEmail);
  if (event.customerPhone) userData.phone = sha256(event.customerPhone);
  if (event.customerName)  userData.name  = sha256(event.customerName);

  var payload = {
    access_token: creds.accessToken,
    clickid: event.clickId,
    event_name: event.event,
    is_attributed: 1,
    mmpcode: 'PL',
    pixelId: creds.pixelId,
    pixelSdkVersion: '9.9.9',
    testFlag: false,
    trackFlag: false,
    currency: event.currency || 'BRL',
  };

  if (event.campaignId) payload.CampaignID = event.campaignId;
  if (event.adSetId)    payload.adSETID = event.adSetId;
  if (event.creativeId) payload.CreativeID = event.creativeId;
  if (event.value)      payload.value = String(event.value);
  if (event.orderId)    payload.order_id = event.orderId;
  if (Object.keys(userData).length > 0) payload.user_data = JSON.stringify(userData);

  try {
    var res = await fetch(KWAI_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    var text = await res.text();
    var parsed;
    try { parsed = JSON.parse(text); } catch(e) { parsed = text; }
    var ok = typeof parsed === 'object' && parsed !== null && parsed.result === 1;
    return { ok: ok, body: typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2) };
  } catch (e) {
    return { ok: false, body: e.message || 'Erro de rede' };
  }
}

export default async function handler(req, res) {
  if (!isConfigured()) {
    return res.status(500).json({ ok: false, error: 'Supabase nao configurado. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.' });
  }

  if (req.method === 'GET') {
    try {
      var events = await supabaseSelect('tracking_events', '?select=*&order=timestamp.desc');
      return res.status(200).json({ events: events, total: events.length });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      var body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
      var id = 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      var timestamp = body.timestamp || Date.now();
      var canonicalUrl = process.env.CANONICAL_EVENT_URL || (req.headers.origin || '') + '/';
      var productSlug = body.productSlug || undefined;
      var creds = getCredentials(productSlug);
      var clickId = body.callback || body.clickId || null;

      await supabaseInsert('tracking_events', {
        id: id,
        event: body.event,
        value: body.value || null,
        currency: body.currency || 'BRL',
        order_id: body.orderId || null,
        click_id: clickId,
        utms: body.utms || {},
        url: canonicalUrl,
        user_agent: body.userAgent || req.headers['user-agent'] || '',
        timestamp: timestamp,
        kwai_status: 'pending',
        kwai_response: null,
        retries: 0,
        page: body.page || null,
        pixel_id: creds.pixelId || null,
        product_slug: body.productSlug || null,
      });

      var event = {
        id: id,
        event: body.event,
        value: body.value,
        currency: body.currency || 'BRL',
        orderId: body.orderId,
        clickId: clickId,
        campaignId: body.campaignId || null,
        adSetId: body.adSetId || null,
        creativeId: body.creativeId || null,
        utms: body.utms,
        url: body.url,
        userAgent: body.userAgent || req.headers['user-agent'] || '',
        timestamp: timestamp,
        customerEmail: body.customerEmail,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
      };

      var result = await sendToKwai(event, productSlug);
      var kwaiStatus = result.skipped ? 'skipped' : (result.ok ? 'sent' : 'error');

      await supabaseUpdate('tracking_events', id, {
        kwai_status: kwaiStatus,
        kwai_response: result.body,
      });

      return res.status(200).json({ ok: true, id: id, kwaiStatus: kwaiStatus, response: result.body });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
