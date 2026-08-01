// ══════════════════════════════════════════════════════════════
//  Permission Source — من فين المحرّك بيقرا الصلاحيات
//
//  المحرّك (`permissionService.js`) بيعرف **القواعد**: الأدمن بياخد
//  كل حاجة، الزائر مالوش حاجة، والملكية بتتقارن إزاي.
//  الملف ده بيعرف **مكان التخزين**: صلاحية اسمها كذا بتتقري منين.
//
//  الفايدة: لو طريقة التخزين اتغيّرت بكرة (جدول صلاحيات منفصل،
//  Registry، RPC، JWT claims…) بتكتب مصدر جديد وتركّبه بسطر واحد.
//  صفحات التطبيق ما بتتغيّرش، والقواعد ما بتتغيّرش.
//
//  ⚠️ الملف ده مش Registry ومفيش فيه Auto Discovery. مصدر واحد
//     ثابت (`columnSource`) هو المركّب، والباقي مجرد باب مفتوح.
// ══════════════════════════════════════════════════════════════

/**
 * أي مصدر لازم يوفّر الخمسة دول:
 *
 *   isAdmin(subject)        → boolean
 *   getRole(subject)        → string | null
 *   getDisplay(subject)     → string | null   (الاسم المعروض)
 *   getOwnerId(subject)     → string | null   (اللي بيتقارن بـ record.owner_id)
 *   getBranch(subject)      → string | null   (اللي بيتقارن بـ record.branch)
 *   hasFlag(subject, key)   → boolean         (القراءة الخام، من غير قواعد)
 *   keys()                  → string[]        (المفاتيح المعروفة)
 */
const REQUIRED = ['isAdmin', 'getRole', 'getDisplay', 'getOwnerId', 'getBranch', 'hasFlag', 'keys'];

/** مفاتيح الصلاحيات الموجودة كأعمدة في ishop_users و roles */
const PERMISSION_KEYS = [
  'can_create',
  'can_edit',
  'can_delete',
  'can_archive',
  'req_del_pass',
  'req_arch_pass',
  'can_settings',
  'can_settings_users',
  'can_settings_roles',
  'can_settings_branches',
  'can_settings_catalog',
  'can_settings_reports',
  'can_settings_channels',
  'can_settings_prices',
  'can_settings_illus',
  'can_settings_ticker',
  'can_settings_printing',
  'can_settings_warranty',
  'can_settings_reviews',
  'can_settings_customers',
  'can_manage_custom_models',
  'can_customer_create',
  'can_customer_card',
  'can_customer_phone',
  'can_customer_call',
  'can_customer_whatsapp',
  'can_erp','can_erp_products','can_erp_purchases','can_erp_inventory','can_erp_sales','can_erp_pos','can_erp_finance','can_erp_reports','can_erp_audit','can_erp_post','can_erp_cancel',
  'can_erp_product_create','can_erp_product_edit','can_erp_product_import','can_erp_product_export','can_erp_suggestion_view_stock','can_erp_suggestion_view_sale_price','can_erp_purchase_create','can_erp_purchase_return','can_erp_sale_create','can_erp_sale_return','can_erp_discount','can_erp_change_sale_price','can_erp_view_purchase_price','can_erp_stock_opening','can_erp_stock_transfer','can_erp_stock_adjust','can_erp_customer_create','can_erp_customer_edit','can_erp_customer_import','can_erp_customer_export','can_erp_supplier_create','can_erp_supplier_edit','can_erp_supplier_import','can_erp_supplier_export','can_erp_collect','can_erp_pay_supplier','can_erp_treasury_create','can_erp_treasury_transfer','can_erp_expense_create','can_erp_view_treasury_balance','can_erp_report_export','can_erp_backup_export','can_erp_print',
];

/**
 * المصدر الحالي: الصلاحيات أعمدة على صف المستخدم نفسه.
 *
 * ⚠️ `hasFlag` بترجّع `!== false` مش `=== true`. العمود اللي قيمته
 *    null معناه **مسموح**. ده سلوك النظام من الأول وأي مصدر جديد
 *    لازم يقرّر دلالته بنفسه بوضوح.
 *
 * ⚠️ `isAdmin` بتقرا `role === 'admin'` بالنص، **مش** عمود
 *    `is_admin` في جدول roles. العمود ده موجود ومعروض في واجهة
 *    الأدوار لكن مالوش أثر — ربطه قرار سلوكي منفصل.
 */
export const columnSource = {
  id: 'columns',
  isAdmin: (subject) => subject?.role === 'admin',
  getRole: (subject) => subject?.role ?? null,
  getDisplay: (subject) => subject?.display_name ?? null,
  getOwnerId: (subject) => subject?.auth_id ?? null,
  getBranch:  (subject) => subject?.branch ?? null,
  hasFlag: (subject, key) => subject?.[key] !== false,
  keys: () => PERMISSION_KEYS,
};

let active = columnSource;

/** المصدر الشغّال دلوقتي */
export function getPermissionSource() {
  return active;
}

/**
 * تركيب مصدر تاني. بيتنادى مرة واحدة عند الإقلاع لو احتجناه.
 * @param {object} source
 */
export function setPermissionSource(source) {
  const missing = REQUIRED.filter((m) => typeof source?.[m] !== 'function');
  if (missing.length) {
    throw new Error(`مصدر صلاحيات ناقص: ${missing.join(', ')}`);
  }
  active = source;
}
