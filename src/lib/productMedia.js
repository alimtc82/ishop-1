import { supabase } from './supabase';

export function publicMediaUrl(bucket, path) {
  if (!path) return '';
  const raw = String(path).trim();
  // Older/imported products may already store a complete public URL.
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  // Accept values saved as either `products/file.jpg`, `product-images/products/file.jpg`
  // or `/product-images/products/file.jpg` without duplicating the bucket name.
  const clean = raw.replace(/^\/+/, '');
  const prefix = `${bucket}/`;
  const objectPath = clean.startsWith(prefix) ? clean.slice(prefix.length) : clean;
  return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
}


export async function uploadMedia(bucket, file, folder = 'catalog') {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safe = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(safe, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return safe;
}
