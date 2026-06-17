(function() {
  'use strict';

  window.kwaiTrack = function(payload) {
    if (typeof window === 'undefined') return;

    var callback = null;
    try {
      callback = sessionStorage.getItem('kwai_callback') || localStorage.getItem('kwai_callback');
      if (!callback) {
        var match = document.cookie.match(/(?:^|;\s*)kwai_click_id=([^;]+)/);
        if (match) callback = decodeURIComponent(match[1]);
      }
    } catch(e) {}

    var utms = {};
    try {
      var raw = sessionStorage.getItem('kwai_url_params') || localStorage.getItem('kwai_url_params');
      if (raw) utms = JSON.parse(raw);
    } catch(e) {}

    var customerData = {};
    try {
      var orderRaw = sessionStorage.getItem('orderData');
      if (orderRaw) {
        var data = JSON.parse(orderRaw);
        if (data.email) customerData.customerEmail = data.email;
        if (data.nome || data.name) customerData.customerName = data.nome || data.name;
        if (data.celular || data.phone) customerData.customerPhone = data.celular || data.phone;
      }
    } catch(e) {}

    var body = {
      event: payload.event,
      value: payload.value,
      currency: payload.currency || 'BRL',
      orderId: payload.orderId,
      page: payload.page || window.location.pathname,
      productSlug: payload.productSlug,
      callback: callback,
      campaignId: utms['utm_campaign'] || utms['kwai_CampaignID'] || undefined,
      adSetId: utms['utm_medium'] || utms['kwai_adSETID'] || undefined,
      creativeId: utms['kwai_CreativeID'] || utms['kwai_creativeid'] || undefined,
      pixelId: utms['kwai_pixel_id'] || utms['kwai_PixelID'] || undefined,
      utms: utms,
      url: window.location.origin + '/',
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    for (var k in customerData) body[k] = customerData[k];

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/kwai/event', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(body));
    } catch(e) {
      console.warn('[Kwai] track error:', e);
    }
  };
})();
