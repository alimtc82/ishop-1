// ══ المصدر الوحيد للثوابت ═════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  قاعدة ترقيم الإصدارات:  V<MAJOR>.<MINOR>[.<PATCH>]
//
//    MAJOR = 11  → جيل React. ما يزيدش غير مع إعادة بناء/تغيير Stack.
//    MINOR       → +1 مع كل تحديث بيتسلّم. بالترتيب، من غير قفزات.
//                  11.6 → 11.7 → 11.8 → … → 11.9 → 11.10 → 11.11
//                  (11.10 أكبر من 11.9 — الرقم مش كسر عشري)
//    PATCH       → يتزوّد بس لو التحديث اتنشر وطلع فيه خطأ اتصلّح
//                  بعد النشر:  11.7 → 11.7.1
//
//  ⚠️ مصدر واحد للحقيقة: APP_VERSION هنا + "version" في package.json
//     لازم يبقوا متطابقين، ويتحدّثوا في نفس الـ commit.
//  ⚠️ يظهر في واجهة الموظفين (StaffShell) وشاشة الدخول (Login).
//  ⚠️ كل رقم بيتسجّل بسطر في CHANGELOG.md.
// ════════════════════════════════════════════════════════════════
export const APP_VERSION = 'V15.5.8';

export const PAGE_SIZE = 30;
export const IDLE_MINUTES = 20;
export const MAX_IMG_SIZE = 800; // أقصى عرض/ارتفاع بعد الضغط

// الأعمدة المسموح للزائر يشوفها — منقولة حرفيًا من v4.5.1
export const GUEST_DEVICE_COLS = [
  'id',
  'device_code',
  'model',
  'brand',
  'storage',
  'battery',
  'cycles',
  'color',
  'sim',
  'box',
  'repair',
  'tax',
  'warranty',
  'warranty_date',
  'lock',
  'defects',
  'extras',
  'imei',
  'price',
  'notes',
  'addedby',
  'phone',
  'date',
  'archived',
  'images',
].join(',');

/**
 * أعمدة الجهاز التي تقرأها الواجهة فعليًا للمستخدم المسجّل (normalize في useDevices).
 * أي عمود خارج القائمة يُهمَل في التطبيع أصلًا، فجلبه بـ select('*') إهدار.
 * مستبعَد عمدًا: price, notes, imgs_removed, customer_id (لا تُقرأ من نتيجة القائمة).
 */
export const DEVICE_COLS = [
  'id',
  'device_code',
  'model',
  'brand',
  'images',
  'storage',
  'battery',
  'cycles',
  'color',
  'sim',
  'box',
  'repair',
  'tax',
  'warranty',
  'warranty_date',
  'lock',
  'defects',
  'extras',
  'addedby',
  'phone',
  'date',
  'archived',
  'archive_reason',
  'buyer_name',
  'buyer_phone',
  'archive_date',
  'archived_at',
  'archived_by',
  'archived_seller',
  'imei',
  'owner_id',
  'branch',
].join(',');

// مفاتيح localStorage — لازم تفضل بأسمائها عشان المستخدمين الحاليين
// ما يفقدوش إعداداتهم
export const LS_KEYS = {
  theme: 'ishop-theme',
  layout: 'ishop-layout',
  searchHistory: 'ishop-search-hist',
  modelRecent: 'ishop-model-recent',
  modelFavorites: 'ishop-model-favs',
  modelStats: 'ishop-model-stats',
};
