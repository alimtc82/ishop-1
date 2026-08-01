const SUPA='https://xsanzqeumjdyiwkutepj.supabase.co';
const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzYW56cWV1bWpkeWl3a3V0ZXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjE0MzMsImV4cCI6MjA5MzgzNzQzM30.Fh4ue0HT_NHqAv8Pi2kEm6MAMrWwhJLnuGrQSqE4lW0';

const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function firstImage(images){
  if(!images) return '';
  let v=images;
  if(typeof v==='string'){
    const t=v.trim();
    if(!t) return '';
    try { v=JSON.parse(t); } catch { return t; }
  }
  if(Array.isArray(v)){
    const x=v.find(Boolean);
    if(typeof x==='string') return x;
    if(x && typeof x==='object') return x.url||x.path||x.src||x.publicUrl||'';
    return '';
  }
  if(typeof v==='object') return v.url||v.path||v.src||v.publicUrl||'';
  return '';
}

function publicImage(value,site){
  if(!value) return `${site}/og-image.jpg`;
  const raw=String(value).trim();
  if(/^https?:\/\//i.test(raw)) return raw;
  const clean=raw.replace(/^\/+/,'').replace(/^product-images\//i,'');
  const encoded=clean.split('/').map(encodeURIComponent).join('/');
  return `${SUPA}/storage/v1/object/public/product-images/${encoded}`;
}

export default async function handler(req,res){
  const id=String(req.query?.id||'').trim();
  const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'ishop-1.vercel.app').split(',')[0].trim();
  const site=`${proto}://${host}`;
  const appUrl=`${site}/product/${encodeURIComponent(id)}?app=1`;
  if(!id) return res.redirect(302,'/');

  try{
    const q=`${SUPA}/rest/v1/products?id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=id,name,sku,images,notes&limit=1`;
    const r=await fetch(q,{headers:{apikey:ANON,authorization:`Bearer ${ANON}`}});
    const rows=r.ok?await r.json():[];
    const p=Array.isArray(rows)?rows[0]:null;
    if(!p) return res.redirect(302,appUrl);

    const name=String(p.name||'iShop').trim();
    const image=publicImage(firstImage(p.images),site);
    const canonical=`${site}/product/${encodeURIComponent(id)}`;
    const desc=p.notes ? String(p.notes).replace(/\s+/g,' ').trim().slice(0,180) : `${name} — iShop MTC Group`;

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(`<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="iShop — MTC Group">
<meta property="og:title" content="${esc(name)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(name)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
</head><body><script>location.replace(${JSON.stringify(appUrl)})</script><a href="${esc(appUrl)}">${esc(name)}</a></body></html>`);
  }catch(_){
    return res.redirect(302,appUrl);
  }
}