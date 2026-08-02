import { useMemo, useState, lazy, Suspense } from 'react';
import { usePermissions } from '../context/PermissionContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useDevices } from '../hooks/useDevices';
import { unarchiveDevice, updateDevice, fetchArchiveCustomers, ensurePurchaseCustomer } from '../lib/api';
import { printReceipt } from '../lib/receipt';
import { getBrand, brandIcon } from '../lib/brands';
import { batteryNum } from '../utils/format';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { SkeletonCard } from '../components/ui/Skeleton';

const Modal = lazy(() => import('../components/ui/Modal'));

// حقول تفاصيل الجهاز المؤرشف (تظهر عند الضغط على السجل)
const ARCHIVE_FIELDS = [
  ['السبب', 'archiveReason'], ['تاريخ الأرشفة', 'archiveDate'],
  ['المشتري', 'buyerName'], ['هاتف المشتري', 'buyerPhone'], ['IMEI', 'imei'],
];
const DEVICE_FIELDS = [
  ['الموديل', 'model'], ['السعة', 'storage'], ['اللون', 'color'],
  ['البطارية', 'battery'], ['الدورات', 'cycles'], ['الشريحة', 'sim'],
  ['العلبة', 'box'], ['الصيانة', 'repair'], ['الجمرك', 'tax'],
  ['الضمان', 'warrantyDisplay'], ['القفل', 'lock'],
  ['العيوب', 'defects'], ['إضافات', 'extras'],
  ['المُدخِل', 'addedby'], ['تاريخ الإدخال', 'date'], ['رقم التواصل', 'phone'],
];

export default function Archive() {
  const { username } = useAuth();
  const { isAdmin, canTouch, canArchive } = usePermissions();
  const { show } = useToast();
  const { archived, loading, error, reload } = useDevices({ guest: false });

  const [q, setQ] = useState('');
  const [reason, setReason] = useState('');
  const [unarchiveTarget, setUnarchiveTarget] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editArchive, setEditArchive] = useState(null);
  const [customers, setCustomers] = useState([]);

  async function openArchiveEdit(r) {
    setBusy(true);
    try {
      const list = await fetchArchiveCustomers();
      setCustomers(list);
      setEditArchive({ device: r, buyerPhone: r.buyerPhone || '', buyerName: r.buyerName || '', customerId: r.customerId || null });
    } catch (e) { show('❌ فشل تحميل العملاء: ' + (e.message || ''), 'error'); }
    finally { setBusy(false); }
  }

  function setArchiveBuyer(field, value) {
    setEditArchive((p) => {
      if (!p) return p;
      const next = { ...p, [field]: value, customerId: null };
      const key = field === 'buyerPhone' ? 'phone' : 'display_name';
      const v = String(value || '').trim().toLowerCase();
      const found = v ? customers.find((c) => String(c[key] || '').trim().toLowerCase() === v) : null;
      if (found) {
        next.customerId = found.id;
        next.buyerName = found.display_name || next.buyerName;
        next.buyerPhone = found.phone || next.buyerPhone;
      }
      return next;
    });
  }

  async function saveArchiveEdit() {
    if (!editArchive) return;
    const name = String(editArchive.buyerName || '').trim();
    const phone = String(editArchive.buyerPhone || '').trim();
    if (!name) { show('⚠️ اسم المشتري مطلوب', 'error'); return; }
    setBusy(true);
    try {
      const customerId = await ensurePurchaseCustomer({ id: editArchive.customerId, displayName: name, phone });
      await updateDevice(editArchive.device.sheetRow, { buyer_name: name, buyer_phone: phone || '', customer_id: customerId });
      show('✅ تم تعديل بيانات المشتري');
      setEditArchive(null); setDetail(null); await reload();
    } catch (e) { show('❌ فشل الحفظ: ' + (e.message || ''), 'error'); }
    finally { setBusy(false); }
  }

  // غير الأدمن يشوف أرشيفه هو بس (نفس منطق ui.js:669)
  const mine = useMemo(() => {
    if (isAdmin()) return archived;
    return archived.filter(canTouch);
  }, [archived, isAdmin, canTouch]);

  const results = useMemo(() => {
    let out = mine;
    if (q) {
      const term = q.trim().toLowerCase();
      out = out.filter((r) =>
        r.model.toLowerCase().includes(term) ||
        String(r.code).toLowerCase().includes(term) ||
        (r.buyerName || '').toLowerCase().includes(term) ||
        (r.buyerPhone || '').toLowerCase().includes(term) ||
        (r.imei || '').toLowerCase().includes(term)
      );
    }
    if (reason) out = out.filter((r) => r.archiveReason === reason);

    // الأرشيف يُرتب زمنيًا: أحدث جهاز تمت أرشفته يظهر أولًا.
    // لا نستخدم كود الجهاز في الترتيب لأنه لا يمثل توقيت الأرشفة.
    const archiveTime = (r) => {
      const raw = r.archivedAt || r.archived_at || r.archiveDate || '';
      if (!raw) return 0;
      const direct = Date.parse(raw);
      if (!Number.isNaN(direct)) return direct;

      // دعم التواريخ المكتوبة بصيغة يوم/شهر/سنة مع وقت اختياري.
      const m = String(raw).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (!m) return 0;
      return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0)).getTime();
    };

    return [...out].sort((a, b) => {
      const byArchiveTime = archiveTime(b) - archiveTime(a);
      if (byArchiveTime !== 0) return byArchiveTime;
      // fallback ثابت فقط عند غياب/تساوي وقت الأرشفة، بدون تغيير قواعد الصلاحيات.
      return Number(b.sheetRow || 0) - Number(a.sheetRow || 0);
    });
  }, [mine, q, reason]);

  const reasons = useMemo(
    () => [...new Set(mine.map((r) => r.archiveReason).filter(Boolean))],
    [mine]
  );

  async function doUnarchive(device) {
    setBusy(true);
    try {
      const { imagesWereRemoved } = await unarchiveDevice(device.sheetRow);
      show('✅ رجع الجهاز للقائمة');
      if (imagesWereRemoved) {
        show('📷 صور الجهاز كانت اتشالت وقت الأرشفة — لازم تضيفله صور جديدة من التعديل', 'info');
      }
      setUnarchiveTarget(null);
      reload();
    } catch (e) {
      show('❌ فشل: ' + (e.message || ''), 'error');
    } finally {
      setBusy(false);
    }
  }

  function reprint(r) {
    printReceipt({
      device: r,
      buyerName: r.buyerName || '',
      buyerPhone: r.buyerPhone || '',
      imei: r.imei || '',
      archiveDate: r.archiveDate || '',
      username: r.archivedBy || username,
      seller: r.seller || '',
    });
  }

  const canUnarchive = canArchive;

  if (error) {
    return <div className="py-20 text-center text-sm font-bold text-danger">❌ {error}</div>;
  }

  return (
    <div className="space-y-5 py-6">
      <div>
        <h1 className="text-2xl font-black text-accent">الأرشيف</h1>
        <p className="num mt-1 text-sm text-muted">{mine.length} جهاز مؤرشف</p>
      </div>

      {/* الفلاتر */}
      <div className="flex flex-wrap gap-2">
        <div className="min-w-[200px] flex-1">
          <Input placeholder="ابحث بالموديل · الكود · المشتري · الرقم · IMEI" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
        >
          <option value="">كل الأسباب</option>
          {reasons.map((rs) => <option key={rs} value={rs}>{rs}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : results.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-5xl opacity-40">📦</div>
          <p className="mt-3 text-sm font-bold text-muted">مفيش أجهزة مؤرشفة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.sheetRow}
                 onClick={() => setDetail(r)}
                 className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 cursor-pointer transition hover:border-accent-line">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface text-xl">
                {brandIcon(getBrand(r), r.model)}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-black text-text">
                  {r.model}
                  {r.code && <span className="num ms-1.5 text-[11px] text-muted">#{r.code}</span>}
                </h3>
                <p className="num text-xs text-muted">
                  {r.storage}
                  {r.archiveReason && <span className="ms-2 text-accent">· {r.archiveReason}</span>}
                </p>
                {r.buyerName && (
                  <p className="mt-0.5 text-[11px] text-muted">
                    المشتري: {r.buyerName}{r.buyerPhone ? ` · ${r.buyerPhone}` : ''}
                  </p>
                )}
                {r.archiveDate && (
                  <p className="num text-[11px] text-muted opacity-70">{r.archiveDate}</p>
                )}
              </div>

              <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => reprint(r)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-bold text-muted transition hover:text-accent"
                >
                  🖨️ إيصال
                </button>
                {canUnarchive(r) && (
                  <button
                    type="button"
                    onClick={() => setUnarchiveTarget(r)}
                    className="rounded-lg border border-[var(--mtc-success)]/30 bg-[var(--mtc-success)]/12 px-2.5 py-1.5 text-[11px] font-bold text-[var(--mtc-success)] transition hover:bg-[var(--mtc-success)]/25"
                  >
                    ↩️ إرجاع
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* تفاصيل الجهاز المؤرشف الكاملة */}
      {detail && (
        <Suspense fallback={null}>
          <Modal
            open
            onClose={() => setDetail(null)}
            icon="📦"
            title={`${detail.model}${detail.code ? ' · #' + detail.code : ''}`}
            actions={
              <>
                {canArchive(detail) && <Button variant="plain" onClick={() => openArchiveEdit(detail)}>✏️ تعديل الأرشيف</Button>}
                <Button variant="plain" onClick={() => setDetail(null)}>إغلاق</Button>
              </>
            }
          >
            <div className="max-h-[58vh] space-y-3 overflow-y-auto text-start">
              {/* بيانات الأرشفة */}
              <div className="rounded-xl border border-accent-line bg-accent-soft p-3">
                <p className="mb-2 text-xs font-black text-accent">بيانات الأرشفة</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {ARCHIVE_FIELDS.map(([label, key]) =>
                    detail[key] && detail[key] !== '-' ? (
                      <div key={key}>
                        <dt className="text-[11px] text-muted">{label}</dt>
                        <dd className="num text-sm font-bold text-text break-words">{detail[key]}</dd>
                      </div>
                    ) : null
                  )}
                </dl>
              </div>

              {/* بيانات الجهاز */}
              <div className="rounded-xl border border-border bg-surface/40 p-3">
                <p className="mb-2 text-xs font-black text-muted">بيانات الجهاز</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {DEVICE_FIELDS.map(([label, key]) =>
                    detail[key] && detail[key] !== '-' ? (
                      <div key={key}>
                        <dt className="text-[11px] text-muted">{label}</dt>
                        <dd className="num text-sm font-bold text-text break-words">{detail[key]}</dd>
                      </div>
                    ) : null
                  )}
                </dl>
              </div>

              {/* الصور لو موجودة */}
              {detail.images?.length > 0 && (
                <p className="num text-[11px] text-muted">📷 {detail.images.length} صورة مرفقة</p>
              )}
            </div>
          </Modal>
        </Suspense>
      )}

      {editArchive && (
        <Suspense fallback={null}>
          <Modal open onClose={() => !busy && setEditArchive(null)} icon="✏️" title="تعديل بيانات المشتري"
            actions={<><Button variant="plain" onClick={() => setEditArchive(null)} disabled={busy}>إلغاء</Button><Button loading={busy} onClick={saveArchiveEdit}>💾 حفظ</Button></>}>
            <div className="space-y-3 text-start">
              <label className="block"><span className="mb-1.5 block text-xs font-black text-muted">رقم هاتف المشتري</span>
                <Input value={editArchive.buyerPhone} onChange={(e) => setArchiveBuyer('buyerPhone', e.target.value)} placeholder="ابحث أو اكتب رقم جديد" dir="ltr" />
              </label>
              <label className="block"><span className="mb-1.5 block text-xs font-black text-muted">اسم المشتري</span>
                <Input value={editArchive.buyerName} onChange={(e) => setArchiveBuyer('buyerName', e.target.value)} placeholder="ابحث أو اكتب اسم جديد" />
              </label>
              {editArchive.customerId
                ? <p className="text-xs font-black text-[var(--mtc-success)]">✓ عميل موجود — تم ربط الاسم والرقم معًا</p>
                : <p className="text-[11px] text-muted">لو العميل جديد، سيتم إضافته تلقائيًا إلى قائمة العملاء عند الحفظ.</p>}
            </div>
          </Modal>
        </Suspense>
      )}

      {/* تأكيد الإرجاع */}
      {unarchiveTarget && (
        <Suspense fallback={null}>
          <Modal
            open
            onClose={() => setUnarchiveTarget(null)}
            icon="↩️"
            title="إرجاع للقائمة"
            description={`هترجّع "${unarchiveTarget.model}" للمخزون؟ هيتشال من الأرشيف وتتمسح بيانات البيع.`}
            actions={
              <>
                <Button variant="plain" onClick={() => setUnarchiveTarget(null)} disabled={busy}>
                  إلغاء
                </Button>
                <Button loading={busy} onClick={() => doUnarchive(unarchiveTarget)}>
                  ↩️ إرجاع
                </Button>
              </>
            }
          />
        </Suspense>
      )}
    </div>
  );
}
