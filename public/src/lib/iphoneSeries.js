// ── بيانات سلاسل iPhone + مصنّف الموديل ───────────────────────────
// المواصفات ثابتة ومعروفة. عدّلها من هنا لو حبيت.

export const SERIES_META = {
  'iPhone 16': { year: '2024', chip: 'A18 / A18 Pro', ram: '8GB', highlight: 'زر Camera Control ودعم Apple Intelligence' },
  'iPhone 15': { year: '2023', chip: 'A16 / A17 Pro', ram: '6–8GB', highlight: 'منفذ USB-C وكاميرا 48 ميجابكسل' },
  'iPhone 14': { year: '2022', chip: 'A15 / A16', ram: '6GB', highlight: 'الاتصال بالأقمار الصناعية وكشف الحوادث' },
  'iPhone 13': { year: '2021', chip: 'A15 Bionic', ram: '4–6GB', highlight: 'بطارية أطول وشاشة ProMotion في Pro' },
  'iPhone 12': { year: '2020', chip: 'A14 Bionic', ram: '4–6GB', highlight: 'أول دعم 5G وتصميم بحواف مسطحة' },
  'iPhone 11': { year: '2019', chip: 'A13 Bionic', ram: '4GB', highlight: 'كاميرا مزدوجة والوضع الليلي' },
  'iPhone XS': { year: '2018', chip: 'A12 Bionic', ram: '4GB', highlight: 'شاشة OLED وأداء قوي بمعالج A12' },
  'iPhone XR': { year: '2018', chip: 'A12 Bionic', ram: '3GB', highlight: 'ألوان متعددة وبطارية ممتازة بسعر أنسب' },
  'iPhone X':  { year: '2017', chip: 'A11 Bionic', ram: '3GB', highlight: 'أول آيفون بشاشة كاملة وFaceID' },
  'iPhone SE': { year: '2020 / 2022', chip: 'A13 / A15', ram: '3–4GB', highlight: 'حجم مدمج وTouch ID بسعر اقتصادي' },
};

// ترتيب السلاسل من الأحدث للأقدم
export function seriesRank(key) {
  const meta = SERIES_META[key];
  if (meta) return parseInt(String(meta.year), 10) || 0;
  const n = key.match(/iPhone\s*(\d{1,2})/i);
  return n ? 2000 + parseInt(n[1], 10) : 0;
}

// من الموديل → اسم السلسلة (أو null لو مش iPhone معروف)
export function deviceSeries(model) {
  const m = String(model || '');
  if (!/iphone/i.test(m)) return null;
  if (/iphone\s*se/i.test(m)) return 'iPhone SE';
  if (/iphone\s*xs/i.test(m)) return 'iPhone XS';
  if (/iphone\s*xr/i.test(m)) return 'iPhone XR';
  if (/iphone\s*x(\b|max|\s|$)/i.test(m)) return 'iPhone X';
  const num = m.match(/iphone\s*(\d{1,2})/i);
  if (num) return 'iPhone ' + num[1];
  return null;
}
