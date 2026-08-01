// ══════════════════════════════════════════════════════════════
//  إعدادات عرض صفحة الأدوار — وصف ثابت، مفيش منطق
//
//  ⚠️ الشارات هنا **عرض بحت**. ما بتديش صلاحية ولا بتتخطّى قاعدة.
//     أي سلوك مربوط بـ is_admin لسه عايش في مكانه الأصلي.
// ══════════════════════════════════════════════════════════════

/**
 * شارات الدور. بتظهر لو العمود اللي في `flag` = true.
 * عايز شارة جديدة؟ سطر واحد هنا.
 */
export const ROLE_BADGES = [
  {
    flag: 'is_admin',
    label: '👑 أدمن كامل',
    short: '👑',
    className: 'border-accent-line bg-accent-soft text-accent',
  },
  {
    flag: 'is_builtin',
    label: '🔒 محمي',
    short: '🔒',
    className: 'border-border bg-surface text-muted',
  },
];

/**
 * كروت الإحصائيات. كل كارت بيقرا من نفس الـ context.
 * عايز كارت جديد؟ سطر واحد هنا.
 *
 * ctx = { roles, builtins, customs, users }
 */
export const STATS = [
  { id: 'total', label: 'إجمالي الأدوار', value: (c) => c.roles.length },
  { id: 'builtin', label: 'أساسية', value: (c) => c.builtins.length },
  { id: 'custom', label: 'مخصّصة', value: (c) => c.customs.length },
  { id: 'users', label: 'مستخدم نشط', value: (c) => c.users.length },
];

/**
 * مجموعات قائمة الأدوار. `pick` بتفلتر من قائمة الأدوار المعروضة.
 * عايز تقسيمة تانية؟ غيّر هنا بس.
 */
export const ROLE_GROUPS = [
  { id: 'custom', label: 'مخصّصة', pick: (roles) => roles.filter((r) => !r.is_builtin) },
  { id: 'builtin', label: 'أساسية 🔒', pick: (roles) => roles.filter((r) => r.is_builtin) },
];
