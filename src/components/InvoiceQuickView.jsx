import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { printSalesInvoice } from '../lib/printSettings';
import { getBranchProfile } from '../lib/branchProfiles';
const money = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DEFAULT_WARRANTY = `شروط الضمان العامة: الضمان يسري وفق مدة الضمان المسجلة للصنف وبشرط سلامة الجهاز من سوء الاستخدام أو الكسر أو السوائل أو العبث أو الإصلاح خارج الجهة المعتمدة. يلزم الاحتفاظ بفاتورة الشراء وبيانات السيريال/IMEI للاستفادة من الضمان. الملحقات الخارجية تخضع لشروط ضمانها الخاصة.`;
const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export default function InvoiceQuickView({ type = 'sales', invoiceId, onClose }) {
  const sales = type === 'sales';
  const [row, setRow] = useState(null),
    [msg, setMsg] = useState(''),
    [footer, setFooter] = useState(DEFAULT_WARRANTY),
    [branchProfile, setBranchProfile] = useState({});
  useEffect(() => {
    if (!invoiceId) return;
    (async () => {
      const table = sales ? 'sales_invoices' : 'purchase_invoices',
        items = sales ? 'sales_invoice_items' : 'purchase_invoice_items',
        fk = 'invoice_id';
      const { data, error } = await supabase.from(table).select('*').eq('id', invoiceId).single();
      if (error) return setMsg(error.message);
      const q = await supabase
        .from(items)
        .select('*,products(id,name,sku,serial_tracked)')
        .eq(fk, invoiceId);
      if (q.error) return setMsg(q.error.message);
      setRow({ ...data, items: q.data || [] });
      setBranchProfile(await getBranchProfile(data.branch).catch(() => ({})));
      if (sales) {
        const s = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'sales_invoice_footer')
          .maybeSingle();
        const v = s.data?.value;
        if (typeof v === 'string' && v.trim()) setFooter(v.trim());
        else if (v?.text) setFooter(String(v.text));
      }
    })();
  }, [invoiceId, sales]);
  const printInvoice = () => {
    if (!row) return;
    const serialHead = sales ? '<th>السيريال / IMEI</th>' : '';
    const lines = row.items
      .map(
        (x) =>
          `<tr><td>${esc(x.products?.sku || '')} · ${esc(x.products?.name || '')}</td><td>${esc(x.quantity)}</td><td>${money(x.unit_price ?? x.unit_cost ?? x.purchase_price)}</td><td>${money(x.discount)}</td><td>${money(x.line_total ?? Number(x.quantity || 0) * Number(x.unit_price ?? x.unit_cost ?? 0) - Number(x.discount || 0))}</td>${sales ? `<td>${esc((x.serial_numbers || []).join(' / ') || '—')}</td>` : ''}</tr>`,
      )
      .join('');
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) return;
    w.document.write(
      `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${esc(row.invoice_number)}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{margin:0 0 6px}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.box{border:1px solid #bbb;border-radius:8px;padding:10px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #bbb;padding:8px;text-align:right}th{background:#f2f2f2}.totals{margin-top:18px;border:2px solid #222;padding:12px}.footer{margin-top:28px;padding-top:14px;border-top:2px solid #222;font-size:12px;line-height:1.8}.no-print{margin-bottom:16px}@media print{.no-print{display:none}}</style></head><body><button class="no-print" onclick="window.print()">طباعة</button><h1>${esc(row.branch || '—')}</h1><b>${sales ? 'فاتورة مبيعات' : 'فاتورة مشتريات'} — ${esc(row.invoice_number)}</b><div class="meta"><div class="box">التاريخ<br><b>${esc(row.invoice_date)}</b></div><div class="box">${sales ? 'العميل' : 'المورد'}<br><b>${esc(sales ? row.customer_name || 'عميل نقدي' : row.supplier_name || row.supplier_business_name || '—')}</b></div><div class="box">الفرع<br><b>${esc(row.branch || '—')}</b></div></div><table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الإجمالي</th>${serialHead}</tr></thead><tbody>${lines}</tbody></table><div class="totals"><div>الإجمالي قبل الخصم: <b>${money(row.subtotal)}</b></div><div>الخصم: <b>${money(row.discount)}</b></div><div>صافي الفاتورة: <b>${money(row.total)}</b></div></div>${sales ? `<div class="footer"><b>شروط الضمان</b><br>${esc(footer)}</div>` : ''}</body></html>`,
    );
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 250);
  };
  return (
    <div className="fixed inset-0 z-[160] overflow-y-auto bg-black/80 p-3" onClick={onClose}>
      <div
        className="mx-auto my-6 max-w-4xl rounded-3xl border border-accent-line bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            {branchProfile.logo_url && (
              <img
                src={branchProfile.logo_url}
                alt={`لوجو ${row?.branch || ''}`}
                className="mb-2 h-14 max-w-40 object-contain"
              />
            )}
            <div className="text-xs text-muted">{sales ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}</div>
            <h3 className="text-xl font-black text-accent">
              {row?.invoice_number || 'جارٍ التحميل…'}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              disabled={!row}
              onClick={printInvoice}
              className="rounded-xl border border-accent-line px-3 py-2 text-xs font-black text-accent disabled:opacity-40"
            >
              🖨️ طباعة
            </button>
            {sales && (
              <button
                disabled={!row}
                onClick={() => printSalesInvoice(row, { paper: 'thermal' })}
                className="rounded-xl border border-accent-line px-3 py-2 text-xs font-black text-accent disabled:opacity-40"
              >
                🧾 حراري
              </button>
            )}
            <button onClick={onClose} className="text-xl">
              ✕
            </button>
          </div>
        </div>
        {msg && <p className="mt-4 font-bold text-danger">{msg}</p>}
        {row && (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                ['التاريخ', row.invoice_date],
                [
                  sales ? 'العميل' : 'المورد',
                  sales
                    ? row.customer_name || 'عميل نقدي'
                    : row.supplier_name || row.supplier_business_name || '—',
                ],
                ['الفرع', row.branch],
                ['الدفع', row.payment_type === 'credit' ? 'آجل' : 'نقدي'],
                ['الإجمالي', money(row.total)],
                ['الحالة', row.status],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-border p-3">
                  <div className="text-xs text-muted">{k}</div>
                  <b>{v || '—'}</b>
                </div>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-accent-line bg-surface/40 p-2">
              <table className="w-full min-w-[700px] text-right text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="p-2">الصنف</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الخصم</th>
                    <th>الإجمالي</th>
                    {sales && <th>السيريال / IMEI</th>}
                  </tr>
                </thead>
                <tbody>
                  {row.items.map((x) => (
                    <tr key={x.id} className="border-t border-border">
                      <td className="p-2">
                        {x.products?.sku} · {x.products?.name}
                      </td>
                      <td>{x.quantity}</td>
                      <td>{money(x.unit_price ?? x.unit_cost ?? x.purchase_price)}</td>
                      <td>{money(x.discount)}</td>
                      <td className="font-black">{money(x.line_total)}</td>
                      {sales && (
                        <td className="max-w-[260px] break-words">
                          {(x.serial_numbers || []).join(' / ') || '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-2xl border-2 border-accent-line bg-accent-soft p-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-muted">قبل الخصم</span>
                  <b className="block">{money(row.subtotal)}</b>
                </div>
                <div>
                  <span className="text-xs text-muted">الخصم</span>
                  <b className="block">{money(row.discount)}</b>
                </div>
                <div>
                  <span className="text-xs text-muted">الصافي</span>
                  <b className="block text-lg text-accent">{money(row.total)}</b>
                </div>
              </div>
            </div>
            {sales && (
              <div className="mt-4 rounded-xl border border-border p-3 text-xs leading-6 text-muted">
                <b className="text-text">شروط الضمان: </b>
                {footer}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
