import { supabase } from './supabase';
import { setDeletePass, deleteDeviceImage } from './api';
export { setDeletePass };

// ── الصور التوضيحية لصفحات الشارات (أدمن فقط) ─────────────────
export async function createIllustration(row) {
  const { data, error } = await supabase
    .from('badge_illustrations').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateIllustration(id, patch) {
  const { error } = await supabase
    .from('badge_illustrations').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteIllustration(id, imageUrl) {
  const { error } = await supabase
    .from('badge_illustrations').delete().eq('id', id);
  if (error) throw error;
  if (imageUrl) { try { await deleteDeviceImage(imageUrl); } catch { /* الصف اتمسح المهم */ } }
}

// حفظ إعداد موقع (أدمن) — upsert بالمفتاح
export async function saveSetting(key, value) {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

// ── إدارة الكتالوج (أدمن) ─────────────────────────────────────
// الأنواع
export async function createCatalogType(name, sort = 0) {
  const { error } = await supabase.from('catalog_types').insert({ name, sort });
  if (error) throw error;
}
export async function updateCatalogType(id, patch) {
  const { error } = await supabase.from('catalog_types').update(patch).eq('id', id);
  if (error) throw error;
}
export async function deleteCatalogType(id) {
  const { error } = await supabase.from('catalog_types').delete().eq('id', id);
  if (error) throw error;
}
// الموديلات
export async function createCatalogModel(row) {
  const { data, error } = await supabase.from('catalog_models').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}
export async function updateCatalogModel(id, patch) {
  const { error } = await supabase.from('catalog_models').update(patch).eq('id', id);
  if (error) throw error;
}
export async function deleteCatalogModel(id) {
  const { error } = await supabase.from('catalog_models').delete().eq('id', id);
  if (error) throw error;
}
// الألوان
export async function createCatalogColor(row) {
  const { data, error } = await supabase.from('catalog_colors').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}
export async function updateCatalogColor(id, patch) {
  const { error } = await supabase.from('catalog_colors').update(patch).eq('id', id);
  if (error) throw error;
}
export async function deleteCatalogColor(id) {
  const { error } = await supabase.from('catalog_colors').delete().eq('id', id);
  if (error) throw error;
}
// ألوان الموديل — استبدال المجموعة
export async function setModelColors(modelId, colorIds) {
  const { error: delErr } = await supabase.from('catalog_model_colors').delete().eq('model_id', modelId);
  if (delErr) throw delErr;
  if (colorIds.length) {
    const rows = colorIds.map((cid) => ({ model_id: modelId, color_id: cid }));
    const { error } = await supabase.from('catalog_model_colors').insert(rows);
    if (error) throw error;
  }
}

// ربط مستخدم بفرع (بالـ username — مضمون بعد الإنشاء عبر Edge Function)
export async function fetchUserBranchAccess(userId) {
  const { data, error } = await supabase.from('user_branch_access').select('branch').eq('user_id', userId).order('branch');
  if (error) throw error;
  return (data || []).map((x) => x.branch).filter(Boolean);
}

// يستبدل فروع المستخدم الإضافية ويحفظ الفرع الافتراضي في ishop_users.branch.
export async function setUserBranchAccess(userId, branches, primaryBranch) {
  const clean = [...new Set((branches || []).filter(Boolean))];
  if (primaryBranch && !clean.includes(primaryBranch)) throw new Error('الفرع الافتراضي يجب أن يكون ضمن الفروع المسموح بها');
  const { error: userErr } = await supabase.from('ishop_users').update({ branch: primaryBranch || null }).eq('id', userId);
  if (userErr) throw userErr;
  const { error: delErr } = await supabase.from('user_branch_access').delete().eq('user_id', userId);
  if (delErr) throw delErr;
  const extras = clean.filter((b) => b !== primaryBranch);
  if (extras.length) {
    const { error } = await supabase.from('user_branch_access').insert(extras.map((branch) => ({ user_id: userId, branch })));
    if (error) throw error;
  }
}

export async function updateUserBranch(username, branch) {
  const { error } = await supabase
    .from('ishop_users').update({ branch: branch || null }).eq('username', username);
  if (error) throw error;
}

// تغيير باسورد مستخدم (أدمن — عبر Edge Function آمنة)
export async function setUserPassword(username, password) {
  const { data, error } = await supabase.functions.invoke('set-user-password', {
    body: { username, password },
  });
  if (error) {
    let msg = error.message;
    try { const ctx = await error.context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  return data;
}

// تحديث عام لصف مستخدم بالـ username (للدور المخصّص/الفرع بعد الإنشاء)
export async function updateUserByUsername(username, patch) {
  const { error } = await supabase.from('ishop_users').update(patch).eq('username', username);
  if (error) throw error;
}

// ── إدارة الأدوار (أدمن) ──────────────────────────────────────
export async function createRole(row) {
  const { error } = await supabase.from('roles').insert(row);
  if (error) throw error;
}
export async function updateRole(key, patch) {
  const { error } = await supabase.from('roles').update(patch).eq('key', key);
  if (error) throw error;
}
export async function deleteRole(key) {
  // حماية إضافية: مايتحذفش دور مبني
  const { error } = await supabase.from('roles').delete().eq('key', key).eq('is_builtin', false);
  if (error) throw error;
}
export async function fetchAllReviews() {
  const { data, error } = await supabase
    .from('reviews').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return data || [];
}
export async function approveReview(id, approved = true) {
  const { error } = await supabase.from('reviews').update({ approved }).eq('id', id);
  if (error) throw error;
}
export async function deleteReview(id) {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) throw error;
}

// حذف عميل نهائيًا: تقييماته + صفّه + حساب الدخول بتاعه.
// عبر Edge Function لأن حذف auth.users محتاج service role — مستحيل من المتصفح.
// الدالة بترفض أي حساب مربوط بموظف (بتفاصيل السبب في رسالة الخطأ).
export async function deleteCustomerCompletely(customerId) {
  const { data, error } = await supabase.functions.invoke('delete-customer', {
    body: { customer_id: customerId },
  });
  if (error) {
    let msg = error.message;
    try { const ctx = await error.context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  return data;
}

// ════════════════════════════════════════════════════════════════
//  V11.32 — إدارة العملاء (أدمن فقط)
//  المصادر: 'facebook_review' (دخول بفيسبوك) · 'purchase' (مشتري من الأرشفة)
//           · 'manual' (مضاف بإيد الأدمن)
// ════════════════════════════════════════════════════════════════

export async function fetchCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, display_name, business_name, phone, email, opening_balance, avatar_url, source, auth_user_id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// العدّادات بتتجاب منفصلة وبنجمّعها في المتصفح — الـ embedding المتداخل
// في PostgREST أثبت إنه أقل اعتمادية في المشروع ده.
export async function fetchCustomerCounts() {
  const [dev, rev] = await Promise.all([
    supabase.from('devices').select('customer_id').not('customer_id', 'is', null),
    supabase.from('reviews').select('customer_id').not('customer_id', 'is', null),
  ]);
  if (dev.error) throw dev.error;
  if (rev.error) throw rev.error;
  const tally = (rows) => (rows || []).reduce((m, r) => {
    m[r.customer_id] = (m[r.customer_id] || 0) + 1;
    return m;
  }, {});
  return { devices: tally(dev.data), reviews: tally(rev.data) };
}

export async function fetchCustomerDevices(customerId) {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('customer_id', customerId)
    .order('archived_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data || [];
}

export async function createCustomer({ display_name, business_name, phone, email, opening_balance }) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('customers')
    .insert({
      display_name: String(display_name || '').trim(),
      business_name: String(business_name || '').trim() || null,
      opening_balance: Number(opening_balance || 0),
      phone: String(phone || '').trim() || null,
      email: String(email || '').trim() || null,
      source: 'manual',
      created_at: now,
      updated_at: now,
    })
    .select('id, display_name, business_name, phone, email, opening_balance, avatar_url, source, auth_user_id, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id, { display_name, business_name, phone, email, opening_balance }) {
  const { data, error } = await supabase
    .from('customers')
    .update({
      display_name: String(display_name || '').trim(),
      business_name: String(business_name || '').trim() || null,
      opening_balance: Number(opening_balance || 0),
      phone: String(phone || '').trim() || null,
      email: String(email || '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, display_name, business_name, phone, email, opening_balance, avatar_url, source, auth_user_id, created_at')
    .single();
  if (error) throw error;
  return data;
}


// إنشاء مستخدم — عبر Edge Function (بتعمله في الجدولين ذرّيًا)
export async function createUser(payload) {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: payload,
  });
  if (error) {
    // نحاول نقرا رسالة السيرفر التفصيلية
    let msg = error.message;
    try {
      const ctx = await error.context?.json?.();
      if (ctx?.error) msg = ctx.error;
    } catch { /* noop */ }
    throw new Error(msg);
  }
  return data;
}

// تحديث بيانات مستخدم موجود (الصلاحيات، الدور، الاسم، الهاتف)
export async function updateUserRow(id, fields) {
  const { error } = await supabase.from('ishop_users').update(fields).eq('id', id);
  if (error) throw error;
}

// تغيير البريد — عبر دالة السيرفر (بتحدّث auth.users كمان)
export async function setUserEmail(userId, email) {
  const { data, error } = await supabase.rpc('admin_set_user_email', {
    p_user_id: userId,
    p_email: email,
  });
  if (error) throw error;
  return data;
}

// هل المستخدم عنده كلمة سر حذف؟ (للعرض في الفورم)
export async function userHasDeletePass(userId) {
  // ملاحظة: has_delete_pass بتشتغل على المستخدم الحالي بس.
  // للأدمن بيعرض حالة مستخدم تاني، بنقرا من عمود delete_pass_hash
  const { data, error } = await supabase
    .from('ishop_users')
    .select('delete_pass_hash')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data?.delete_pass_hash;
}

// تعديل قناة اتصال (أدمن فقط عبر RLS)
export async function updateContactChannel(id, fields) {
  const { error } = await supabase.from('contact_channels').update(fields).eq('id', id);
  if (error) throw error;
}

// ════════════════════════════════════════════════════════════════
//  السياسات السعرية (أدمن فقط عبر RLS)
// ════════════════════════════════════════════════════════════════

export async function createPricingPolicy({ name, code, access_code }) {
  const { error } = await supabase
    .from('pricing_policies')
    .insert({ name, code, access_code: access_code || null });
  if (error) throw error;
}

// قائمة السياسات للأدمن — بتشمل الكود السري access_code (الأدمن مسموحله يقراه)
export async function fetchPricingPoliciesAdmin() {
  const { data, error } = await supabase
    .from('pricing_policies')
    .select('id, name, code, is_active, is_public, is_default, sort, access_code')
    .order('sort', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updatePricingPolicy(id, fields) {
  const { error } = await supabase.from('pricing_policies').update(fields).eq('id', id);
  if (error) throw error;
}

// "حذف" سياسة = تعطيلها (بيحافظ على الأسعار المخزّنة)
export async function deactivatePricingPolicy(id) {
  return updatePricingPolicy(id, { is_active: false });
}

// حذف نهائي للسياسة — بيمسح الصف خالص من pricing_policies.
// ⚠️ محتاج صلاحية DELETE على مستوى قاعدة البيانات (RLS/grants)،
//    والأسعار المرتبطة في device_prices ممكن تتأثر حسب قيد الـ FK.
export async function deletePricingPolicy(id) {
  const { error } = await supabase.from('pricing_policies').delete().eq('id', id);
  if (error) throw error;
}

// "عرض الأسعار" = تبديل is_public على السياسة (الافتراضية عادةً)
export async function setPolicyPublic(id, isPublic) {
  return updatePricingPolicy(id, { is_public: isPublic });
}
