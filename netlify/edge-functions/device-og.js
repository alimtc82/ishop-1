// يحقن صورة الجهاز وبياناته في تاجات OG لروابط /d/:code
// عشان تظهر صورة الجهاز نفسه في معاينة الرابط (واتساب/تليجرام/فيسبوك)
// المنصات دي مش بتشغّل JavaScript، فلازم الحقن يحصل على مستوى الـ edge.

const SUPA = 'https://xsanzqeumjdyiwkutepj.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzYW56cWV1bWpkeWl3a3V0ZXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjE0MzMsImV4cCI6MjA5MzgzNzQzM30.Fh4ue0HT_NHqAv8Pi2kEm6MAMrWwhJLnuGrQSqE4lW0';
const ORIGIN = 'https://ishop.mtc-group.online';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default async (request, context) => {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/d\/([^/?#]+)/);
  const res = await context.next();

  if (!m) return res;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return res;

  const code = decodeURIComponent(m[1]);

  // جلب بيانات الجهاز (anon + قراءة الزائر) — من غير الأرشفة
  let dev = null;
  try {
    const q =
      `${SUPA}/rest/v1/devices?device_code=eq.${encodeURIComponent(code)}` +
      `&archived=eq.false&select=model,storage,color,images&limit=1`;
    const r = await fetch(q, { headers: { apikey: ANON, authorization: `Bearer ${ANON}` } });
    if (r.ok) {
      const rows = await r.json();
      dev = Array.isArray(rows) ? rows[0] : null;
    }
  } catch (_) {
    // نتجاهل ونرجّع الـ HTML الأصلي
  }
  if (!dev) return res;

  const img = Array.isArray(dev.images) && dev.images[0] ? String(dev.images[0]) : null;
  const name = [dev.model, dev.storage].filter(Boolean).join(' ') || 'جهاز';
  const title = `${name} — iShop`;
  const desc =
    `${[dev.model, dev.storage, dev.color].filter(Boolean).join(' · ')} — جهاز مستعمل بحالة ممتازة من iShop`;
  const pageUrl = `${ORIGIN}${url.pathname}`;

  let html = await res.text();

  const setMeta = (attr, key, val) => {
    const re = new RegExp(`(<meta\\s+${attr}=["']${key}["']\\s+content=["'])[^"']*(["'])`, 'i');
    if (re.test(html)) html = html.replace(re, `$1${esc(val)}$2`);
  };

  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', pageUrl);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', desc);

  if (img) {
    setMeta('property', 'og:image', img);
    setMeta('property', 'og:image:secure_url', img);
    setMeta('property', 'og:image:alt', name);
    setMeta('name', 'twitter:image', img);
    setMeta('name', 'twitter:image:alt', name);
    // نشيل الأبعاد الثابتة (1200x630) عشان المنصة تكتشف أبعاد صورة الجهاز الفعلية
    html = html.replace(/\s*<meta\s+property=["']og:image:width["'][^>]*>/i, '');
    html = html.replace(/\s*<meta\s+property=["']og:image:height["'][^>]*>/i, '');
  }

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`);

  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'public, max-age=120');
  return new Response(html, { status: res.status, headers });
};

export const config = { path: '/d/*' };
