import { createClient } from '@supabase/supabase-js';

/**
 * الدومين النهائي — يتم جلبه من متغيرات البيئة.
 */
export const PROD_ORIGIN = import.meta.env.VITE_PROD_ORIGIN || 'https://ishop.mtc-group.online';

export const isProdOrigin = () =>
  typeof window !== 'undefined' && window.location.origin === PROD_ORIGIN;

/**
 * تهيئة عميل Supabase باستخدام متغيرات البيئة.
 * يتم استخدام VITE_ prefix لضمان وصول Vite للمتغيرات في الواجهة الأمامية.
 */
const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error(
    '❌ Missing Supabase configuration. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

export const supabase = createClient(URL || '', KEY || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
