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

function publicProductImage(value, supabaseUrl) {
  if (!value || !supabaseUrl) return '';
  const raw = String(value).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  const clean = raw.replace(/^\/+/, '').replace(/^product-images\//, '');
  const safePath = clean.split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/product-images/${safePath}`;
}

function page({ title, description, image, url, isProduct }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url);
  const type = isProduct ? 'product' : 'website';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="APP TECH">
  <meta property="og:locale" content="ar_EG">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImage}">
</head>
<body></body>
</html>`;
}

export default async function handler(request, response) {
  const origin = `https://${request.headers['x-forwarded-host'] || request.headers.host || 'ishop.mtc-group.online'}`;
  const id = typeof request.query.id === 'string' ? request.query.id : '';
  const fallbackImage = `${origin}/og-image.jpg`;
  let title = FALLBACK_TITLE;
  let description = FALLBACK_DESCRIPTION;
  let image = fallbackImage;
  let isProduct = false;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (id && supabaseUrl && supabaseKey) {
    try {
      const endpoint = new URL('/rest/v1/products', supabaseUrl);
      endpoint.searchParams.set('select', 'name,notes,images');
      endpoint.searchParams.set('id', `eq.${id}`);
      endpoint.searchParams.set('is_active', 'eq.true');
      endpoint.searchParams.set('limit', '1');

      const result = await fetch(endpoint, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
      });
      const rows = result.ok ? await result.json() : [];
      const product = Array.isArray(rows) ? rows[0] : null;

      if (product?.name) {
        title = product.name;
        description = product.notes?.trim() || `اكتشف ${product.name} على APP TECH`;
        image = publicProductImage(Array.isArray(product.images) ? product.images[0] : '', supabaseUrl) || fallbackImage;
        isProduct = true;
      }
    } catch {
      // Return the safe general preview if the product query is unavailable.
    }
  }

  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  response.status(200).send(page({
    title,
    description,
    image,
    url: id ? `${origin}/product/${encodeURIComponent(id)}` : origin,
    isProduct,
  }));
}
