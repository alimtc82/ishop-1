/**
 * حساب الخصومات والعروض.
 * العرض يُطبَّق على سعر سياسة معيّنة، أو على كل السياسات لو price_group_id = null.
 */

/** يبني خريطة: product_id -> قائمة العروض السارية */
export function indexOffers(rows) {
  const map = new Map();
  for (const o of rows || []) {
    const k = String(o.product_id);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(o);
  }
  return map;
}

/** يختار العرض المناسب لمنتج + سياسة (الأخص يفوز على "كل السياسات") */
export function pickOffer(offers, priceGroupId) {
  if (!offers?.length) return null;
  const exact = offers.find(o => o.price_group_id != null && String(o.price_group_id) === String(priceGroupId));
  if (exact) return exact;
  return offers.find(o => o.price_group_id == null) || null;
}

/** يحسب السعر بعد الخصم + نسبة الخصم */
export function applyOffer(price, offer) {
  const base = Number(price || 0);
  if (!offer || !(base > 0)) return { final: base, original: base, percent: 0, hasDiscount: false };

  const val = Number(offer.discount_value || 0);
  let final = offer.discount_type === 'percent' ? base - (base * val) / 100 : base - val;

  final = Math.max(0, Math.round(final * 100) / 100);
  if (final >= base) return { final: base, original: base, percent: 0, hasDiscount: false };

  const percent = Math.round(((base - final) / base) * 100);
  return { final, original: base, percent, hasDiscount: true };
}

/** اختصار: منتج + سياسة + خريطة العروض -> نتيجة السعر */
export function priceWithOffer(price, productId, priceGroupId, offersMap) {
  const offer = pickOffer(offersMap?.get(String(productId)), priceGroupId);
  return applyOffer(price, offer);
}

/** نص الوقت المتبقي للعرض */
export function offerTimeLeft(endsAt) {
  if (!endsAt) return '';
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return '';
  const d = Math.floor(ms / 86400000);
  if (d >= 1) return `ينتهي خلال ${d} يوم`;
  const h = Math.floor(ms / 3600000);
  return h >= 1 ? `ينتهي خلال ${h} ساعة` : 'ينتهي قريبًا';
}
