const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function headers() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    Prefer: 'return=minimal',
  };
}

export async function supabaseInsert(table, data) {
  const url = SUPABASE_URL + '/rest/v1/' + table;
  const res = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(data) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Supabase insert error ' + res.status + ': ' + text);
  }
  return true;
}

export async function supabaseUpdate(table, id, data) {
  const url = SUPABASE_URL + '/rest/v1/' + table + '?id=eq.' + encodeURIComponent(id);
  const res = await fetch(url, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Supabase update error ' + res.status + ': ' + text);
  }
  return true;
}

export async function supabaseSelect(table, queryParams) {
  const url = SUPABASE_URL + '/rest/v1/' + table + (queryParams || '');
  const h = headers();
  delete h['Prefer'];
  const res = await fetch(url, { method: 'GET', headers: h });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('Supabase select error ' + res.status + ': ' + text);
  }
  return res.json();
}

export function isConfigured() {
  return SUPABASE_URL.startsWith('https://') && SUPABASE_KEY.length > 20;
}
