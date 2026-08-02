import { getPermissionSource } from './permissionSource';

// ══════════════════════════════════════════════════════════════
//  Permission Engine — قواعد الصلاحيات
//
//  الملف ده بيعرف **القواعد** بس. مكان تخزين الصلاحيات شغل
//  `permissionSource.js`. كل قراءة هنا بتعدّي من المصدر الشغّال،
//  فتغيير التخزين بكرة ما بيلمسش الملف ده ولا أي صفحة.
//
//  ⚠️ القواعد دي منقولة حرفيًا من الكود الشغّال. أي تغيير فيها
//     تغيير في سلوك النظام مش refactor:
//
//   1) الزائر/غير المسجّل مالوش أي صلاحية.
//   2) الأدمن بياخد كل حاجة — الحالية والمستقبلية.
//   3) مفتاح مش معروف = ممنوع (لغير الأدمن). السبب إن القراءة
//      الخام بترجّع true لأي مفتاح مش موجود، فغلطة إملائية زي
//      can('can_editt') كانت هتدّي صلاحية بدل ما تمنعها.
//   4) قاعدة الأدمن بتنطبق على `can` بس. `requires` (أعلام `req_*`)
//      بتتقري خام من غير تخطّي — «يطلب سر الحذف» شرط تشغيل مش
//      صلاحية تتمنح.
//   5) الملكية بتتقارن بالاسم المعروض مش باسم المستخدم.
// ══════════════════════════════════════════════════════════════

/** المفاتيح المعروفة عند المصدر الشغّال */
function permissionKeys() {
  return getPermissionSource().keys();
}

function warnUnknown(key, note = '') {
  if (import.meta.env?.DEV && !permissionKeys().includes(key)) {
    console.warn(`[permissions] مفتاح غير معروف: "${key}"${note}`);
  }
}

/** قاعدة (2) */
export function isAdmin(subject) {
  return getPermissionSource().isAdmin(subject);
}

/**
 * هل المستخدم عنده الصلاحية دي؟
 * ⚠️ فحص الأدمن بييجي **قبل** فحص المفتاح عن قصد، عشان أي صلاحية
 *    تتضاف مستقبلًا تبقى متاحة للأدمن من غير أي تعديل هنا.
 */
export function can(subject, key) {
  const src = getPermissionSource();
  if (!subject) return false;
  if (src.isAdmin(subject)) { warnUnknown(key, ' (اتقبل لأن المستخدم أدمن)'); return true; }
  if (!src.keys().includes(key)) { warnUnknown(key); return false; }
  return src.hasFlag(subject, key);
}

/** أعلام المتطلبات — من غير تخطّي للأدمن. شوف قاعدة (4). */
export function requires(subject, key) {
  const src = getPermissionSource();
  if (!subject) return false;
  if (!src.keys().includes(key)) { warnUnknown(key); return false; }
  return src.hasFlag(subject, key);
}

// ══ قواعد الأدوار ═════════════════════════════════════════════

/**
 * لازم يكون للمستخدم دور معرَّف.
 *
 * ⚠️ تغيير سلوكي مقصود (V11.16) — كان قبل كده قايمة أسماء ثابتة:
 *      roleCanEdit   → 'admin' | 'entry' | 'user'
 *      roleCanDelete → 'entry' | 'user'
 *    يعني أي دور مخصّص كان ممنوع من التعديل والحذف مهما كانت
 *    أعلامه، فواجهة الأدوار كانت بتوعد بصلاحيات مش بتشتغل.
 *
 *    دلوقتي العَلَم (`can_edit` / `can_delete`) هو المرجع الوحيد،
 *    زي ما الأرشفة كانت شغّالة من الأول.
 *
 * ⚠️ الفحص ده لسه بيمنع صاحب الدور الفاضي/الناقص. من غيره كان
 *    مستخدم بـ`role = null` هياخد صلاحيات، لأن القراءة الخام
 *    بترجّع `true` للعمود الفاضي.
 */
function hasRole(role) {
  return typeof role === 'string' && role.length > 0;
}

// ══ فحوصات على مستوى السجل ═══════════════════════════════════

/**
 * هل السجل ده في نطاق المستخدم؟
 *
 * ⚠️ لازم يفضل **مطابق** لدالة `can_touch_device()` في الداتابيز.
 *    لو الاتنين اختلفوا، الزرار هيظهر والسيرفر هيرفض — وده أوحش
 *    من إن الزرار ما يظهرش من الأول.
 *
 * ⚠️ المقارنة بـ`owner_id` و`branch` **مش** بـ`addedby`. الاسم
 *    المعروض قابل للتعديل، فلو اتغيّر كان الموظف هيفقد شغله.
 */
export function canTouchRecord(record, subject) {
  if (!subject || !record) return false;
  const src = getPermissionSource();

  // ⚠️ حارس: لو السجل واصل من غير الحقلين دول أصلًا (مش null — **مش
  //    موجودين**) فغالبًا فيه mapper بيبني الحقول يدويًا ونسيهم، زي
  //    اللي حصل في `normalize()` في V11.18. النتيجة صلاحيات مقفولة
  //    من غير سبب ظاهر، وده صعب جدًا يتلاقى.
  if (import.meta.env?.DEV && !('owner_id' in record) && !('branch' in record)) {
    console.warn('[permissions] السجل واصل من غير owner_id ولا branch — فيه mapper بيضيّعهم؟', record);
  }

  const owner = src.getOwnerId(subject);
  if (owner && record.owner_id === owner) return true;

  const branch = src.getBranch(subject);
  if (branch && record.branch && record.branch === branch) return true;

  return false;
}

/**
 * ⚠️ كل فحص على مستوى السجل لازم يعدّي من هنا.
 *    قاعدة الأدمن مكتوبة **مرة واحدة** في الملف كله (هنا + في `can`)،
 *    عشان أي فحص جديد يتضاف مستقبلًا ما ينساهاش.
 */
function checkRecord(subject, rule) {
  if (!subject) return false;
  if (getPermissionSource().isAdmin(subject)) return true;
  return rule(getPermissionSource());
}

export function canEditRecord(record, subject) {
  return checkRecord(subject, (src) =>
    hasRole(src.getRole(subject)) &&
    canTouchRecord(record, subject) &&
    src.hasFlag(subject, 'can_edit')
  );
}

export function canDeleteRecord(record, subject) {
  return checkRecord(subject, (src) =>
    hasRole(src.getRole(subject)) &&
    canTouchRecord(record, subject) &&
    src.hasFlag(subject, 'can_delete')
  );
}

/**
 * ⚠️ الأرشفة — على عكس التعديل والحذف — ما بتشترطش دور معيّن،
 *    بتشترط الملكية والعلم بس. ده سلوك الأصل.
 */
export function canArchiveRecord(record, subject) {
  return checkRecord(subject, (src) =>
    hasRole(src.getRole(subject)) &&
    canTouchRecord(record, subject) &&
    src.hasFlag(subject, 'can_archive')
  );
}

/** الاسم المعروض — اللي الملكية بتتقارن بيه */
export function displayOf(subject) {
  return getPermissionSource().getDisplay(subject);
}

/** الدور النصّي */
export function roleOf(subject) {
  return getPermissionSource().getRole(subject);
}
