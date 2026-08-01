// ══════════════════════════════════════════════════════════════
//  phoneCatalog — منطق البحث والدمج فوق الكتالوج المدمج
//
//  المصادر بتتدمج وتبان كأنها كتالوج واحد:
//    1) BUILTIN_PHONE_MODELS  → مُولّد من CSV (2017–2026) + iPhone.
//                                للقراءة فقط، مايتغيّرش أبدًا.
//    2) custom_phone_models    → موديلات المستخدم (من الداتابيز).
//    3) extraModels            → موديلات النوع الحالية من الكتالوج
//                                القديم (catalog_models/BRAND_MODELS)،
//                                عشان أي سلوك قديم يفضل شغّال بالحرف.
//
//  ⚠️ البحث بيشتغل على فهرس مُطبّع محسوب مرة واحدة (cache). مفيش أي
//     نداء شبكة هنا ولا قراءة للـCSV وقت الكتابة.
// ══════════════════════════════════════════════════════════════

import { BUILTIN_PHONE_MODELS } from './phoneCatalogData';

/** تطبيع نص: trim + lower + تقليص المسافات المكرّرة لمسافة واحدة */
export function normalizeModelName(s) {
  return String(s ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// ── مطابقة البراند (النوع) — تتعامل مع الأسماء المترادفة ──────────
// النوع في الفورم ممكن يكون "iPhone" أو "Xiaomi"… والكتالوج فيه
// "Apple"/"Redmi"/"Poco"… فبنجمّعهم في عائلة واحدة.
const BRAND_FAMILIES = [
  ['apple', 'iphone'],
  ['samsung', 'galaxy'],
  ['xiaomi', 'redmi', 'poco', 'mi'],
  ['oppo'],
  ['vivo'],
  ['realme'],
  ['huawei'],
  ['honor'],
  ['tecno'],
  ['infinix'],
];

const FAMILY_OF = (() => {
  const map = new Map();
  for (const fam of BRAND_FAMILIES) for (const tok of fam) map.set(tok, fam);
  return map;
})();

/** مجموعة رموز البراند اللي تعتبر نفس العائلة للنوع المختار */
function brandTokens(brand) {
  const b = normalizeModelName(brand);
  if (!b) return null;
  return FAMILY_OF.get(b) || [b];
}

/** هل صف الكتالوج تابع للنوع المختار؟ (لو مفيش نوع → الكل) */
export function brandMatches(rowBrand, selectedBrand) {
  const tokens = brandTokens(selectedBrand);
  if (!tokens) return true;
  const rb = normalizeModelName(rowBrand);
  // تطابق مباشر أو نفس العائلة
  if (tokens.includes(rb)) return true;
  const fam = FAMILY_OF.get(rb);
  return !!fam && fam === tokens;
}

// ── بناء الكتالوج المدمج (cache حسب المدخلات) ───────────────────
// عنصر موحّد: { brand, model, key(مطبّع), source:'builtin'|'custom', isNew }
let _builtinIndex = null;
function builtinIndex() {
  if (_builtinIndex) return _builtinIndex;
  _builtinIndex = BUILTIN_PHONE_MODELS.map((r) => ({
    brand: r.brand,
    model: r.model,
    key: normalizeModelName(r.model),
    source: 'builtin',
    isNew: false,
  }));
  return _builtinIndex;
}

/**
 * يدمج المصادر التلاتة ويشيل التكرار (بالموديل المطبّع).
 * الأولوية للمخصّص (custom) عشان شارة 🆕 تفضل ظاهرة لو اتكرر الاسم.
 * @param {Array<{brand:string,model:string}>} customModels
 * @param {string[]} extraModels موديلات النوع الحالية (اختياري)
 * @param {string} selectedBrand
 */
export function buildMergedCatalog(customModels = [], extraModels = [], selectedBrand = '') {
  const out = [];
  const seen = new Set();

  const push = (brand, model, source, isNew) => {
    const key = normalizeModelName(model);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push({ brand: brand || selectedBrand || '', model: String(model).trim(), key, source, isNew });
  };

  // 1) المخصّص أولًا (أولوية الشارة 🆕)
  for (const c of customModels || []) {
    if (!brandMatches(c.brand, selectedBrand)) continue;
    push(c.brand, c.model, 'custom', true);
  }

  // 2) موديلات النوع القديمة (لو موجودة) — تحافظ على السلوك القديم
  for (const m of extraModels || []) {
    push(selectedBrand, m, 'builtin', false);
  }

  // 3) الكتالوج المدمج (CSV + iPhone)
  for (const r of builtinIndex()) {
    if (!brandMatches(r.brand, selectedBrand)) continue;
    push(r.brand, r.model, 'builtin', false);
  }

  return out;
}

/** هل الاسم ده موجود فعلًا في الكتالوج المدمج؟ (لمنع التكرار) */
export function modelExists(catalog, model) {
  const key = normalizeModelName(model);
  if (!key) return false;
  return catalog.some((x) => x.key === key);
}
