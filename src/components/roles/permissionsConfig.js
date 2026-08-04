// ══════════════════════════════════════════════════════════════
//  إعدادات الصلاحيات — المصدر الوحيد للحقيقة
//
//  في الملف ده حاجتين مكتوبة بالإيد بس: MODULES و PERMISSIONS.
//  كل اللي تحتيهم **مشتقّ** منهم وقت التحميل — ما تكتبش فيه حاجة.
//
//  ── إزاي تضيف صلاحية جديدة؟ ──
//     سطر واحد في PERMISSIONS. خلاص.
//     { key: 'can_export', label: '...', hint: '...', module: 'reports', default: true }
//
//  ── إزاي تضيف موديول جديد؟ ──
//     سطر واحد في MODULES، وبعدين اربط صلاحياته بـ module: 'اسمه'.
//
//  ⚠️ `key` = اسم عمود حقيقي في جدول `roles`. الصلاحية من غير عمود
//     مقابل هتتعرض في الواجهة لكن الحفظ هيفشل. الأعمدة شغل الداتابيز.
//
//  ⚠️ الملف ده وصف ثابت (declarative) — مش Registry ولا Auto Discovery.
//     مفيش قراءة من الشبكة ولا تسجيل وقت التشغيل. مجرد تطبيع لقائمة.
// ══════════════════════════════════════════════════════════════

/** الموديولات — الترتيب هنا هو ترتيب العرض */
const MODULES = [
  { key: 'devices', icon: '📱', label: 'الأجهزة' },
  { key: 'security', icon: '🔐', label: 'الأمان' },
  { key: 'catalog', icon: '🗂️', label: 'الكتالوج' },
  { key: 'customers', icon: '👥', label: 'العملاء' },
  { key: 'reports', icon: '📊', label: 'التقارير' },
  { key: 'settings', icon: '⚙️', label: 'الإعدادات' },
  { key: 'erp', icon: '🏢', label: 'صلاحيات ERP' },
];

/** الصلاحيات — كل واحدة بتقول هي في أنهي موديول */
const PERMISSIONS = [
  { key: 'can_create', module: 'devices', default: true,
    label: 'إدخال الأجهزة', hint: 'يقدر يضيف جهاز جديد للمخزن' },
  { key: 'can_edit', module: 'devices', default: true,
    label: 'تعديل الأجهزة', hint: 'يقدر يفتح كارت الجهاز ويغيّر بياناته' },
  { key: 'can_delete', module: 'devices', default: true,
    label: 'حذف الأجهزة', hint: 'يقدر يمسح الجهاز نهائيًا' },
  { key: 'can_archive', module: 'devices', default: true,
    label: 'أرشفة الأجهزة', hint: 'يقدر ينقل الجهاز للأرشيف بعد البيع' },
  { key: 'req_del_pass', module: 'security', default: true,
    label: 'يطلب سر الحذف', hint: 'يتطلب منه كلمة سر إضافية قبل الحذف' },
  { key: 'req_arch_pass', module: 'security', default: true,
    label: 'يطلب سر الأرشفة', hint: 'يتطلب منه كلمة سر إضافية قبل الأرشفة' },

  { key: 'can_manage_custom_models', module: 'catalog', default: true,
    label: 'إضافة موديلات مخصّصة', hint: 'يقدر يضيف موديل جديد لكتالوج الأجهزة من شاشة الإدخال. من غيرها بيبحث بس' },

  { key: 'can_customer_create', module: 'customers', default: true, label: 'إضافة عميل جديد', hint: 'يقدر يضيف عميل يدوي جديد في فرعه' },
  { key: 'can_customer_card', module: 'customers', default: true, label: 'الدخول إلى كارت العميل', hint: 'يقدر يفتح كارت العميل ويشوف تفاصيله' },
  { key: 'can_customer_phone', module: 'customers', default: true, label: 'رؤية رقم العميل', hint: 'يظهر له رقم هاتف العميل في القائمة والكارت' },
  { key: 'can_customer_call', module: 'customers', default: true, label: 'الاتصال بالعميل', hint: 'يظهر له زر الاتصال المباشر عند السماح برؤية الرقم' },
  { key: 'can_customer_whatsapp', module: 'customers', default: true, label: 'واتساب العميل', hint: 'يظهر له زر واتساب عند السماح برؤية الرقم' },

  { key: 'can_settings', module: 'settings', default: true, label: 'فتح قائمة الإعدادات', hint: 'إظهار زر الإعدادات والسماح بفتح قائمة الإعدادات الرئيسية' },
  { key: 'can_settings_users', module: 'settings', default: true, label: 'قائمة المستخدمين', hint: 'إظهار قسم المستخدمين داخل الإعدادات' },
  { key: 'can_settings_roles', module: 'settings', default: true, label: 'قائمة الأدوار', hint: 'إظهار قسم الأدوار والصلاحيات' },
  { key: 'can_settings_branches', module: 'settings', default: true, label: 'قائمة الفروع', hint: 'إظهار قسم الفروع' },
  { key: 'can_settings_catalog', module: 'settings', default: true, label: 'قائمة الكتالوج', hint: 'إظهار قسم الكتالوج' },
  { key: 'can_settings_reports', module: 'settings', default: true, label: 'قائمة التقارير', hint: 'إظهار قسم التقارير' },
  { key: 'can_settings_channels', module: 'settings', default: true, label: 'قنوات الاتصال', hint: 'إظهار قسم قنوات الاتصال' },
  { key: 'can_settings_prices', module: 'settings', default: true, label: 'قائمة الأسعار', hint: 'إظهار قسم الأسعار' },
  { key: 'can_settings_illus', module: 'settings', default: true, label: 'الصور التوضيحية', hint: 'إظهار قسم الصور التوضيحية' },
  { key: 'can_settings_ticker', module: 'settings', default: true, label: 'شريط الأخبار', hint: 'إدارة شريط الأخبار المتحرك في الصفحة الرئيسية' },
  { key: 'can_settings_printing', module: 'settings', default: true, label: 'إعدادات الطباعة', hint: 'اللوجو وبيانات المحل ونماذج الطباعة العادية والحرارية والفوتر' },
  { key: 'can_settings_warranty', module: 'settings', default: true, label: 'كارت الضمان', hint: 'إظهار إعدادات كارت الضمان' },
  { key: 'can_settings_reviews', module: 'settings', default: true, label: 'قائمة التقييمات', hint: 'إظهار قسم التقييمات' },
  { key: 'can_settings_customers', module: 'settings', default: true, label: 'قائمة العملاء', hint: 'إظهار قسم العملاء — والبيانات تُقيد بفرع المستخدم' },
  { key: 'can_erp', module: 'erp', default: true, label: 'فتح ERP', hint: 'السماح بالدخول إلى نظام ERP' },
  { key: 'can_erp_products', module: 'erp', default: true, label: 'المنتجات والموردون', hint: 'عرض وإدارة المنتجات والموردين وبيانات الأصناف' },
  { key: 'can_erp_purchases', module: 'erp', default: true, label: 'المشتريات', hint: 'عرض وإدارة فواتير وطلبات ومرتجعات المشتريات' },
  { key: 'can_erp_inventory', module: 'erp', default: true, label: 'المخزون', hint: 'عرض المخزون والحركات والجرد والتحويلات' },
  { key: 'can_erp_sales', module: 'erp', default: true, label: 'المبيعات', hint: 'عرض وإدارة فواتير ومرتجعات المبيعات' },
  { key: 'can_erp_pos', module: 'erp', default: true, label: 'نقطة البيع POS', hint: 'السماح باستخدام شاشة نقطة البيع' },
  { key: 'can_erp_finance', module: 'erp', default: true, label: 'المالية', hint: 'الخزائن والحركات المالية والمصروفات والمستحقات' },
  { key: 'can_erp_reports', module: 'erp', default: true, label: 'تقارير ERP', hint: 'عرض تقارير ERP' },
  { key: 'can_erp_audit', module: 'erp', default: false, label: 'سجل العمليات', hint: 'عرض Audit Log؛ افتراضيًا للإدارة فقط' },
  { key: 'can_erp_post', module: 'erp', default: true, label: 'ترحيل المستندات', hint: 'السماح بترحيل الفواتير والمرتجعات والجرد والتحويلات' },
  { key: 'can_erp_cancel', module: 'erp', default: false, label: 'إلغاء المستندات', hint: 'السماح بإلغاء مستندات ERP؛ صلاحية حساسة' },
  { key: 'can_erp_product_create', module: 'erp_products', default: true, label: 'إضافة منتج', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_product_edit', module: 'erp_products', default: true, label: 'تعديل منتج', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_product_import', module: 'erp_products', default: true, label: 'استيراد المنتجات', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_product_export', module: 'erp_products', default: true, label: 'تصدير المنتجات', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_suggestion_view_stock', module: 'erp_products', default: true, label: 'إظهار الرصيد المتاح في تلميحات المنتج', hint: 'إظهار الرصيد المتاح للموظف داخل نتائج البحث في البيع ونقطة البيع' },
  { key: 'can_erp_suggestion_view_sale_price', module: 'erp_products', default: true, label: 'إظهار سعر البيع الافتراضي في تلميحات المنتج', hint: 'إظهار سعر البيع الافتراضي للموظف داخل نتائج البحث في البيع ونقطة البيع' },
  { key: 'can_erp_price_groups', module: 'erp_products', default: true, label: 'عرض مجموعات أسعار البيع', hint: 'إظهار وإدارة شاشة مجموعات الأسعار' },
  { key: 'can_erp_price_group_create', module: 'erp_products', default: false, label: 'إنشاء مجموعة أسعار', hint: 'إنشاء مجموعة سعر بيع جديدة' },
  { key: 'can_erp_price_group_edit', module: 'erp_products', default: false, label: 'تعديل مجموعة أسعار', hint: 'تعديل الاسم والكود والوصف' },
  { key: 'can_erp_price_group_toggle', module: 'erp_products', default: false, label: 'إيقاف / تفعيل مجموعة أسعار', hint: 'إخفاء المجموعة الموقوفة من كل مواضع الاستخدام' },
  { key: 'can_erp_price_group_import', module: 'erp_products', default: false, label: 'استيراد مجموعات الأسعار', hint: 'استيراد Excel / CSV' },
  { key: 'can_erp_price_group_export', module: 'erp_products', default: true, label: 'تصدير مجموعات الأسعار', hint: 'تصدير Excel' },
  { key: 'can_erp_purchase_create', module: 'erp_purchases', default: true, label: 'إنشاء فاتورة/طلب شراء', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_purchase_return', module: 'erp_purchases', default: true, label: 'إنشاء مرتجع مشتريات', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_sale_create', module: 'erp_sales', default: true, label: 'إنشاء فاتورة بيع', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_sale_return', module: 'erp_sales', default: true, label: 'إنشاء مرتجع مبيعات', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_discount', module: 'erp_sales', default: true, label: 'منح خصم', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_change_sale_price', module: 'erp_sales', default: true, label: 'تغيير سعر البيع', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_view_purchase_price', module: 'erp_products', default: true, label: 'رؤية سعر الشراء', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_stock_opening', module: 'erp_inventory', default: false, label: 'استيراد/ترحيل المخزون الافتتاحي', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_stock_transfer', module: 'erp_inventory', default: true, label: 'التحويل بين الفروع', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_stock_adjust', module: 'erp_inventory', default: false, label: 'التسوية والجرد', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_customer_create', module: 'erp_customers', default: true, label: 'إضافة عميل', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_customer_edit', module: 'erp_customers', default: true, label: 'تعديل عميل', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_customer_import', module: 'erp_customers', default: true, label: 'استيراد العملاء', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_customer_export', module: 'erp_customers', default: true, label: 'تصدير العملاء', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_supplier_create', module: 'erp_suppliers', default: true, label: 'إضافة مورد', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_supplier_edit', module: 'erp_suppliers', default: true, label: 'تعديل مورد', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_supplier_import', module: 'erp_suppliers', default: true, label: 'استيراد الموردين', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_supplier_export', module: 'erp_suppliers', default: true, label: 'تصدير الموردين', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_collect', module: 'erp_finance', default: true, label: 'تحصيل من عميل / سند قبض', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_pay_supplier', module: 'erp_finance', default: true, label: 'سداد مورد / سند صرف', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_treasury_create', module: 'erp_finance', default: false, label: 'إنشاء/تعديل خزينة', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_treasury_transfer', module: 'erp_finance', default: true, label: 'تحويل بين الخزائن', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_expense_create', module: 'erp_finance', default: true, label: 'تسجيل مصروف', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_view_treasury_balance', module: 'erp_finance', default: true, label: 'رؤية أرصدة الخزائن', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_report_export', module: 'erp_reports', default: true, label: 'تصدير التقارير', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_backup_export', module: 'erp_reports', default: false, label: 'تصدير نسخة احتياطية', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_reset', module: 'erp_reports', default: false, label: 'إعادة ضبط بيانات ERP', hint: 'صلاحية شديدة الحساسية لمسح بيانات التجارب؛ للإدارة العليا فقط' },
  { key: 'can_erp_print', module: 'erp', default: true, label: 'الطباعة العامة', hint: 'صلاحية مستقلة لهذا الإجراء/الزر' },
  { key: 'can_erp_document_print', module: 'erp', default: true, label: 'طباعة المستندات', hint: 'إظهار زر طباعة الفواتير والمرتجعات والسندات والمصروفات والإيرادات' },
  { key: 'can_erp_all_branches', module: 'erp', default: false, label: 'عرض جميع الفروع', hint: 'يسمح للمستخدم برؤية واختيار كل الفروع بدل فروعه المخصصة فقط' },
  // صلاحيات الورديات
  { key: 'can_pos_shift_open',     module: 'erp', default: true,  label: 'فتح وردية',                   hint: 'السماح للمستخدم بفتح وردية جديدة في نقطة البيع' },
  { key: 'can_pos_shift_close',    module: 'erp', default: true,  label: 'إغلاق وردية',                  hint: 'السماح للمستخدم بإغلاق الوردية الحالية' },
  { key: 'can_pos_shift_report',   module: 'erp', default: true,  label: 'تقرير الوردية',                hint: 'عرض تقرير الوردية (مبيعات، مشتريات، مصروفات)' },
  { key: 'can_pos_shift_view_all', module: 'erp', default: false, label: 'عرض ورديات كل المستخدمين', hint: 'للإدارة — عرض ورديات جميع الموظفين' },
];

// ══ مشتقّات — متولّدة، ما تتكتبش بالإيد ══════════════════════════
//  MODULES و PERMISSIONS فوق دول سطح الكتابة (تتعدّل بالإيد) بس مش
//  مُصدَّرين — مفيش ملف محتاجهم دلوقتي. أول ما حد يحتاجهم، كلمة
//  `export` واحدة تكفي.

/** [key, label][] — بنفس شكل V11.6 عشان التوافق */
export const PERMS = PERMISSIONS.map((p) => [p.key, p.label]);

/** القيم الافتراضية لدور جديد */
export const DEFAULT_PERMS = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.default]));

/** شاشات ERP: كل شاشة تحتوي صلاحية الدخول وأزرارها/إجراءاتها. */
const ERP_SCREENS = [
  { key: 'entry', label: 'الدخول العام إلى ERP', modules: [], keys: ['can_erp'] },
  { key: 'products', label: 'المنتجات ومجموعات الأسعار', modules: ['erp_products'], keys: ['can_erp_products'] },
  { key: 'sales', label: 'المبيعات', modules: ['erp_sales'], keys: ['can_erp_sales'] },
  { key: 'pos', label: 'نقطة البيع والورديات', modules: [], keys: ['can_erp_pos', 'can_pos_shift_open', 'can_pos_shift_close', 'can_pos_shift_report', 'can_pos_shift_view_all'] },
  { key: 'purchases', label: 'المشتريات', modules: ['erp_purchases'], keys: ['can_erp_purchases'] },
  { key: 'inventory', label: 'المخزون', modules: ['erp_inventory'], keys: ['can_erp_inventory'] },
  { key: 'customers', label: 'العملاء', modules: ['erp_customers'], keys: ['can_erp_customers'] },
  { key: 'suppliers', label: 'الموردون', modules: ['erp_suppliers'], keys: ['can_erp_suppliers'] },
  { key: 'finance', label: 'المالية والخزائن', modules: ['erp_finance'], keys: ['can_erp_finance'] },
  { key: 'reports', label: 'التقارير والرقابة', modules: ['erp_reports'], keys: ['can_erp_reports', 'can_erp_audit', 'can_erp_backup_export', 'can_erp_reset'] },
  { key: 'documents', label: 'المستندات والإجراءات العامة', modules: [], keys: ['can_erp_post', 'can_erp_cancel', 'can_erp_print', 'can_erp_document_print', 'can_erp_all_branches'] },
];

function erpScreens() {
  const used = new Set();
  const screens = ERP_SCREENS.map((screen) => {
    const permissions = PERMISSIONS.filter((permission) =>
      screen.modules.includes(permission.module) || screen.keys.includes(permission.key)
    ).filter((permission) => {
      if (used.has(permission.key)) return false;
      used.add(permission.key);
      return true;
    }).map((permission) => ({ ...permission, screenLabel: screen.label }));

    return { ...screen, permissions };
  }).filter((screen) => screen.permissions.length);

  const remaining = PERMISSIONS.filter((permission) => permission.module.startsWith('erp') || permission.key.startsWith('can_pos_'))
    .filter((permission) => !used.has(permission.key))
    .map((permission) => ({ ...permission, screenLabel: 'إجراءات ERP أخرى' }));

  if (remaining.length) screens.push({ key: 'other', label: 'إجراءات ERP أخرى', permissions: remaining });
  return screens;
}

/** الموديولات + صلاحيات كل واحد جوّاها. ده اللي الواجهة بترسم منه. */
export const MODULE_TREE = MODULES.map((m) => {
  if (m.key === 'erp') {
    const screens = erpScreens();
    const permissions = screens.flatMap((screen) => screen.permissions);
    return { ...m, screens, permissions, keys: permissions.map((p) => p.key) };
  }

  const permissions = PERMISSIONS
    .filter((p) => p.module === m.key)
    .map((permission) => ({ ...permission, screenLabel: m.label }));
  return { ...m, permissions, keys: permissions.map((p) => p.key) };
});

/** الموديولات اللي فيها صلاحيات فعليًا — بتتفتح افتراضيًا */
export const DEFAULT_OPEN = Object.fromEntries(
  MODULE_TREE.filter((m) => m.keys.length).map((m) => [m.key, true])
);
