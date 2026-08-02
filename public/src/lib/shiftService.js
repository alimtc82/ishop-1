import { supabase } from './supabase';

// ══════════════════════════════════════════════════════════════
//  shiftService — نظام الورديات (V13.9.2)
//
//  الوردية: فترة عمل المستخدم في فرع معين وخزينة محددة.
//  - فتح الوردية: يُسجَّل رصيد أول المدة يدوياً من المستخدم
//  - خلال الوردية: كل العمليات (مبيعات، مشتريات، مصروفات...) تُربط بالوردية
//  - تقرير الوردية: ملخص كامل للإيرادات والمصروفات
//  - إغلاق الوردية: يُحسب الرصيد الختامي ويُغلق
// ══════════════════════════════════════════════════════════════

/** توليد رقم وردية فريد */
function genShiftNumber() {
  const now = new Date();
  const d = now.toISOString().slice(0, 10).replace(/-/g, '');
  const t = String(now.getTime()).slice(-6);
  return `SHIFT-${d}-${t}`;
}

/**
 * جلب الوردية المفتوحة الحالية للمستخدم في فرع معين.
 * لو مفيش وردية مفتوحة → يرجع null.
 */
export async function getOpenShift(userId, branch = null) {
  let q = supabase
    .from('pos_shifts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1);

  if (branch) q = q.eq('branch', branch);

  const { data, error } = await q;
  if (error) throw error;
  return data?.[0] || null;
}

/**
 * فتح وردية جديدة.
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.userName
 * @param {string} params.branch
 * @param {number} params.treasuryId
 * @param {string} params.treasuryName
 * @param {number} params.openingBalance - رصيد أول المدة (يُدخله المستخدم)
 */
export async function openShift({ userId, userName, branch, treasuryId, treasuryName, openingBalance }) {
  // التحقق من عدم وجود وردية مفتوحة لنفس المستخدم في نفس الفرع
  const existing = await getOpenShift(userId, branch);
  if (existing) {
    throw new Error(`يوجد وردية مفتوحة بالفعل لهذا الفرع (${existing.shift_number}). أغلقها أولاً.`);
  }

  const { data, error } = await supabase
    .from('pos_shifts')
    .insert({
      shift_number: genShiftNumber(),
      user_id: userId,
      user_name: userName,
      branch,
      treasury_id: Number(treasuryId),
      treasury_name: treasuryName,
      opening_balance: Number(openingBalance) || 0,
      status: 'open',
      opened_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * جلب بيانات تقرير الوردية الكامل.
 * يجلب: المبيعات، مرتجعات المشتريات، المشتريات، مرتجعات المبيعات، المصروفات
 * كلها مرتبطة بالفرع والخزينة وفترة الوردية.
 */
export async function getShiftReport(shift) {
  const { branch, treasury_id, opened_at, closed_at } = shift;
  const from = opened_at;
  const to = closed_at || new Date().toISOString();

  // جلب كل البيانات بالتوازي
  const [salesRes, salesRetRes, purchasesRes, purchRetRes, expensesRes, movementsRes] = await Promise.all([
    // فواتير المبيعات (إيرادات)
    supabase
      .from('sales_invoices')
      .select('id,invoice_number,invoice_date,customer_name,total,payment_type,status,created_at')
      .eq('branch', branch)
      .eq('status', 'posted')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at'),

    // مرتجعات المبيعات (مصروفات)
    supabase
      .from('sales_returns')
      .select('id,return_number,return_date,total,status,created_at')
      .eq('branch', branch)
      .eq('status', 'posted')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at'),

    // فواتير المشتريات (مصروفات)
    supabase
      .from('purchase_invoices')
      .select('id,invoice_number,invoice_date,supplier_name,total,payment_type,status,created_at')
      .eq('branch', branch)
      .eq('status', 'posted')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at'),

    // مرتجعات المشتريات (إيرادات)
    supabase
      .from('purchase_returns')
      .select('id,return_number,return_date,total,status,created_at')
      .eq('branch', branch)
      .eq('status', 'posted')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at'),

    // المصروفات
    supabase
      .from('expenses')
      .select('id,expense_number,expense_date,amount,payee_name,status,created_at,expense_categories(name)')
      .eq('branch', branch)
      .eq('status', 'posted')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at'),

    // الحركات المالية على الخزينة خلال الوردية (نقدي فقط)
    supabase
      .from('financial_movements')
      .select('id,movement_type,amount,movement_date,notes,status,created_at')
      .eq('treasury_id', treasury_id)
      .neq('status', 'cancelled')
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at'),
  ]);

  const sales        = salesRes.data || [];
  const salesRet     = salesRetRes.data || [];
  const purchases    = purchasesRes.data || [];
  const purchRet     = purchRetRes.data || [];
  const expenses     = expensesRes.data || [];
  const movements    = movementsRes.data || [];

  // حساب الإجماليات
  const totalSales       = sales.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalSalesRet    = salesRet.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalPurchases   = purchases.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalPurchRet    = purchRet.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalExpenses    = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);

  // إيرادات = مبيعات نقدية + مرتجعات مشتريات نقدية
  const cashSales        = sales.filter(r => r.payment_type === 'cash').reduce((s, r) => s + Number(r.total || 0), 0);
  const cashPurchRet     = totalPurchRet; // مرتجعات مشتريات = استرداد نقدي
  const totalRevenue     = cashSales + cashPurchRet;

  // مصروفات = مشتريات نقدية + مرتجعات مبيعات نقدية + مصروفات
  const cashPurchases    = purchases.filter(r => r.payment_type === 'cash').reduce((s, r) => s + Number(r.total || 0), 0);
  const totalExpenditure = cashPurchases + totalSalesRet + totalExpenses;

  // الرصيد المتوقع = رصيد أول المدة + إيرادات - مصروفات
  const expectedBalance  = Number(shift.opening_balance || 0) + totalRevenue - totalExpenditure;

  return {
    shift,
    sales,
    salesRet,
    purchases,
    purchRet,
    expenses,
    movements,
    summary: {
      totalSales,
      totalSalesRet,
      totalPurchases,
      totalPurchRet,
      totalExpenses,
      cashSales,
      cashPurchRet,
      cashPurchases,
      totalRevenue,
      totalExpenditure,
      openingBalance: Number(shift.opening_balance || 0),
      expectedBalance,
    },
  };
}

/**
 * إغلاق الوردية.
 * @param {number} shiftId
 * @param {number} closingBalance - الرصيد الفعلي عند الإغلاق (اختياري)
 * @param {string} notes
 */
export async function closeShift(shiftId, closingBalance = null, notes = '') {
  const { data, error } = await supabase
    .from('pos_shifts')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closing_balance: closingBalance !== null ? Number(closingBalance) : null,
      notes: notes || null,
    })
    .eq('id', shiftId)
    .eq('status', 'open') // حماية: لا تغلق إلا المفتوحة
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('لم يتم إغلاق الوردية — ربما أُغلقت مسبقاً.');
  return data;
}

/**
 * جلب سجل الورديات (للأدمن أو للمستخدم).
 */
export async function listShifts({ userId = null, branch = null, limit = 50, offset = 0 } = {}) {
  let q = supabase
    .from('pos_shifts')
    .select('*', { count: 'exact' })
    .order('opened_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) q = q.eq('user_id', userId);
  if (branch) q = q.eq('branch', branch);

  const { data, error, count } = await q;
  if (error) throw error;
  return { shifts: data || [], total: count || 0 };
}
