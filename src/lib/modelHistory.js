// ══════════════════════════════════════════════════════════════
//  modelHistory — تخزين محلي لآخر الموديلات + المفضّلة + الإحصاء
//
//  كله localStorage، محروس بـ try/catch (وضع التصفّح الخاص/الامتلاء
//  ما بيكسرش الفورم). المفتاح المطبّع (normalizeModelName) هو
//  الهوية، والاسم المعروض بيتخزّن معاه.
// ══════════════════════════════════════════════════════════════

import { LS_KEYS } from './constants';
import { normalizeModelName } from './phoneCatalog';

const RECENT_MAX = 10;
const FAV_MAX = 30;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ممتلئ/محظور */ }
}

const asEntry = (m) => {
  if (!m) return null;
  const model = typeof m === 'string' ? m : (m.model || '');
  const brand = typeof m === 'string' ? '' : (m.brand || '');
  const key = normalizeModelName(model);
  if (!key) return null;
  return { model: String(model).trim(), brand, key };
};

// ── Recent ─────────────────────────────────────────────────────
export function getRecent() {
  const list = read(LS_KEYS.modelRecent, []);
  return Array.isArray(list) ? list.filter((x) => x && x.model) : [];
}
export function pushRecent(m) {
  const e = asEntry(m);
  if (!e) return getRecent();
  const prev = getRecent().filter((x) => x.key !== e.key);
  const next = [e, ...prev].slice(0, RECENT_MAX);
  write(LS_KEYS.modelRecent, next);
  return next;
}

// ── Favorites ──────────────────────────────────────────────────
export function getFavorites() {
  const list = read(LS_KEYS.modelFavorites, []);
  return Array.isArray(list) ? list.filter((x) => x && x.model) : [];
}
export function isFavoriteKey(key) {
  return getFavorites().some((x) => x.key === key);
}
export function toggleFavorite(m) {
  const e = asEntry(m);
  if (!e) return getFavorites();
  const cur = getFavorites();
  const exists = cur.some((x) => x.key === e.key);
  const next = exists
    ? cur.filter((x) => x.key !== e.key)
    : [{ ...e, pinned: false }, ...cur].slice(0, FAV_MAX); // الجديد يظهر الأول
  write(LS_KEYS.modelFavorites, next);
  return next;
}

// اختيار/استخدام موديل مفضّل → يطفو للأول، إلا لو مثبّت بالسحب.
export function bubbleFavorite(m) {
  const e = asEntry(m);
  if (!e) return getFavorites();
  const cur = getFavorites();
  const idx = cur.findIndex((x) => x.key === e.key);
  if (idx < 0 || cur[idx].pinned) return cur;       // مش مفضّل أو مثبّت → سيبه
  const item = cur[idx];
  const next = [item, ...cur.slice(0, idx), ...cur.slice(idx + 1)];
  write(LS_KEYS.modelFavorites, next);
  return next;
}

// إعادة ترتيب بالسحب → يحفظ الترتيب اليدوي ويثبّت العنصر المسحوب.
// بالمفتاح (مش بالفهرس) عشان يشتغل صح حتى لو العرض مفلتر بالنوع.
export function reorderFavorites(fromKey, toKey) {
  const cur = getFavorites();
  const from = cur.findIndex((x) => x.key === fromKey);
  if (from < 0 || fromKey === toKey) return cur;
  const next = cur.slice();
  const [moved] = next.splice(from, 1);
  moved.pinned = true;                               // اتسحب → مثبّت في مكانه
  const insertAt = next.findIndex((x) => x.key === toKey);
  next.splice(insertAt < 0 ? next.length : insertAt, 0, moved);
  write(LS_KEYS.modelFavorites, next);
  return next;
}

// ── Statistics (most selected) ─────────────────────────────────
export function bumpStat(m) {
  const e = asEntry(m);
  if (!e) return;
  const stats = read(LS_KEYS.modelStats, {});
  const cur = stats[e.key] || { model: e.model, brand: e.brand, count: 0 };
  cur.count += 1;
  cur.model = e.model;
  cur.brand = e.brand || cur.brand;
  stats[e.key] = cur;
  write(LS_KEYS.modelStats, stats);
}
export function getMostSelected(n = 10) {
  const stats = read(LS_KEYS.modelStats, {});
  return Object.entries(stats)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count || a.model.localeCompare(b.model))
    .slice(0, n);
}
