import { useCallback, useEffect, useState } from 'react';
import { fetchDevices, fetchDevicePrices } from '../lib/api';
import { formatBattery, formatDate, formatPhone } from '../utils/format';

/**
 * data.js:40-70 — نفس التطبيع ونفس الفصل.
 *
 * ملاحظة: المستخدم المسجّل بيحمّل كل الصفوف (المؤرشفة والنشطة)،
 * والفصل بيحصل هنا بعد التحميل — مش في الاستعلام.
 */
function normalize(r, pricesByPolicy = {}) {
  return {
    sheetRow: r.id,
    // أسعار الجهاز مفهرسة بـ policy_id (فاضية لو مفيش/الجدول لسه مش موجود)
    pricesByPolicy,
    code: r.device_code || '',
    model: r.model || '-',
    brand: r.brand || '',
    images: r.images || [],
    storage: r.storage || '-',
    battery: formatBattery(r.battery),
    cycles: r.cycles || '-',
    color: r.color || '-',
    sim: r.sim || '-',
    box: r.box || '-',
    repair: r.repair || '-',
    tax: r.tax || '-',
    warranty: r.warranty || '-',
    warrantyDate: formatDate(r.warranty_date) || '-',
    // القيمة الخام لـ input[type=date] (بيطلب yyyy-mm-dd). العرض بيفضل من warrantyDisplay.
    warrantyDateRaw: (() => {
      const s = String(r.warranty_date || '').trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
    })(),
    // عرض موحّد: لو ساري وفيه تاريخ → "ساري حتى dd/mm/yy"
    warrantyDisplay: (() => {
      const w = r.warranty || '-';
      const d = formatDate(r.warranty_date);
      if (w === 'ساري' && d && d !== '-') return `ساري حتى ${d}`;
      return w;
    })(),
    lock: r.lock || '-',
    defects: r.defects || '-',
    extras: r.extras || '-',
    addedby: r.addedby || '-',
    phone: formatPhone(r.phone),
    date: formatDate(r.date),
    archived: r.archived ? 'نعم' : '',
    archiveReason: r.archive_reason || '',
    buyerName: r.buyer_name || '',
    buyerPhone: r.buyer_phone || '',
    archiveDate: r.archive_date || '',
    archivedAt: r.archived_at || '',
    archived_at: r.archived_at || '',
    archivedBy: r.archived_by || '',
    seller: r.archived_seller || '',
    imei: r.imei || '',
    rawDate: r.date || '',

    // ── حقول الملكية — محرّك الصلاحيات بيعتمد عليها ──
    // ⚠️ بأسماء الداتابيز بالظبط (snake_case) مش camelCase زي باقي
    //    الحقول فوق. مقصود: `canTouchRecord()` لازم تفضل مطابقة حرفيًا
    //    لدالة `can_touch_device(owner_id, branch)` في الـRLS. أي فرق
    //    في التسمية بيخلّي الزرار يظهر والسيرفر يرفض.
    // ⚠️ الحقول دي **لازم** تفضل هنا. الزائر مش بيستلمها (أعمدته
    //    محدودة) — وده صح، الزائر مالوش صلاحيات أصلاً.
    owner_id: r.owner_id ?? null,
    branch: r.branch ?? null,
  };
}

export function useDevices({ guest }) {
  const [records, setRecords] = useState([]);
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // الأسعار محروسة: لو الجدول لسه مش موجود، نكمّل من غير أسعار
      const [raw, priceRows] = await Promise.all([
        fetchDevices({ guest }),
        fetchDevicePrices().catch(() => []),
      ]);

      const byDevice = {};
      for (const p of priceRows) {
        (byDevice[p.device_id] ||= {})[p.policy_id] = p.price;
      }

      const all = raw.map((r) => normalize(r, byDevice[r.id] || {}));
      setArchived(all.filter((r) => r.archived === 'نعم'));
      setRecords(all.filter((r) => r.archived !== 'نعم'));
    } catch (e) {
      setError(e.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [guest]);

  useEffect(() => { load(); }, [load]);

  return { records, archived, loading, error, reload: load };
}
