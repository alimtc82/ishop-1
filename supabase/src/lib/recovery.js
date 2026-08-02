import { supabase } from './supabase';

/** auth.js:514 — هل الرابط الحالي رابط استعادة؟ */
export function isRecoveryLink() {
  const h = String(location.hash || '');
  const q = String(location.search || '');

  // V11.29: رجعة Facebook OAuth بتيجي على /reviews?oauth=facebook&code=...
  // الشرط `/[?&]code=/` تحت كان بيلقطها ويعتبرها لينك استعادة فاشل،
  // فكانت بتطلع رسالة «الرابط منتهي أو مستخدم قبل كده» بالغلط.
  if (/[?&]oauth=facebook\b/.test(q)) return false;

  return (
    h.includes('type=recovery') ||
    q.includes('type=recovery') ||
    /[?&]token_hash=/.test(q) ||
    /[?&]code=/.test(q)
  );
}

/**
 * auth.js:525 — نبادل الـ token_hash بجلسة استعادة مؤقتة،
 * وبنشيل التوكن من شريط العنوان بعدها.
 */
export async function exchangeRecoveryToken() {
  const params = new URLSearchParams(location.search);
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (!tokenHash || type !== 'recovery') return false;

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    });
    if (error || !data?.session) {
      history.replaceState(null, '', location.pathname);
      return false;
    }
    history.replaceState(null, '', location.pathname);
    return true;
  } catch {
    history.replaceState(null, '', location.pathname);
    return false;
  }
}
