import { supabase } from './supabase';
import { GUEST_DEVICE_COLS, MAX_IMG_SIZE } from './constants';
import { safeUrl } from '../utils/safeUrl';
import { markCustomerLogin, clearCustomerLogin, isCustomerSession } from './customerSession';

/**
 * طبقة واحدة بين الواجهة و Supabase.
 * كل طلب بيعدّي من هنا — عشان نقدر نراجع سطح الاتصال كله من ملف واحد
 * ونتأكد إنه مطابق حرفيًا لـ v4.5.1.
 *
 * ⚠️ عمليات الكتابة (إضافة/تعديل/حذف/أرشفة/أدمن) مش هنا عن قصد.
 *    المراحل 4 و5 و6 مؤجّلة — القرار كان الاختيار (ج).
 *
 * كل اسم عمود وكل براميتر هنا اتأكدت منه من كود v4.5.1، مش من الذاكرة.
 */

// ── RPC ────────────────────────────────────────────────────────

/** username → email. البراميتر اسمه p_username (مش p_user). */
export async function loginEmail(username) {
  const { data, error } = await supabase.rpc('login_email', { p_username: username });
  if (error) throw error;
  return data;
}

export async function verifyDeletePass(pass) {
  const { data, error } = await supabase.rpc('verify_delete_pass', { p_pass: pass });
  if (error) throw error;
  return data;
}

export async function hasDeletePass() {
  const { data, error } = await supabase.rpc('has_delete_pass');
  if (error) throw error;
  return data;
}

// ── DEVICES (قراءة) ────────────────────────────────────────────

/**
 * مطابقة لـ data.js:44-45 بالظبط:
 *
 *   الزائر        → select=GUEST_DEVICE_COLS & archived=is.false & order=id.desc
 *   المسجّل       → select=*                                      & order=id.desc
 *
 * ملاحظة مهمة: المستخدم المسجّل بيحمّل **كل** الصفوف — المؤرشفة والنشطة —
 * والفصل بينهم بيحصل في الواجهة. صفحة الأرشيف بتفلتر من نفس المصفوفة.
 * لو ضفنا فلتر archived هنا، الأرشيف هيفضى.
 */
export async function fetchDevices({ guest = false } = {}) {
  let q = supabase.from('devices');

  if (guest) {
    q = q.select(GUEST_DEVICE_COLS).eq('archived', false);
  } else {
    q = q.select('*');
  }

  const { data, error } = await q.order('id', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── USERS (قراءة) ──────────────────────────────────────────────

/**
 * صف المستخدم الحالي — منه بنقرأ الدور والصلاحيات.
 * مطابق لـ auth.js:302 → auth_id=eq.<uid> & is_active=eq.true
 */
// أعلام الصلاحيات اللي بقت تُقرأ من الدور (V11.21). req_* مش منهم —
// دول خصائص أمان فردية بتفضل على الموظف.
const ROLE_PERM_KEYS = [
  'can_create', 'can_edit', 'can_delete', 'can_archive',
  'can_settings',
  'can_settings_users', 'can_settings_roles', 'can_settings_branches', 'can_settings_catalog',
  'can_settings_reports', 'can_settings_channels', 'can_settings_prices', 'can_settings_illus',
  'can_settings_warranty', 'can_settings_reviews', 'can_settings_customers',
  'can_customer_create', 'can_customer_card', 'can_customer_phone', 'can_customer_call', 'can_customer_whatsapp',
  'can_erp','can_erp_products','can_erp_purchases','can_erp_inventory','can_erp_sales','can_erp_pos','can_erp_finance','can_erp_reports','can_erp_audit','can_erp_post','can_erp_cancel',
  'can_erp_product_create','can_erp_product_edit','can_erp_product_import','can_erp_product_export','can_erp_purchase_create','can_erp_purchase_return','can_erp_sale_create','can_erp_sale_return','can_erp_discount','can_erp_change_sale_price','can_erp_view_purchase_price','can_erp_stock_opening','can_erp_stock_transfer','can_erp_stock_adjust','can_erp_customer_create','can_erp_customer_edit','can_erp_customer_import','can_erp_customer_export','can_erp_supplier_create','can_erp_supplier_edit','can_erp_supplier_import','can_erp_supplier_export','can_erp_collect','can_erp_pay_supplier','can_erp_treasury_create','can_erp_treasury_transfer','can_erp_expense_create','can_erp_view_treasury_balance','can_erp_report_export','can_erp_backup_export','can_erp_print','can_erp_all_branches',
];

export async function fetchMyUserRow(authId) {
  const { data, error } = await supabase
    .from('ishop_users')
    .select('*')
    .eq('auth_id', authId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return data;

  // ⚠️ الصلاحيات بقت على الدور، مش على الموظف. بنجيب صف الدور وندمج
  //    أعلامه فوق صف الموظف، فالمحرّك (اللي بيقرا subject[key]) يشوف
  //    قيم الدور من غير ما يتغيّر. الأعمدة القديمة على الموظف ملغاة
  //    وبتتكتب فوقها هنا.
  // ⚠️ لازم يفضل مطابقًا لدالة role_perm() في الداتابيز.
  try {
    const { data: role } = await supabase
      .from('roles')
      .select(`is_admin, ${ROLE_PERM_KEYS.join(', ')}`)
      .eq('key', data.role)
      .maybeSingle();

    if (role) {
      const merged = { ...data };
      for (const k of ROLE_PERM_KEYS) {
        // is_admin على الدور = كل الصلاحيات؛ وإلا دلالة !== false
        merged[k] = role.is_admin ? true : role[k] !== false;
      }
      return merged;
    }
  } catch {
    /* لو تعذّر جلب الدور، نرجّع صف الموظف كما هو — أسوأ حالة:
       المحرّك يقرا الأعمدة القديمة الملغاة. RLS هي الحارس الفعلي. */
  }
  return data;
}

/** قائمة المستخدمين النشطين — للأدمن. مطابق لـ auth.js:8 */
export async function fetchUsers() {
  const { data, error } = await supabase
    .from('ishop_users')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}

// ── STORAGE (قراءة) ────────────────────────────────────────────

export const BUCKET = 'device-images';

/**
 * ⚠️ عمود `images` مخزّن فيه **روابط كاملة**، مش مسارات.
 *    (data.js:586 — uploadImageToStorage بيرجّع URL كامل)
 *    فـ getPublicUrl() هنا كانت هتكسر الرابط. الرابط بيتستخدم زي ما هو.
 */
export function deviceImageUrl(url) {
  return safeUrl(url);
}

// ════════════════════════════════════════════════════════════════
//  المرحلة 4 — الكتابة (إدخال · تعديل · حذف · صور)
//  منقولة من data.js بنفس المنطق والقيم بالظبط.
// ════════════════════════════════════════════════════════════════


const IMG_QUALITY = 0.82; // نفس قيمة الأصل
export const MAX_IMAGES = 4;

// الكود التالي للجهاز الجديد — نفس منطق الأصل (يبدأ من 88)
export async function nextDeviceCode() {
  const { data, error } = await supabase
    .from('devices')
    .select('device_code')
    .not('device_code', 'is', null);
  if (error) throw error;

  let next = 88;
  const nums = (data ?? [])
    .map((r) => parseInt(r.device_code))
    .filter((n) => !isNaN(n));
  if (nums.length) next = Math.max(...nums) + 1;
  return next.toString();
}

// إدخال جهاز جديد
export async function insertDevice(fields) {
  const code = await nextDeviceCode();
  const { data, error } = await supabase
    .from('devices')
    .insert({
      ...fields,
      date: new Date().toISOString().split('T')[0],
      archived: false,
      device_code: code,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// تعديل جهاز
export async function updateDevice(id, fields) {
  const { data, error } = await supabase
    .from('devices')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// حذف جهاز
export async function deleteDevice(id) {
  const { error } = await supabase.from('devices').delete().eq('id', id);
  if (error) throw error;
}

// ── الصور ─────────────────────────────────────────────────────

// ضغط الصورة — نفس أبعاد وجودة الأصل (800px, 0.82)
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMG_SIZE || height > MAX_IMG_SIZE) {
          if (width > height) {
            height = Math.round((height * MAX_IMG_SIZE) / width);
            width = MAX_IMG_SIZE;
          } else {
            width = Math.round((width * MAX_IMG_SIZE) / height);
            height = MAX_IMG_SIZE;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('فشل ضغط الصورة'));
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
          },
          'image/jpeg',
          IMG_QUALITY
        );
      };
      img.onerror = () => reject(new Error('فشل قراءة الصورة'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

// رفع صورة واحدة — بيرجّع رابط كامل (زي ما العمود بيخزّن)
export async function uploadDeviceImage(file, deviceId) {
  const compressed = await compressImage(file);
  const path = `${deviceId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}


// صورة المستخدم — نفس bucket الصور العام، داخل مسار users/
export async function uploadUserAvatar(file, userKey) {
  const compressed = await compressImage(file);
  const safeKey = String(userKey || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `users/${safeKey}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// حذف صورة من الـ Storage — بالرابط الكامل
export async function deleteDeviceImage(url) {
  const path = String(url).split('/object/public/' + BUCKET + '/')[1];
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

// ── الصور التوضيحية لصفحات الشارات (ليه iShop) ────────────────
// نفس باكت device-images بمسار illustrations/ (صلاحياته موجودة)
export async function uploadIllustration(file, badgeKey) {
  const compressed = await compressImage(file);
  const path = `illustrations/${badgeKey}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// قراءة عامة لصور شارة معيّنة (الزوار بيشوفوها)
export async function fetchIllustrations(badgeKey) {
  let q = supabase
    .from('badge_illustrations')
    .select('*')
    .order('sort', { ascending: true })
    .order('id', { ascending: true });
  if (badgeKey) q = q.eq('badge_key', badgeKey);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// قراءة عامة لإعداد موقع بمفتاح (warranty_hero مثلاً)
export async function fetchSetting(key) {
  const { data, error } = await supabase
    .from('site_settings').select('value').eq('key', key).maybeSingle();
  if (error) return null;
  return data?.value ?? null;
}

// قراءة الكتالوج من الجداول الجديدة (Type → Model → Colors)
// بيرجّع هياكل بالأسماء عشان الفورم يشتغل زي ما هو (الأجهزة بتخزّن نصوص)
export async function fetchCatalog() {
  try {
    const [typesRes, modelsRes, colorsRes, linksRes] = await Promise.all([
      supabase.from('catalog_types').select('id,name,sort').eq('active', true).order('sort').order('name'),
      supabase.from('catalog_models').select('id,name,type_id,sort').eq('active', true).order('sort').order('name'),
      supabase.from('catalog_colors').select('id,name_en,active,sort'),
      supabase.from('catalog_model_colors').select('model_id,color_id'),
    ]);
    if (typesRes.error || modelsRes.error || colorsRes.error || linksRes.error) return null;

    const types = typesRes.data || [];
    const models = modelsRes.data || [];
    const colors = colorsRes.data || [];
    const links = linksRes.data || [];

    const typeNameById = Object.fromEntries(types.map((t) => [t.id, t.name]));
    const modelNameById = Object.fromEntries(models.map((m) => [m.id, m.name]));
    const colorById = Object.fromEntries(colors.map((c) => [c.id, c]));

    const typeNames = types.map((t) => t.name);
    const modelsByType = {};
    for (const m of models) {
      const tn = typeNameById[m.type_id];
      if (!tn) continue;
      (modelsByType[tn] ||= []).push(m.name);
    }

    const tmp = {};
    for (const l of links) {
      const mn = modelNameById[l.model_id];
      const c = colorById[l.color_id];
      if (!mn || !c || c.active === false) continue;
      (tmp[mn] ||= []).push({ name: c.name_en, sort: c.sort ?? 0 });
    }
    const colorsByModel = {};
    for (const k of Object.keys(tmp)) {
      colorsByModel[k] = tmp[k]
        .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
        .map((x) => x.name);
    }

    return { typeNames, modelsByType, colorsByModel };
  } catch {
    return null;
  }
}

// قراءة الكتالوج الكامل للإدارة (كل الصفوف — نشط وغير نشط)
export async function fetchCatalogAll() {
  const [t, m, c, l] = await Promise.all([
    supabase.from('catalog_types').select('*').order('sort').order('name'),
    supabase.from('catalog_models').select('*').order('sort').order('name'),
    supabase.from('catalog_colors').select('*').order('sort').order('name_en'),
    supabase.from('catalog_model_colors').select('model_id,color_id'),
  ]);
  const err = t.error || m.error || c.error || l.error;
  if (err) throw err;
  return { types: t.data || [], models: m.data || [], colors: c.data || [], links: l.data || [] };
}

export async function fetchRoles() {
  const { data, error } = await supabase
    .from('roles').select('*').order('sort', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// أسماء مستخدمي نفس الفرع (للبائع في إيصال الأرشفة)
export async function fetchBranchSellers() {
  const { data, error } = await supabase.rpc('branch_sellers');
  if (error) return [];
  return (data || []).map((r) => r.display_name).filter(Boolean);
}

// ── التقييمات ─────────────────────────────────────────────────
// قراءة عامة للتقييمات المعتمدة
export async function fetchReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, branch, customer_name, body, created_at, avatar_url, rating')
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
}

// تسجيل دخول العميل بفيسبوك للتمكن من إضافة تقييم موثّق
export async function signInCustomerWithFacebook() {
  // V11.29: علامة «جلسة عميل» — AuthContext بيقراها فما يقفلش الجلسة،
  // وبتفضل لحد ما العميل يخرج بنفسه (بديل علامة V11.24 اللي محدش كان بيقراها).
  markCustomerLogin();
  const redirectTo = `${window.location.origin}/reviews?oauth=facebook`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo, scopes: 'public_profile,email' },
  });
  if (error) throw error;
  return data;
}

// إنشاء/تحديث ملف العميل من بيانات Facebook
export async function ensureCustomerProfile(user) {
  if (!user?.id) throw new Error('جلسة Facebook غير صالحة');
  const meta = user.user_metadata || {};
  const displayName = meta.full_name || meta.name || meta.user_name || user.email?.split('@')[0] || 'عميل iShop';
  const avatarUrl = meta.avatar_url || meta.picture || null;
  const row = {
    auth_user_id: user.id,
    display_name: displayName,
    avatar_url: avatarUrl,
    email: user.email || null,
    source: 'facebook_review',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('customers')
    .upsert(row, { onConflict: 'auth_user_id' })
    .select('id, display_name, avatar_url, email, phone, source')
    .single();
  if (error) throw error;
  return data;
}

export async function getCustomerSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data?.session || null;
  // V11.29: الفحص اتنقل لـ isCustomerSession — بيغطي الحساب المتربط
  // (provider = 'email' و facebook جوّه providers).
  if (!isCustomerSession(session)) return null;
  return { session, customer: await ensureCustomerProfile(session.user) };
}

export async function signOutCustomer() {
  clearCustomerLogin();
  await supabase.auth.signOut();
}

// إرسال رأي جديد مرتبط بالعميل. النشر المباشر/المراجعة بيتحدد من إعداد الأدمن.
export async function submitReview({ branch, body, rating, customer, guestName = '', requireApproval = true }) {
  const isFacebook = Boolean(customer?.id);
  const name = isFacebook
    ? (customer.display_name || null)
    : (String(guestName || '').trim() || null);

  const row = {
    branch: branch || '',
    customer_name: name,
    avatar_url: isFacebook ? (customer.avatar_url || null) : null,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    body: String(body || '').trim(),
    approved: !requireApproval,
  };
  // Guest reviews are intentionally supported by the existing reviews RLS policy.
  // Only attach customer_id when the reviewer completed Facebook login.
  if (isFacebook) {
    row.customer_id = customer.id;
    // أول فرع يختاره عميل Facebook يحدد فرعه، عشان موظفي الفروع ما يشوفوش عملاء بعض.
    if (branch) {
      const { error: branchError } = await supabase
        .from('customers').update({ branch, updated_at: new Date().toISOString() }).eq('id', customer.id);
      if (branchError) throw branchError;
    }
  }

  const { data, error } = await supabase.from('reviews').insert(row).select('id, approved').single();
  if (error) throw error;
  return data;
}

// تقييمات العميل الحالي — تشمل المنتظر والمنشور، ولا تظهر إلا لصاحب الحساب حسب RLS.
export async function fetchOwnReviews(customerId) {
  if (!customerId) return [];
  const { data, error } = await supabase
    .from('reviews')
    .select('id, approved, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// العميل يقدر يتراجع عن رأيه المرتبط بحسابه في Facebook فقط.
export async function deleteOwnReview(id, customerId) {
  if (!id || !customerId) throw new Error('تعذر تحديد التقييم');
  const { error } = await supabase.from('reviews').delete().eq('id', id).eq('customer_id', customerId);
  if (error) throw error;
}

// عدد التقييمات المنتظرة الموافقة (للأدمن — RLS بيسمح له يشوف غير المعتمد)
export async function fetchPendingReviewsCount() {
  const { count, error } = await supabase
    .from('reviews').select('id', { count: 'exact', head: true }).eq('approved', false);
  if (error) return 0;
  return count || 0;
}

// ── كلمة سر الحذف ─────────────────────────────────────────────
export async function setDeletePass(userId, pass) {
  const { data, error } = await supabase.rpc('set_delete_pass', {
    p_user_id: userId,
    p_pass: pass,
  });
  if (error) throw error;
  return data;
}

// ════════════════════════════════════════════════════════════════
//  المرحلة 5 — الأرشيف (أرشفة · إلغاء أرشفة)
//  منقولة من ui.js بنفس الحقول والمنطق.
// ════════════════════════════════════════════════════════════════

// عملاء الأرشفة — متاحين للموظف اللي عنده صلاحية can_archive عبر RLS.
export async function fetchArchiveCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, display_name, phone, source')
    .order('display_name', { ascending: true });
  if (error) throw error;
  return data || [];
}

// لو العميل موجود نستخدمه، ولو جديد نضيفه فور تأكيد البيع.
export async function ensurePurchaseCustomer({ id, displayName, phone }) {
  if (id) return Number(id);
  const name = String(displayName || '').trim();
  const tel = String(phone || '').trim();
  if (!name) throw new Error('اسم المشتري مطلوب');
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('customers')
    .insert({ display_name: name, phone: tel || null, source: 'purchase', created_at: now, updated_at: now })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// أرشفة جهاز — reason: 'sold' | 'return'
export async function archiveDevice(id, { reason, buyerName, buyerPhone, customerId, imei, archivedBy, seller }) {
  const archiveReason =
    reason === 'sold' ? 'تم البيع' : reason === 'return' ? 'مرتجع للبائع الأصلي' : '';
  const today = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  // نجيب صور الجهاز الحالية ونمسحها نهائيًا من الـ Storage وقت الأرشفة
  const { data: dev } = await supabase.from('devices').select('images').eq('id', id).single();
  const imgs = Array.isArray(dev?.images) ? dev.images : [];
  const hadImages = imgs.length > 0;
  if (hadImages) {
    await Promise.allSettled(imgs.map((u) => deleteDeviceImage(u)));
  }

  const { error } = await supabase
    .from('devices')
    .update({
      archived: true,
      archive_reason: archiveReason,
      buyer_name: reason === 'sold' ? buyerName || '' : '',
      buyer_phone: reason === 'sold' ? buyerPhone || '' : '',
      customer_id: reason === 'sold' ? (customerId || null) : null,
      // V11.33: بقى في IMEI بيتسجّل وقت الإدخال. قبل كده السطر ده كان
      // `imei: imei || ''` فكان بيمسحه لو المودال ماكانش فيه رقم.
      // دلوقتي بنكتب بس لما يبقى في رقم فعلي.
      ...(imei ? { imei } : {}),
      archive_date: today,
      archived_at: new Date().toISOString(), // وقت فعلي لحساب ضمان الـ 30 يوم
      archived_by: archivedBy || '',          // المؤرشِف (لاختيار الختم عند إعادة الطباعة)
      archived_seller: seller || '',           // البائع (للإيصال وإعادة الطباعة)
      images: [],               // اتشالت من الـ Storage
      imgs_removed: hadImages,  // علامة للتنبيه وقت الإرجاع
    })
    .eq('id', id);
  if (error) throw error;
  return { archiveReason, archiveDate: today, imagesRemoved: hadImages };
}

// إلغاء الأرشفة — بيرجّع الجهاز للقائمة ويمسح بيانات الأرشفة (نفس الأصل)
export async function unarchiveDevice(id) {
  // الرجوع من الأرشفة = دخول جديد للمخزون، فبنحدّث تاريخ الدخول لليوم
  const today = new Date().toISOString().split('T')[0];
  // نقرأ العلامة عشان ننبّه إن صور الجهاز اتشالت وقت الأرشفة
  const { data: dev } = await supabase.from('devices').select('imgs_removed').eq('id', id).single();
  const imagesWereRemoved = !!dev?.imgs_removed;
  const { error } = await supabase
    .from('devices')
    .update({
      archived: false,
      archive_reason: '',
      buyer_name: '',
      buyer_phone: '',
      archive_date: '',
      date: today,
      archived_at: null,
      imgs_removed: false, // نصفّر العلامة بعد الإرجاع
    })
    .eq('id', id);
  if (error) throw error;
  return { imagesWereRemoved };
}

// استعلام الضمان — بيتحقق من رقم الهاتف + الرقم المسلسل ويرجّع حالة الضمان فقط
export async function checkWarranty(phone, serial) {
  const { data, error } = await supabase.rpc('check_warranty', {
    p_phone: phone,
    p_serial: serial,
  });
  if (error) throw error;
  return data;
}

// ════════════════════════════════════════════════════════════════
//  الأسعار — السياسات السعرية + أسعار الأجهزة (جدول منفصل)
// ════════════════════════════════════════════════════════════════

// كل السياسات (النشطة والمعطّلة). أعمدة صريحة بدون access_code — العمود ده
// ممنوع على الزائر، و select('*') كان هيقع عنده. الأدمن بيقراه من adminApi.
export async function fetchPricingPolicies() {
  const { data, error } = await supabase
    .from('pricing_policies')
    .select('id, name, code, is_active, is_public, is_default, sort')
    .order('sort', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * كشف أسعار سياسة بالكود السري (للزائر).
 * الدالة على السيرفر بتتحقق من الكود وترجّع أسعار سياسته فقط — كود غلط = فاضي.
 */
export async function unlockPrices(code) {
  const { data, error } = await supabase.rpc('unlock_prices', { p_code: code });
  if (error) throw error;
  return data ?? [];
}

// كل أسعار الأجهزة. الـ RLS بتحصر الزائر على أسعار السياسات المعلَنة فقط.
export async function fetchDevicePrices() {
  const { data, error } = await supabase
    .from('device_prices')
    .select('device_id, policy_id, price');
  if (error) throw error;
  return data ?? [];
}

/**
 * كتابة أسعار جهاز.
 * entries: [{ policyId, price }]  — القيمة الفاضية/غير الرقمية = حذف الصف.
 * الـ RLS بتفرض نفس صلاحية تعديل الجهاز بالظبط.
 */
export async function saveDevicePrices(deviceId, entries) {
  const toUpsert = [];
  const toDelete = [];
  for (const { policyId, price } of entries || []) {
    const raw = price == null ? '' : String(price).trim();
    const n = raw === '' ? null : Number(raw);
    if (n == null || isNaN(n)) toDelete.push(policyId);
    else toUpsert.push({ device_id: deviceId, policy_id: policyId, price: n });
  }

  if (toUpsert.length) {
    const { error } = await supabase
      .from('device_prices')
      .upsert(toUpsert, { onConflict: 'device_id,policy_id' });
    if (error) throw error;
  }
  if (toDelete.length) {
    const { error } = await supabase
      .from('device_prices')
      .delete()
      .eq('device_id', deviceId)
      .in('policy_id', toDelete);
    if (error) throw error;
  }
}

// ════════════════════════════════════════════════════════════════
//  قنوات الاتصال (الدعم الفني وغيره)
// ════════════════════════════════════════════════════════════════

// جلب قناة واحدة بمفتاحها (للمودال العام) — قراءة متاحة للكل
export async function getContactChannel(key) {
  const { data, error } = await supabase
    .from('contact_channels')
    .select('*')
    .eq('key', key)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// كل القنوات (للوحة الأدمن)
export async function fetchContactChannels() {
  const { data, error } = await supabase
    .from('contact_channels')
    .select('*')
    .order('sort');
  if (error) throw error;
  return data ?? [];
}
