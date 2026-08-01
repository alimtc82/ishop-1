import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchSetting } from '../lib/api';
import { saveSetting, fetchAllReviews, approveReview, deleteReview, deleteCustomerCompletely } from '../lib/adminApi';
import HeroEditor from './HeroEditor';
import Input from './ui/Input';
import Button from './ui/Button';
import Toggle from './ui/Toggle';

export default function ReviewsAdmin() {
  const { show } = useToast();

  // ── التقييمات ──
  const [reviews, setReviews] = useState([]);
  const [loadingR, setLoadingR] = useState(true);
  const [busyCustomer, setBusyCustomer] = useState(null);
  const [requireApproval, setRequireApproval] = useState(true);
  const [savingApproval, setSavingApproval] = useState(false);

  useEffect(() => {
    loadReviews();
    fetchSetting('reviews_require_approval').then((v) => setRequireApproval(v !== false));
  }, []);

  async function loadReviews() {
    setLoadingR(true);
    try { setReviews(await fetchAllReviews()); }
    catch (e) { show('❌ ' + (e.message || ''), 'error'); }
    finally { setLoadingR(false); }
  }


  async function changeApprovalMode(next) {
    setSavingApproval(true);
    try {
      await saveSetting('reviews_require_approval', next);
      setRequireApproval(next);
      show(next ? '✅ اعتماد النشر مفعّل' : '✅ النشر المباشر مفعّل', 'success');
    } catch (e) { show('❌ ' + (e.message || ''), 'error'); }
    finally { setSavingApproval(false); }
  }

  async function toggle(r) {
    try { await approveReview(r.id, !r.approved); setReviews((p) => p.map((x) => x.id === r.id ? { ...x, approved: !r.approved } : x)); }
    catch (e) { show('❌ ' + (e.message || ''), 'error'); }
  }
  async function remove(r) {
    if (!window.confirm('حذف الرأي نهائيًا؟')) return;
    try { await deleteReview(r.id); setReviews((p) => p.filter((x) => x.id !== r.id)); show('🗑️ اتحذف'); }
    catch (e) { show('❌ ' + (e.message || ''), 'error'); }
  }

  // V11.31 — حذف العميل بالكامل: تقييماته + صفّه + حساب الدخول.
  // الـ Edge Function بترفض لو الحساب بتاع موظف وبترجّع السبب في الرسالة.
  async function removeCustomer(r) {
    const n = reviews.filter((x) => x.customer_id === r.customer_id).length;
    const name = r.customer_name || 'العميل';
    const ok = window.confirm(
      `حذف «${name}» نهائيًا؟\n\n` +
      `هيتمسح: ${n} تقييم + بياناته + حساب دخوله بفيسبوك.\n` +
      'العملية دي مالهاش رجعة.'
    );
    if (!ok) return;
    setBusyCustomer(r.customer_id);
    try {
      const res = await deleteCustomerCompletely(r.customer_id);
      setReviews((p) => p.filter((x) => x.customer_id !== r.customer_id));
      show(`🗑️ اتمسح «${res?.display_name || name}» و${res?.deleted_reviews ?? n} تقييم`);
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
      loadReviews();   // الرفض ممكن يكون جزئي — نرجع للحقيقة من السيرفر
    } finally {
      setBusyCustomer(null);
    }
  }

  const pending = reviews.filter((r) => !r.approved);
  const approved = reviews.filter((r) => r.approved);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-accent">التقييمات</h1>
        <p className="mt-1 text-sm text-muted">اعتمد آراء العملاء قبل ظهورها، وخصّص كارت الصفحة. (الفروع من تبويب «الفروع»)</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-text">اعتماد النشر قبل الظهور</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{requireApproval ? 'مفعّل: أي رأي جديد ينتظر اعتماد الأدمن قبل ظهوره.' : 'مغلق: الآراء الجديدة تُنشر مباشرة بعد إرسالها.'}</p>
          </div>
          <Toggle checked={requireApproval} onChange={changeApprovalMode} busy={savingApproval} label="اعتماد النشر قبل الظهور" />
        </div>
      </section>

      {/* المراجعة */}
      <section className="space-y-3">
        <p className="text-sm font-black text-text">🕒 قيد المراجعة ({pending.length})</p>
        {loadingR ? (
          <div className="h-20 animate-pulse rounded-2xl bg-surface" />
        ) : pending.length === 0 ? (
          <p className="text-xs text-muted">مفيش آراء منتظرة الاعتماد.</p>
        ) : pending.map((r) => (
          <ReviewRow key={r.id} r={r} onToggle={toggle} onRemove={remove}
                     onRemoveCustomer={removeCustomer} busyCustomer={busyCustomer} />
        ))}

        <p className="mt-4 text-sm font-black text-text">✅ منشورة ({approved.length})</p>
        {approved.map((r) => (
          <ReviewRow key={r.id} r={r} onToggle={toggle} onRemove={remove}
                     onRemoveCustomer={removeCustomer} busyCustomer={busyCustomer} />
        ))}
      </section>

      {/* كارت الصفحة */}
      <section className="border-t border-border pt-6">
        <HeroEditor
          settingKey="reviews_hero"
          uploadKey="reviews-hero"
          heading="كارت صفحة التقييمات"
          description="خلفية ونص الكارت العلوي في صفحة الآراء."
          defaultTitle="آراء وتقييمات عملائنا"
        />
      </section>
    </div>
  );
}

function ReviewRow({ r, onToggle, onRemove, onRemoveCustomer, busyCustomer }) {
  // زرار حذف العميل بيظهر بس لو التقييم مربوط بحساب فيسبوك فعلاً.
  const linked = Boolean(r.customer_id);
  const busy = linked && busyCustomer === r.customer_id;
  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">{r.avatar_url ? <img src={r.avatar_url} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full object-cover" /> : null}<span className="truncate text-[11px] font-bold text-accent">{r.branch || 'بدون فرع'}{r.customer_name ? ` · ${r.customer_name}` : ''} · {'★'.repeat(r.rating || 5)}</span></div>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => onToggle(r)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                    r.approved ? 'border-[var(--mtc-success)]/40 bg-[var(--mtc-success)]/12 text-[var(--mtc-success)]' : 'border-accent-line bg-accent-soft text-accent'
                  }`}>
            {r.approved ? '✅ منشور — إخفاء' : 'اعتماد ونشر'}
          </button>
          <button type="button" onClick={() => onRemove(r)} title="حذف الرأي ده بس"
                  className="rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger">🗑️</button>
          {linked && (
            <button type="button" onClick={() => onRemoveCustomer(r)} disabled={busy}
                    title="حذف العميل وكل تقييماته وحساب دخوله"
                    className="rounded-lg border border-danger/50 bg-danger/20 px-2.5 py-1 text-[11px] font-black text-danger disabled:opacity-50">
              {busy ? '…' : '🗑️ العميل'}
            </button>
          )}
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-text">{r.body}</p>
    </div>
  );
}
