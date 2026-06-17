(function() {
  'use strict';

  function parseUtmContent(val) {
    var parts = val.split('::');
    if (parts.length >= 3) return { CreativeID: parts[0], callback: parts[1], pixel_id: parts[2] };
    if (parts.length === 2) return { CreativeID: parts[0], callback: parts[1] };
    return { utm_content_raw: val };
  }

  function parseUrlParams() {
    var params = new URLSearchParams(window.location.search);
    var kwaiKeys = ['click_id','pixel_id','CampaignID','adSETID','CreativeID','callback',
      '__CMPNID__','__ADSETID__','__ADID__','__CALLBACK__','__KS_PIXELID__'];
    var utmKeys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
    var result = { kwai: {}, utm: {}, all: {} };

    params.forEach(function(value, key) {
      result.all[key] = value;
      if (kwaiKeys.indexOf(key) !== -1) {
        result.kwai[key.replace(/^__|__$/g, '')] = value;
      }
      if (utmKeys.indexOf(key.toLowerCase()) !== -1 || key.toLowerCase().indexOf('utm_') === 0) {
        result.utm[key] = value;
      }
      if (key === 'utm_content' && value.indexOf('::') !== -1) {
        var parsed = parseUtmContent(value);
        for (var k in parsed) {
          result.kwai[k] = parsed[k];
          result.all['kwai_' + k] = parsed[k];
        }
      }
    });

    return result;
  }

  function saveKwaiClickId(clickId) {
    try {
      localStorage.setItem('kwai_click_id', clickId);
      sessionStorage.setItem('kwai_click_id', clickId);
      var expires = new Date(Date.now() + 86400000).toUTCString();
      document.cookie = 'kwai_click_id=' + encodeURIComponent(clickId) + ';expires=' + expires + ';path=/;SameSite=Lax';
    } catch(e) {}
  }

  function saveUrlParams(parsed) {
    if (Object.keys(parsed.all).length === 0) return;

    var enriched = {};
    for (var k in parsed.all) enriched[k] = parsed.all[k];
    for (var k2 in parsed.kwai) enriched['kwai_' + k2] = parsed.kwai[k2];

    localStorage.setItem('kwai_url_params', JSON.stringify(enriched));
    sessionStorage.setItem('kwai_url_params', JSON.stringify(enriched));

    var existing = sessionStorage.getItem('utm_params');
    var merged = existing ? JSON.parse(existing) : {};
    for (var k3 in enriched) merged[k3] = enriched[k3];
    sessionStorage.setItem('utm_params', JSON.stringify(merged));
    localStorage.setItem('utm_params', JSON.stringify(merged));

    var callback = parsed.kwai['callback'] || parsed.kwai['click_id'] || parsed.all['click_id'];
    if (callback) {
      sessionStorage.setItem('kwai_callback', callback);
      localStorage.setItem('kwai_callback', callback);
      saveKwaiClickId(callback);
    }
  }

  function capture() {
    var parsed = parseUrlParams();
    if (Object.keys(parsed.all).length > 0) {
      saveUrlParams(parsed);
    } else {
      var stored = localStorage.getItem('kwai_url_params');
      if (stored) {
        try { sessionStorage.setItem('kwai_url_params', stored); } catch(e) {}
      }
    }
  }

  capture();

  var origPushState = history.pushState;
  history.pushState = function() {
    origPushState.apply(history, arguments);
    setTimeout(capture, 100);
  };
  window.addEventListener('popstate', capture);
})();
