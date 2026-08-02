import { isIphone } from './brands';

const NO_BRANCH = 'بدون فرع';

// فرع مستخدم بالاسم المعروض
export function branchOf(usersMap, name) {
  const b = usersMap?.[String(name || '').trim()];
  return (b && b.trim()) ? b : NO_BRANCH;
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
export function inRange(v, from, to) {
  const d = toDate(v);
  if (!d) return false;
  if (from && d < new Date(from + 'T00:00:00')) return false;
  if (to && d > new Date(to + 'T23:59:59')) return false;
  return true;
}

// وقت خروج الجهاز (أرشفة)
function outDate(dev) {
  return dev.archived_at || dev.archive_date || null;
}

// ── المخزون الحالي (غير المؤرشف) ──
export function inventoryReport(devices, usersMap) {
  const map = new Map();
  for (const d of devices) {
    if (d.archived) continue;
    const br = branchOf(usersMap, d.addedby);
    if (!map.has(br)) map.set(br, { branch: br, iphone: 0, android: 0, total: 0 });
    const row = map.get(br);
    if (isIphone(d)) row.iphone++; else row.android++;
    row.total++;
  }
  const rows = [...map.values()].sort((a, b) => b.total - a.total);
  const totals = rows.reduce((t, r) => ({ iphone: t.iphone + r.iphone, android: t.android + r.android, total: t.total + r.total }), { iphone: 0, android: 0, total: 0 });
  return { rows, totals };
}

// ── التداول (دخول = إدخال، خروج = أرشفة) خلال الفترة ──
export function turnoverReport(devices, usersMap, from, to) {
  const map = new Map();
  const ensure = (br) => { if (!map.has(br)) map.set(br, { branch: br, in: 0, out: 0 }); return map.get(br); };
  for (const d of devices) {
    if (inRange(d.date, from, to)) ensure(branchOf(usersMap, d.addedby)).in++;
    if (d.archived && inRange(outDate(d), from, to))
      ensure(branchOf(usersMap, d.archived_seller || d.addedby)).out++;
  }
  const rows = [...map.values()].sort((a, b) => (b.in + b.out) - (a.in + a.out));
  const totals = rows.reduce((t, r) => ({ in: t.in + r.in, out: t.out + r.out }), { in: 0, out: 0 });
  return { rows, totals };
}

// ── البائع: مفصّل ──
export function sellerDetailed(devices, from, to) {
  return devices
    .filter((d) => d.archived && String(d.archived_seller || '').trim() && inRange(outDate(d), from, to))
    .map((d) => ({
      seller: d.archived_seller,
      model: d.model,
      code: d.device_code || d.code || '',
      date: outDate(d),
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ── البائع: مجمّع ──
export function sellerAggregate(devices, from, to) {
  const map = new Map();
  for (const d of devices) {
    const s = String(d.archived_seller || '').trim();
    if (!d.archived || !s || !inRange(outDate(d), from, to)) continue;
    map.set(s, (map.get(s) || 0) + 1);
  }
  return [...map.entries()].map(([seller, total]) => ({ seller, total })).sort((a, b) => b.total - a.total);
}


// ── العملاء: مجمّع ──
export function customerAggregate(customers) {
  return [...(customers || [])].map((c) => ({
    customer: String(c.display_name || '').trim() || '—',
    phone: String(c.phone || '').trim() || '—',
    email: String(c.email || '').trim() || '—',
  })).sort((a, b) => a.customer.localeCompare(b.customer, 'ar'));
}

// ── العملاء: مفصّل ──
// تاريخ البيع = تاريخ أرشفة الجهاز باسم العميل.
export function customerDetailed(customers, devices, from, to) {
  const byId = new Map((customers || []).map((c) => [String(c.id), c]));
  return (devices || [])
    .filter((d) => d.archived && d.customer_id != null && inRange(outDate(d), from, to))
    .map((d) => {
      const c = byId.get(String(d.customer_id));
      if (!c) return null;
      const code = d.device_code || d.code || '';
      return {
        customer: String(c.display_name || '').trim() || '—',
        device: `${String(d.model || d.device_model || d.name || '—').trim()}${code ? ` · #${code}` : ''}`,
        date: outDate(d),
      };
    }).filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ── الأرشيف حسب الفرع ──
export function archiveReport(devices, usersMap, from, to) {
  const map = new Map();
  for (const d of devices) {
    if (!d.archived || !inRange(outDate(d), from, to)) continue;
    const br = branchOf(usersMap, d.archived_seller || d.addedby);
    map.set(br, (map.get(br) || 0) + 1);
  }
  const rows = [...map.entries()].map(([branch, count]) => ({ branch, count })).sort((a, b) => b.count - a.count);
  const total = rows.reduce((t, r) => t + r.count, 0);
  return { rows, total };
}

export function fmtDay(v) {
  const d = toDate(v);
  return d ? d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';
}
