import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../context/PermissionContext';
import { publicMediaUrl } from '../lib/productMedia';
import { getBranchProfile } from '../lib/branchProfiles';
const money = (v) => Number(v || 0).toLocaleString('ar-EG');
const labels = {
  sales_invoice: 'فاتورة مبيعات',
  purchase_invoice: 'فاتورة مشتريات',
  sales_return: 'مرتجع مبيعات',
  purchase_return: 'مرتجع مشتريات',
  customer_collection: 'سند تحصيل',
  supplier_payment: 'سند سداد',
  expense: 'مصروف',
  income: 'إيراد',
  financial_movement: 'سند مالي',
};
const configs = {
  sales_invoice: {
    table: 'sales_invoices',
    number: 'invoice_number',
    date: 'invoice_date',
    select: '*,sales_invoice_items(*,products(name,sku,images,primary_image)),treasuries(name)',
    items: 'sales_invoice_items',
    party: (r) => r.customer_name || 'عميل نقدي',
  },
  purchase_invoice: {
    table: 'purchase_invoices',
    number: 'invoice_number',
    date: 'invoice_date',
    select: '*,purchase_invoice_items(*,products(name,sku)),suppliers(name),treasuries(name)',
    items: 'purchase_invoice_items',
    party: (r) => r.suppliers?.name || 'مورد',
  },
  sales_return: {
    table: 'sales_returns',
    number: 'return_number',
    date: 'return_date',
    select: '*',
    party: (r) => r.customer_name || 'عميل',
  },
  purchase_return: {
    table: 'purchase_returns',
    number: 'return_number',
    date: 'return_date',
    select: '*,suppliers(name)',
    party: (r) => r.suppliers?.name || 'مورد',
  },
  expense: {
    table: 'expenses',
    number: 'expense_number',
    date: 'expense_date',
    select: '*,expense_categories(name),treasuries(name)',
    party: (r) => r.payee_name || r.expense_categories?.name || 'مصروف',
  },
};
export default function ERPDocumentViewer({ type, id, number, onClose }) {
  const { can } = usePermissions();
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [branchProfile, setBranchProfile] = useState({});
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        let cfg = configs[type],
          r;
        if (cfg) {
          let q = supabase.from(cfg.table).select(cfg.select);
          q = id ? q.eq('id', id) : q.eq(cfg.number, number);
          let x = await q.maybeSingle();
          if (x.error) throw x.error;
          r = x.data;
        } else {
          let q = supabase.from('financial_movements').select('*,treasuries(name)');
          q = id ? q.eq('id', id) : q.eq('movement_number', number);
          let x = await q.maybeSingle();
          if (x.error) throw x.error;
          r = x.data;
        }
        setData(r);
        setBranchProfile(await getBranchProfile(r?.branch).catch(() => ({})));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [type, id, number]);
  const cfg = configs[type];
  const title = labels[type] || labels[data?.reference_type] || 'مستند';
  const num = data?.[cfg?.number || 'movement_number'] || number || '—';
  const date = data?.[cfg?.date || 'movement_date'] || data?.created_at?.slice?.(0, 10) || '—';
  const party = (cfg?.party?.(data || {}) ?? data?.party_name) || '—';
  const amount = data?.total ?? data?.amount ?? 0;
  const items = cfg?.items ? data?.[cfg.items] || [] : [];
  const print = () => {
    if (!can('can_erp_document_print')) return;
    const el = document.getElementById('erp-document-print-area');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${title} ${num}</title><style>body{font-family:Arial;padding:28px;color:#111}.actions{display:none}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #bbb;padding:8px;text-align:right}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.box{border:1px solid #ccc;padding:10px;border-radius:8px}.muted{font-size:11px;color:#666}</style></head><body>${el.innerHTML}<script>window.onload=()=>window.print()<\/script></body></html>`,
    );
    w.document.close();
  };
  return (
    <div className="fixed inset-0 z-[190] overflow-y-auto bg-black/80 p-3" onClick={onClose}>
      <div
        className="mx-auto my-6 max-w-5xl rounded-3xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div>جارٍ تحميل المستند…</div>
        ) : error ? (
          <div className="text-danger">{error}</div>
        ) : !data ? (
          <div>المستند غير موجود.</div>
        ) : (
          <div id="erp-document-print-area">
            <div className="flex items-start justify-between gap-3">
              <div>
                {branchProfile.logo_url && (
                  <img
                    src={branchProfile.logo_url}
                    alt=""
                    className="mb-2 h-14 max-w-40 object-contain"
                  />
                )}
                <div className="text-xs text-muted">{title}</div>
                <h2 className="text-2xl font-black text-accent">{num}</h2>
                {branchProfile.show_address_on_documents && branchProfile.address && (
                  <div className="text-xs text-muted">{branchProfile.address}</div>
                )}
              </div>
              <div className="actions flex gap-2">
                {can('can_erp_document_print') && (
                  <button
                    onClick={print}
                    className="rounded-xl bg-accent px-5 py-2.5 font-black text-on-accent"
                  >
                    🖨️ طباعة المستند
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-xl border border-border px-4 py-2.5 font-black"
                >
                  ✕ إغلاق
                </button>
              </div>
            </div>
            <div className="grid mt-5 gap-2 sm:grid-cols-3">
              {[
                ['التاريخ', date],
                ['الطرف', party],
                ['الفرع', data.branch || '—'],
                ['الخزينة', data.treasuries?.name || '—'],
                ['الإجمالي / المبلغ', money(amount)],
                ['الحالة', data.status || '—'],
                [
                  'طريقة الدفع',
                  data.payment_type === 'credit'
                    ? 'آجل'
                    : data.payment_type === 'cash'
                      ? 'نقدي'
                      : '—',
                ],
                ['المرجع', data.reference_type || '—'],
                ['ملاحظات', data.notes || '—'],
              ].map(([k, v]) => (
                <div className="box rounded-xl border border-border p-3" key={k}>
                  <div className="muted text-xs text-muted">{k}</div>
                  <b>{v}</b>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[650px] text-sm">
                  <thead>
                    <tr>
                      <th>الصنف</th>
                      <th>الكمية</th>
                      <th>السعر</th>
                      <th>الخصم</th>
                      <th>الإجمالي</th>
                      <th>السيريال</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((x, i) => (
                      <tr key={x.id || i}>
                        <td>
                          <div className="flex items-center gap-2">
                            {(x.products?.primary_image || x.products?.images?.[0]) && (
                              <img
                                src={publicMediaUrl(
                                  'product-images',
                                  x.products.primary_image || x.products.images[0],
                                )}
                                alt=""
                                className="h-12 w-12 rounded-lg object-contain"
                              />
                            )}
                            <span>
                              {x.products?.sku ? `${x.products.sku} · ` : ''}
                              {x.products?.name || '—'}
                            </span>
                          </div>
                        </td>
                        <td>{x.quantity ?? '—'}</td>
                        <td>{money(x.unit_price ?? x.unit_cost)}</td>
                        <td>{money(x.discount)}</td>
                        <td>
                          {money(
                            x.line_total ??
                              Number(x.quantity || 0) * Number((x.unit_price ?? x.unit_cost) || 0) -
                                Number(x.discount || 0),
                          )}
                        </td>
                        <td>{(x.serial_numbers || []).join?.(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-5 text-xs text-muted">
              تفاصيل العملية الكاملة كما هي مسجلة بالنظام.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
