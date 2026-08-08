import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { publicMediaUrl } from '../lib/productMedia';

const money = (value) =>
  Number(value || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function PublicInvoice() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .rpc('get_public_sales_invoice', { p_token: token })
      .then(({ data: result, error: requestError }) => {
        if (requestError || !result) setError('الرابط غير صالح أو لم تعد الفاتورة متاحة.');
        else setData(result);
      });
  }, [token]);

  if (error)
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-bg p-4">
        <div className="rounded-2xl border border-danger/40 bg-card p-8 font-bold text-danger">
          {error}
        </div>
      </main>
    );
  if (!data)
    return (
      <main dir="rtl" className="grid min-h-screen place-items-center bg-bg text-muted">
        جارٍ تحميل الفاتورة…
      </main>
    );
  const invoice = data.invoice || {};
  return (
    <main dir="rtl" className="min-h-screen bg-bg p-4 text-text">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <header className="bg-accent-soft p-6 text-center">
          <div className="text-2xl font-black text-accent">iShop</div>
          <h1 className="mt-2 text-xl font-black">فاتورة مبيعات {invoice.invoice_number}</h1>
          <p className="mt-1 text-sm text-muted">
            {invoice.branch} · {invoice.invoice_date}
          </p>
        </header>
        <section className="grid gap-2 p-5 sm:grid-cols-3">
          {[
            ['العميل', invoice.customer_name || 'عميل نقدي'],
            ['طريقة الدفع', invoice.payment_type === 'credit' ? 'آجل' : 'نقدي'],
            ['الإجمالي', money(invoice.total)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border p-3">
              <span className="block text-xs text-muted">{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </section>
        <section className="space-y-3 p-5 pt-0">
          {(data.items || []).map((item, index) => {
            const image = item.primary_image || item.images?.[0];
            return (
              <div
                key={`${item.sku}-${index}`}
                className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border p-3"
              >
                {image ? (
                  <img
                    src={publicMediaUrl('product-images', image)}
                    alt={item.name}
                    className="size-16 rounded-xl object-contain"
                  />
                ) : (
                  <div className="grid size-16 place-items-center rounded-xl bg-surface text-2xl">
                    📦
                  </div>
                )}
                <div className="min-w-0">
                  <b className="block">{item.name}</b>
                  <span className="text-xs text-muted">
                    {item.sku || '—'} · {item.quantity} × {money(item.unit_price)}
                  </span>
                </div>
                <b>{money(item.line_total)}</b>
              </div>
            );
          })}
        </section>
        <footer className="border-t border-border p-5">
          <div className="flex justify-between">
            <span>الإجمالي قبل الخصم</span>
            <b>{money(invoice.subtotal)}</b>
          </div>
          <div className="mt-2 flex justify-between">
            <span>الخصم</span>
            <b>{money(invoice.discount)}</b>
          </div>
          <div className="mt-4 flex justify-between text-xl font-black text-accent">
            <span>الإجمالي النهائي</span>
            <b>{money(invoice.total)}</b>
          </div>
        </footer>
      </article>
    </main>
  );
}
