/**
 * V11.29 — تمييز «جلسة عميل التقييمات» عن «جلسة الموظف».
 *
 * ليه الملف ده موجود؟
 * Supabase بيربط أي identity جديدة بحساب موجود بنفس الإيميل تلقائيًا
 * (Automatic Linking). لما ده يحصل، `app_metadata.provider` بيفضل زي ما هو
 * (مثلًا 'email')، و facebook بيتضاف جوّه `app_metadata.providers` بس.
 *
 * النتيجة: الفحص القديم `provider === 'facebook'` كان بيفشل، فـ AuthContext
 * كان بيعتبرها جلسة موظف من غير «تذكرني» ويعمل signOut — يعني الجلسة كانت
 * بتتقفل قبل ما صفحة التقييمات تشوفها أصلًا.
 *
 * الحل: علامة محلية بتتحط لحظة بدء الدخول بفيسبوك من صفحة التقييمات،
 * وبتفضل موجودة طول ما جلسة العميل شغالة، وبتتمسح عند خروج العميل
 * أو دخول/خروج الموظف.
 *
 * ⚠️ العلامة دي مش أداة صلاحيات. الصلاحيات كلها لسه على السيرفر (RLS).
 *    دي مجرد إشارة عن «مين اللي بدأ الجلسة دي» عشان الواجهة تتصرف صح.
 */

const KEY = 'ishop_customer_session';

/** بتتنادى قبل التحويل لفيسبوك من صفحة التقييمات. */
export function markCustomerLogin() {
  try { localStorage.setItem(KEY, '1'); } catch { /* التخزين مقفول */ }
}

/** بتتنادى عند خروج العميل، أو عند دخول/خروج موظف. */
export function clearCustomerLogin() {
  try { localStorage.removeItem(KEY); } catch { /* التخزين مقفول */ }
}

export function isCustomerLoginMarked() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

/**
 * هل الجلسة دي بتاعة عميل تقييمات (مش موظف)؟
 *  - حساب فيسبوك خالص  → عميل دايمًا.
 *  - حساب متربط (إيميل + فيسبوك) → عميل بس لو الدخول اتبدأ من صفحة التقييمات.
 */
export function isCustomerSession(session) {
  const meta = session?.user?.app_metadata;
  if (!meta) return false;
  if (meta.provider === 'facebook') return true;
  const providers = Array.isArray(meta.providers) ? meta.providers : [];
  return providers.includes('facebook') && isCustomerLoginMarked();
}
