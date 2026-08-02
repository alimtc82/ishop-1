import { useEffect, useState } from 'react';
import { usePermissions } from '../context/PermissionContext';
import { getShiftReport, closeShift } from '../lib/shiftService';

// ══════════════════════════════════════════════════════════════
//  ShiftReport — تقرير الوردية الكامل (V13.9.2)
//
//  يعرض:
//    - ملخص الوردية (فرع، خزينة، وقت الفتح، رصيد أول المدة)
//    - إيرادات: مبيعات نقدية + مرتجعات مشتريات
//    - مصروفات: مشتريات نقدية + مرتجعات مبيعات + مصروفات
//    - الرصيد المتوقع عند الإغلاق
//    - زر إغلاق الوردية مع إدخال الرصيد الفعلي
// ══════════════════════════════════════════════════════════════

const money = (n) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Section = ({ title, color = 'accent', children }) => (
  <div className={`rounded-2xl border bg-card overflow-hidden ${color === 'success' ? 'border-[var(--mtc-success)]/30' : color === 'danger' ? 'border-danger/30' : 'border-border'}`}>
    <div className={`px-4 py-3 text-sm font-black ${color === 'success' ? 'bg-[var(--mtc-success)]/10 text-[var(--mtc-success)]' : color === 'danger' ? 'bg-danger/10 text-danger' : 'bg-surface text-accent'}`}>
      {title}
    </div>
    <div className="divide-y divide-border">{children}</div>
  </div>
);

const Row = ({ label, value, bold = false, sub = '' }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
    <div>
      <span className={bold ? 'font-black text-text' : 'text-muted'}>{label}</span>
      {sub && <span className="block text-[11px] text-muted">{sub}</span>}
    </div>
    <span className={`num ${bold ? 'text-base font-black text-accent' : 'font-bold text-text'}`}>{value}</span>
  </div>
);

export default function ShiftReport({ shift, onClose, onShiftClosed }) {
  const { can } = usePermissions();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [actualBalance, setActualBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [msg, setMsg] = useState('');

  const canClose = can('can_pos_shift_close');
  const isOpen = shift?.status === 'open';

  useEffect(() => {
    if (!shift) return;
    setLoading(true);
    getShiftReport(shift)
      .then(setReport)
      .catch((e) => setMsg('❌ ' + e.message))
      .finally(() => setLoading(false));
  }, [shift]);

  async function handleClose(e) {
    e.preventDefault();
    setMsg('');
    if (actualBalance === '' || isNaN(Number(actualBalance))) {
      return setMsg('أدخل الرصيد الفعلي عند الإغلاق');
    }
    setClosing(true);
    try {
      await closeShift(shift.id, Number(actualBalance), closeNotes);
      onShiftClosed?.();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'فشل إغلاق الوردية'));
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="text-4xl">⏳</div>
          <p className="mt-3 text-sm font-bold text-muted">جارٍ تحميل تقرير الوردية…</p>
        </div>
      </div>
    );
  }

  const s = report?.summary;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/80 p-3" dir="rtl">
      <div className="mx-auto my-4 max-w-2xl space-y-4">

        {/* الهيدر */}
        <div className="flex items-center justify-between rounded-2xl border border-accent-line bg-card px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-accent">📊 تقرير الوردية</h2>
            <p className="text-xs text-muted">{shift?.shift_number}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()}
              className="rounded-xl border border-accent-line px-3 py-2 text-xs font-black text-accent">
              🖨️ طباعة
            </button>
            <button type="button" onClick={onClose}
              className="rounded-xl border border-border px-3 py-2 text-xs font-black text-muted">
              ✕ إغلاق
            </button>
          </div>
        </div>

        {/* بيانات الوردية */}
        <Section title="📋 بيانات الوردية">
          <Row label="رقم الوردية" value={shift?.shift_number} bold />
          <Row label="المستخدم" value={shift?.user_name} />
          <Row label="الفرع" value={shift?.branch} />
          <Row label="الخزينة" value={shift?.treasury_name} />
          <Row label="وقت الفتح" value={new Date(shift?.opened_at).toLocaleString('ar-EG')} />
          {shift?.closed_at && <Row label="وقت الإغلاق" value={new Date(shift.closed_at).toLocaleString('ar-EG')} />}
          <Row label="الحالة" value={isOpen ? '🟢 مفتوحة' : '🔴 مغلقة'} bold />
          <Row label="رصيد أول المدة" value={money(shift?.opening_balance)} bold />
        </Section>

        {/* الإيرادات */}
        <Section title={`💚 الإيرادات — الإجمالي: ${money(s?.totalRevenue)}`} color="success">
          <Row label="مبيعات نقدية"
            value={money(s?.cashSales)}
            sub={`${report?.sales?.filter(r => r.payment_type === 'cash').length || 0} فاتورة`} />
          {(s?.totalSales - s?.cashSales) > 0 && (
            <Row label="مبيعات آجلة (غير نقدية)"
              value={money(s?.totalSales - s?.cashSales)}
              sub="لا تؤثر على رصيد الخزينة" />
          )}
          <Row label="مرتجعات مشتريات (استرداد)"
            value={money(s?.cashPurchRet)}
            sub={`${report?.purchRet?.length || 0} مرتجع`} />
          <Row label="إجمالي الإيرادات النقدية" value={money(s?.totalRevenue)} bold />
        </Section>

        {/* المصروفات */}
        <Section title={`❤️ المصروفات — الإجمالي: ${money(s?.totalExpenditure)}`} color="danger">
          <Row label="مشتريات نقدية"
            value={money(s?.cashPurchases)}
            sub={`${report?.purchases?.filter(r => r.payment_type === 'cash').length || 0} فاتورة`} />
          <Row label="مرتجعات مبيعات (مردود للعميل)"
            value={money(s?.totalSalesRet)}
            sub={`${report?.salesRet?.length || 0} مرتجع`} />
          <Row label="مصروفات"
            value={money(s?.totalExpenses)}
            sub={`${report?.expenses?.length || 0} مصروف`} />
          <Row label="إجمالي المصروفات النقدية" value={money(s?.totalExpenditure)} bold />
        </Section>

        {/* ملخص الرصيد */}
        <div className="rounded-2xl border-2 border-accent-line bg-accent-soft p-5">
          <h3 className="font-black text-accent">💰 ملخص الرصيد</h3>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            {[
              ['رصيد أول المدة', money(s?.openingBalance), ''],
              ['+ إيرادات', money(s?.totalRevenue), 'text-[var(--mtc-success)]'],
              ['− مصروفات', money(s?.totalExpenditure), 'text-danger'],
            ].map(([k, v, cls]) => (
              <div key={k} className="rounded-xl border border-accent-line bg-card p-3">
                <span className="block text-[11px] text-muted">{k}</span>
                <b className={`block text-base ${cls}`}>{v}</b>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border-2 border-accent bg-card p-4 text-center">
            <span className="block text-xs text-muted">الرصيد المتوقع عند الإغلاق</span>
            <b className="block text-2xl font-black text-accent num">{money(s?.expectedBalance)}</b>
          </div>
          {shift?.closing_balance !== null && shift?.closing_balance !== undefined && (
            <div className="mt-2 rounded-xl border border-border bg-card p-3 text-center">
              <span className="block text-xs text-muted">الرصيد الفعلي عند الإغلاق</span>
              <b className="block text-lg font-black text-text num">{money(shift.closing_balance)}</b>
              {Math.abs(shift.closing_balance - s?.expectedBalance) > 0.01 && (
                <span className={`block text-xs font-bold mt-1 ${shift.closing_balance > s?.expectedBalance ? 'text-[var(--mtc-success)]' : 'text-danger'}`}>
                  فرق: {money(shift.closing_balance - s?.expectedBalance)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* تفاصيل المبيعات */}
        {report?.sales?.length > 0 && (
          <Section title={`🧾 فواتير المبيعات (${report.sales.length})`} color="success">
            {report.sales.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2 text-xs">
                <div>
                  <b className="text-accent">{r.invoice_number}</b>
                  <span className="mr-2 text-muted">{r.customer_name || 'نقدي'}</span>
                  <span className={`mr-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.payment_type === 'cash' ? 'bg-[var(--mtc-success)]/15 text-[var(--mtc-success)]' : 'bg-surface text-muted'}`}>
                    {r.payment_type === 'cash' ? 'نقدي' : 'آجل'}
                  </span>
                </div>
                <b className="num">{money(r.total)}</b>
              </div>
            ))}
          </Section>
        )}

        {/* تفاصيل المشتريات */}
        {report?.purchases?.length > 0 && (
          <Section title={`📦 فواتير المشتريات (${report.purchases.length})`} color="danger">
            {report.purchases.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2 text-xs">
                <div>
                  <b className="text-accent">{r.invoice_number}</b>
                  <span className="mr-2 text-muted">{r.supplier_name || '—'}</span>
                  <span className={`mr-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.payment_type === 'cash' ? 'bg-danger/15 text-danger' : 'bg-surface text-muted'}`}>
                    {r.payment_type === 'cash' ? 'نقدي' : 'آجل'}
                  </span>
                </div>
                <b className="num">{money(r.total)}</b>
              </div>
            ))}
          </Section>
        )}

        {/* تفاصيل المصروفات */}
        {report?.expenses?.length > 0 && (
          <Section title={`💸 المصروفات (${report.expenses.length})`} color="danger">
            {report.expenses.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2 text-xs">
                <div>
                  <b className="text-accent">{r.expense_number}</b>
                  <span className="mr-2 text-muted">{r.expense_categories?.name || r.payee_name || '—'}</span>
                </div>
                <b className="num text-danger">{money(r.amount)}</b>
              </div>
            ))}
          </Section>
        )}

        {/* مرتجعات المبيعات */}
        {report?.salesRet?.length > 0 && (
          <Section title={`↩️ مرتجعات المبيعات (${report.salesRet.length})`} color="danger">
            {report.salesRet.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2 text-xs">
                <b className="text-accent">{r.return_number}</b>
                <b className="num text-danger">{money(r.total)}</b>
              </div>
            ))}
          </Section>
        )}

        {/* مرتجعات المشتريات */}
        {report?.purchRet?.length > 0 && (
          <Section title={`↩️ مرتجعات المشتريات (${report.purchRet.length})`} color="success">
            {report.purchRet.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2 text-xs">
                <b className="text-accent">{r.return_number}</b>
                <b className="num text-[var(--mtc-success)]">{money(r.total)}</b>
              </div>
            ))}
          </Section>
        )}

        {/* إغلاق الوردية */}
        {isOpen && canClose && (
          <div className="rounded-2xl border-2 border-danger/30 bg-card p-5">
            {!showCloseForm ? (
              <button type="button" onClick={() => setShowCloseForm(true)}
                className="w-full rounded-xl bg-danger py-3 text-sm font-black text-white">
                🔒 إغلاق الوردية
              </button>
            ) : (
              <form onSubmit={handleClose} className="space-y-3">
                <h3 className="font-black text-danger">🔒 تأكيد إغلاق الوردية</h3>
                <p className="text-xs text-muted">الرصيد المتوقع: <b className="text-text num">{money(s?.expectedBalance)}</b></p>
                <div>
                  <label className="mb-1 block text-xs font-black text-muted">الرصيد الفعلي في الخزينة *</label>
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={actualBalance} onChange={(e) => setActualBalance(e.target.value)}
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-3 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-black text-muted">ملاحظات (اختياري)</label>
                  <textarea rows={2} value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="أي ملاحظات عند الإغلاق..."
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none focus:border-accent" />
                </div>
                {msg && <p className="text-xs font-bold text-danger">{msg}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setShowCloseForm(false)}
                    className="rounded-xl border border-border py-2.5 text-sm font-black">
                    إلغاء
                  </button>
                  <button type="submit" disabled={closing}
                    className="rounded-xl bg-danger py-2.5 text-sm font-black text-white disabled:opacity-60">
                    {closing ? 'جارٍ الإغلاق…' : '✅ تأكيد الإغلاق'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {msg && !showCloseForm && (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs font-bold text-danger">{msg}</p>
        )}
      </div>
    </div>
  );
}
