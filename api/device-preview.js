const SUPA = 'https://xsanzqeumjdyiwkutepj.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzYW56cWV1bWpkeWl3a3V0ZXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjE0MzMsImV4cCI6MjA5MzgzNzQzM30.Fh4ue0HT_NHqAv8Pi2kEm6MAMrWwhJLnuGrQSqE4lW0';

const FALLBACK_TITLE = 'APP TECH';
const FALLBACK_DESCRIPTION = 'بوابتك الآمنة إلى العالم الرقمي';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function firstImage(images) {
  if (!images) return '';
  let value = images;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return '';
    try { value = JSON.parse(text); } catch { return text; }
  }
  if (Array.isArray(value)) {
    const item = value.find(Boolean);
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') return item.url || item.path || item.src || item.publicUrl || '';
    return '';
  }
  if (typeof value === 'object') return value.url || value.path || value.src || value.publicUrl || '';
  return '';
}

function publicDeviceImage(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  const clean = raw.replace(/^\/+/, '').replace(/^device-images\//i, '');
  return `${SUPA}/storage/v1/object/public/device-images/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

function renderPage({ title, description, image, url }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url);
  return `<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title><meta name="description" content="${safeDescription}">
<link rel="canonical" href="${safeUrl}">
<meta property="og:type" content="product"><meta property="og:site_name" content="APP TECH">
<meta property="og:locale" content="ar_EG"><meta property="og:url" content="${safeUrl}">
<meta property="og:title" content="${safeTitle}"><meta property="og:description" content="${safeDescription}">
<meta property="og:image" content="${safeImage}"><meta property="og:image:secure_url" content="${safeImage}">
<meta property="og:image:alt" content="${safeTitle}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}"><meta name="twitter:image" content="${safeImage}">
</head><body></body></html>`;
}

export default async function handler(request, response) {
  const proto = String(request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(request.headers['x-forwarded-host'] || request.headers.host || 'apptech.mtc-group.online').split(',')[0].trim();
  const origin = `${proto}://${host}`;
  const code = typeof request.query.code === 'string' ? request.query.code.trim() : '';
  const canonical = code ? `${origin}/d/${encodeURIComponent(code)}` : origin;
  const fallbackImage = `${origin}/app-tech-og.png`;

  let title = FALLBACK_TITLE;
  let description = FALLBACK_DESCRIPTION;
  let image = fallbackImage;

  if (code) {
    try {
      const endpoint = new URL('/rest/v1/devices', SUPA);
      endpoint.searchParams.set('select', 'model,storage,color,images');
      endpoint.searchParams.set('device_code', `eq.${code}`);
      endpoint.searchParams.set('archived', 'eq.false');
      endpoint.searchParams.set('limit', '1');
      const result = await fetch(endpoint, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Accept: 'application/json' },
      });
      const device = result.ok ? (await result.json())[0] : null;
      if (device) {
        const name = [device.model, device.storage].filter(Boolean).join(' ') || 'جهاز مستعمل';
        title = name;
        description = `${[device.model, device.storage, device.color].filter(Boolean).join(' · ')} — جهاز مستعمل من APP TECH`;
        image = publicDeviceImage(firstImage(device.images)) || fallbackImage;
      }
    } catch {}
  }

  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  response.status(200).send(renderPage({ title, description, image, url: canonical }));
}
