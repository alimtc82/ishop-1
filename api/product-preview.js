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

function firstImage(value) {
  if (!value) return '';
  let parsed = value;
  if (typeof parsed === 'string') {
    const text = parsed.trim();
    if (!text) return '';
    try { parsed = JSON.parse(text); } catch { return text; }
  }
  if (Array.isArray(parsed)) {
    const item = parsed.find(Boolean);
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') return item.url || item.path || item.src || item.publicUrl || '';
  }
  if (parsed && typeof parsed === 'object') return parsed.url || parsed.path || parsed.src || parsed.publicUrl || '';
  return '';
}

function publicImage(value, supabaseUrl, bucket = 'product-images') {
  if (!value || !supabaseUrl) return '';
  const raw = String(value).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  const clean = raw.replace(/^\/+/, '').replace(new RegExp(`^${bucket}\\/`, 'i'), '');
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

function page({ title, description, image, url, type = 'website' }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url);
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><meta name="description" content="${safeDescription}"><link rel="canonical" href="${safeUrl}"><meta property="og:type" content="${type}"><meta property="og:site_name" content="APP TECH"><meta property="og:locale" content="ar_EG"><meta property="og:url" content="${safeUrl}"><meta property="og:title" content="${safeTitle}"><meta property="og:description" content="${safeDescription}"><meta property="og:image" content="${safeImage}"><meta property="og:image:secure_url" content="${safeImage}"><meta property="og:image:alt" content="${safeTitle}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${safeTitle}"><meta name="twitter:description" content="${safeDescription}"><meta name="twitter:image" content="${safeImage}"></head><body></body></html>`;
}

async function getRow(endpoint, supabaseKey) {
  const result = await fetch(endpoint, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    },
  });
  if (!result.ok) return null;
  const rows = await result.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

export default async function handler(request, response) {
  const proto = String(request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(request.headers['x-forwarded-host'] || request.headers.host || 'apptech.mtc-group.online').split(',')[0].trim();
  const origin = `${proto}://${host}`;
  const id = typeof request.query.id === 'string' ? request.query.id.trim() : '';
  const requestedPath = typeof request.query.path === 'string' && /^\/(?:product|d)\/[^/]+\/?$/.test(request.query.path)
    ? request.query.path
    : (id ? `/product/${encodeURIComponent(id)}` : '/');
  const isDevicePath = requestedPath.startsWith('/d/');
  const fallbackImage = `${origin}/app-tech-og.png`;

  let title = FALLBACK_TITLE;
  let description = FALLBACK_DESCRIPTION;
  let image = fallbackImage;
  let type = 'website';

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (id && supabaseUrl && supabaseKey) {
    try {
      if (isDevicePath) {
        const endpoint = new URL('/rest/v1/devices', supabaseUrl);
        endpoint.searchParams.set('select', 'model,storage,color,images');
        endpoint.searchParams.set('device_code', `eq.${id}`);
        endpoint.searchParams.set('archived', 'eq.false');
        endpoint.searchParams.set('limit', '1');
        const device = await getRow(endpoint, supabaseKey);
        if (device) {
          const name = [device.model, device.storage].filter(Boolean).join(' ') || 'جهاز مستعمل';
          title = `${name} — APP TECH`;
          description = `${[device.model, device.storage, device.color].filter(Boolean).join(' · ')} — جهاز مستعمل بحالة ممتازة من APP TECH`;
          image = publicImage(firstImage(device.images), supabaseUrl, 'product-images') || fallbackImage;
          type = 'product';
        }
      } else {
        const endpoint = new URL('/rest/v1/products', supabaseUrl);
        endpoint.searchParams.set('select', 'name,notes,images');
        endpoint.searchParams.set('id', `eq.${id}`);
        endpoint.searchParams.set('is_active', 'eq.true');
        endpoint.searchParams.set('limit', '1');
        const product = await getRow(endpoint, supabaseKey);
        if (product?.name) {
          title = product.name;
          description = product.notes?.trim() || `${product.name} — APP TECH`;
          image = publicImage(firstImage(product.images), supabaseUrl, 'product-images') || fallbackImage;
          type = 'product';
        }
      }
    } catch (_) {}
  }

  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  response.status(200).send(page({ title, description, image, url: `${origin}${requestedPath}`, type }));
}
