// ════════════════════════════════════════════════════════════════
//  Edge Function: delete-customer
//  حذف عميل نهائيًا — أدمن فقط، عبر service role.
//
//  بتمسح التلاتة بالترتيب ده:
//    1. تقييماته      (لازم الأول — الـ FK هو ON DELETE SET NULL، يعني لو
//                      مسحنا العميل الأول التقييمات هتفضل والاسم والصورة
//                      محفوظين عليها نسخة، فالبيانات ماتتمسحش فعليًا)
//    2. صفّه في customers   (وده بيفك ربط الأجهزة المؤرشفة — ON DELETE SET NULL)
//    3. حسابه في auth.users  (لو ليه حساب أصلًا)
//
//  ⚠️ حارس إجباري: لو الحساب ده بتاع موظف (موجود في ishop_users) العملية
//     بترفض بالكامل. من غيره أول ضغطة على الزرار ممكن تمسح حساب الأدمن نفسه،
//     لأن Supabase بيربط identity فيسبوك بأي حساب بنفس الإيميل تلقائيًا.
// ════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST فقط' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'مفيش توكن' }, 401);

  // التحقق: لازم أدمن
  const asCaller = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: isAdmin, error: adminErr } = await asCaller.rpc('is_admin');
  if (adminErr) return json({ error: 'فشل التحقق من الصلاحية' }, 500);
  if (isAdmin !== true) return json({ error: 'غير مصرّح — الأدمن فقط' }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'JSON غير صالح' }, 400); }

  const customerId = Number(body.customer_id ?? 0);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return json({ error: 'رقم العميل غير صالح' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 1) العميل موجود؟ ──
  const { data: customer, error: cErr } = await admin
    .from('customers')
    .select('id, auth_user_id, display_name')
    .eq('id', customerId)
    .maybeSingle();
  if (cErr) return json({ error: 'فشل قراءة العميل' }, 500);
  if (!customer) return json({ error: 'العميل غير موجود' }, 404);

  // ── 2) الحارس: الحساب ده بتاع موظف؟ ──
  // العميل اليدوي/المشتري مالوش auth_user_id — الفحص ده مالوش لازمة معاه،
  // وكمان .eq('auth_id', null) في PostgREST مابيعملش اللي المفروض يعمله.
  const staff = customer.auth_user_id
    ? (await admin
        .from('ishop_users')
        .select('username, display_name, role')
        .eq('auth_id', customer.auth_user_id)
        .maybeSingle()).data
    : null;
  if (staff) {
    return json({
      error:
        `مرفوض — الحساب ده مربوط بموظف («${staff.display_name || staff.username}» · ${staff.role}). ` +
        'حذفه هيمسح حساب الموظف نفسه ويقفله بره النظام. ' +
        'ده بيحصل لما إيميل الفيسبوك يبقى نفس إيميل الموظف، فـ Supabase بيربطهم تلقائيًا. ' +
        'لو عايز تمسح التقييمات بس، استخدم زرار حذف الرأي المفرد.',
      reason: 'staff_account',
      staff_username: staff.username,
    }, 409);
  }

  // ── 3) التقييمات الأول ──
  const { data: killedReviews, error: rErr } = await admin
    .from('reviews')
    .delete()
    .eq('customer_id', customerId)
    .select('id');
  if (rErr) return json({ error: 'فشل حذف التقييمات: ' + rErr.message }, 500);

  // ── 4) صف العميل ──
  const { error: dErr } = await admin.from('customers').delete().eq('id', customerId);
  if (dErr) return json({ error: 'فشل حذف العميل: ' + dErr.message }, 500);

  // ── 5) حساب auth ──
  // عميل يدوي أو مشتري من الأرشيف مالوش حساب دخول أصلًا — بنكتفي باللي فات.
  if (!customer.auth_user_id) {
    return json({
      ok: true,
      deleted_reviews: killedReviews?.length ?? 0,
      display_name: customer.display_name,
    }, 200);
  }

  // لو فشلت هنا، التقييمات وصف العميل اتمسحوا فعلًا — بنبلّغ بالحقيقة
  // مانرجّعش ok كذب، عشان الأدمن يعرف إن في باقي محتاج تدخّل.
  const { error: aErr } = await admin.auth.admin.deleteUser(customer.auth_user_id);
  if (aErr) {
    return json({
      error: 'اتمسحت التقييمات وصف العميل، لكن فشل حذف حساب الدخول: ' + aErr.message,
      partial: true,
      deleted_reviews: killedReviews?.length ?? 0,
    }, 500);
  }

  return json({
    ok: true,
    deleted_reviews: killedReviews?.length ?? 0,
    display_name: customer.display_name,
  }, 200);
});
