// ══════════════════════════════════════════════════════════════
//  modelSearch — بحث وترتيب وتظليل نتائج الموديلات
//
//  منطق البحث اتفصل هنا عن طبقة الداتا (phoneCatalog) عشان يكون
//  قابل لإعادة الاستخدام والاختبار من غير تكرار.
//
//  ترتيب النتائج (V13.7.1):
//    0) المفضّلة (⭐) دايمًا الأول
//    1) تطابق تام
//    2) يبدأ بنص البحث كامل
//    3) يبدأ بأول كلمة
//    4) يحتوي
//    5) أبجدي / الأقصر
// ══════════════════════════════════════════════════════════════

import { normalizeModelName } from './phoneCatalog';

export { normalizeModelName };

/**
 * بحث + ترتيب. بيرجّع عناصر الكتالوج (نفس الشكل) مرتّبة.
 * @param {Array} catalog ناتج buildMergedCatalog: {brand,model,key,source,isNew}
 * @param {string} query
 * @param {object} opts { limit=50, isFavorite:(key)=>bool }
 */
export function searchModels(catalog, query, opts = {}) {
  const { limit = 50, isFavorite = () => false } = opts;
  const q = normalizeModelName(query);
  const terms = q ? q.split(' ').filter(Boolean) : [];

  const rank = (item) => {
    const hay = item.key;
    // tier أصغر = أعلى
    let tier;
    if (!q) tier = 4;
    else if (hay === q) tier = 0;                 // تطابق تام
    else if (hay.startsWith(q)) tier = 1;         // يبدأ بالنص كامل
    else if (terms[0] && hay.startsWith(terms[0])) tier = 2; // يبدأ بأول كلمة
    else tier = 3;                                // يحتوي
    const fav = isFavorite(item.key) ? 0 : 1;
    return { tier, fav };
  };

  const matches = [];
  for (const item of catalog) {
    if (terms.length) {
      // لازم كل الكلمات موجودة (بحث متعدد الكلمات، أي جزء)
      let ok = true;
      for (const t of terms) { if (item.key.indexOf(t) === -1) { ok = false; break; } }
      if (!ok) continue;
    }
    const { tier, fav } = rank(item);
    matches.push({ item, tier, fav });
  }

  matches.sort((a, b) =>
    a.fav - b.fav ||
    a.tier - b.tier ||
    a.item.model.length - b.item.model.length ||
    a.item.model.localeCompare(b.item.model, undefined, { numeric: true })
  );

  return matches.slice(0, limit).map((m) => m.item);
}

/**
 * تقسيم نص لمقاطع {text, hit} لتظليل الأجزاء المطابقة.
 * غير حسّاس لحالة الأحرف، بيظلّل كل ظهور لأي كلمة بحث.
 * @returns {{text:string, hit:boolean}[]}
 */
export function highlightSegments(text, query) {
  const src = String(text ?? '');
  const q = normalizeModelName(query);
  const terms = q ? [...new Set(q.split(' ').filter(Boolean))] : [];
  if (!terms.length) return [{ text: src, hit: false }];

  const lower = src.toLowerCase();
  const mask = new Array(src.length).fill(false);
  for (const t of terms) {
    if (!t) continue;
    let from = 0;
    while (from <= lower.length - t.length) {
      const idx = lower.indexOf(t, from);
      if (idx === -1) break;
      for (let i = idx; i < idx + t.length; i++) mask[i] = true;
      from = idx + t.length;
    }
  }

  const segs = [];
  let cur = '';
  let curHit = mask[0] || false;
  for (let i = 0; i < src.length; i++) {
    if (mask[i] === curHit) { cur += src[i]; }
    else { if (cur) segs.push({ text: cur, hit: curHit }); cur = src[i]; curHit = mask[i]; }
  }
  if (cur) segs.push({ text: cur, hit: curHit });
  return segs;
}
