import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../context/PermissionContext';
import { auditERP } from '../lib/erpAudit';
import SortableList, { DragHandle } from './ui/SortableList';
import { normProductSearch } from '../lib/productSearch';
import { applyOffer, offerTimeLeft } from '../lib/offers';

const I = 'rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-accent';
const blank = { productId: '', priceGroupId: '', type: 'percent', value: '', starts: '', ends: '' };

export default function OffersAdmin() {
  const { can } = usePermissions();
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [prices, setPrices] = useState([]);
  const [f, setF] = useState(blank);
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [o, p, g, pr] = await Promise.all([
      supabase.from('product_offers').select('*').order('sort_order'),
      supabase.from('products').select('id,name,sku,sale_price,is_active').eq('is_active', true).order('name'),
      supabase.from('sale_price_groups').select('id,name,is_active').eq('is_active', true).order('name'),
      supabase.from('product_sale_prices').select('product_id,price_group_id,sale_price'),
    ]);
    setOffers(o.data || []); setProducts(p.data || []); setGroups(g.data || []); setPrices(pr.data || []);
  };
  useEffect(() => { load(); }, []);

  const productById = useMemo(() => new Map(products.map(p => [String(p.id), p])), [products]);
  const groupById = useMemo(() => new Map(groups.map(g => [String(g.id), g])), [groups]);

  /** سعر المنتج حسب السياسة (أو سعر البيع الافتراضي) */
  const basePrice = (productId, groupId) => {
    if (groupId) {
      const row = prices.find(x => String(x.product_id) === String(productId) && String(x.price_group_id) === String(groupId));
      if (row) return Number(row.sale_price || 0);
    }
    return Number(productById.get(String(productId))?.sale_price || 0);
  };

  const suggestions = useMemo(() => {
    const t = normProductSearch(q);
    if (!t) return [];
    return products.filter(p => [p.name, p.sku].some(v => normProductSearch(v).includes(t))).slice(0, 10);
  }, [products, q]);

  const selected = productById.get(String(f.productId));
  const preview = useMemo(() => {
    if (!selected || !(Number(f.value) > 0)) return null;
    return applyOffer(basePrice(f.productId, f.priceGroupId), { discount_type: f.type, discount_value: Number(f.value) });
  }, [selected, f, prices]);

  const submit = async () => {
    if (!can('can_erp_sales')) return setMsg('ليس لديك صلاحية إدارة المبيعات.');
    if (!f.productId) return setMsg('اختر الصنف.');
    if (!(Number(f.value) > 0)) return setMsg('قيمة الخصم غير صحيحة.');
    if (f.type === 'percent' && Number(f.value) >= 100) return setMsg('نسبة الخصم يجب أن تكون أقل من 100%.');
    if (f.ends && f.starts && new Date(f.ends) <= new Date(f.starts)) return setMsg('تاريخ الانتهاء يجب أن يكون بعد البداية.');
    setBusy(true); setMsg('');
    try {
      const payload = {
        product_id: Number(f.productId),
        price_group_id: f.priceGroupId ? Number(f.priceGroupId) : null,
        discount_type: f.type,
        discount_value: Number(f.value),
        starts_at: f.starts ? new Date(f.starts).toISOString() : new Date().toISOString(),
        ends_at: f.ends ? new Date(f.ends).toISOString() : null,
        is_active: true,
        sort_order: offers.length,
      };
      const { error } = await supabase.from('product_offers')
        .upsert(payload, { onConflict: 'product_id,price_group_id' });
      if (error) throw error;
      await auditERP('sales', 'offer_upsert', { entityType: 'product_offer', details: payload });
      setF(blank); setQ('');
      await load();
      setMsg('✅ تم حفظ العرض.');
    } catch (e) { setMsg('❌ ' + e.message); } finally { setBusy(false); }
  };

  const toggle = async (o, on) => {
    const { error } = await supabase.from('product_offers').update({ is_active: on }).eq('id', o.id);
    if (error) return setMsg('❌ ' + error.message);
    setOffers(prev => prev.map(x => x.id === o.id ? { ...x, is_active: on } : x));
  };
  const remove = async o => {
    if (!confirm('حذف هذا العرض نهائيًا؟')) return;
    const { error } = await supabase.from('product_offers').delete().eq('id', o.id);
    if (error) return setMsg('❌ ' + error.message);
    setOffers(prev => prev.filter(x => x.id !== o.id));
    setMsg('✅ تم حذف العرض.');
  };
  const saveOrder = async next => {
    setOffers(next);
    for (let i = 0; i < next.length; i++) await supabase.from('product_offers').update({ sort_order: i }).eq('id', next[i].id);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border p-4">
        <h3 className="font-black">العروض والخصومات</h3>
        <p className="mt-1 text-xs leading-6 text-muted">اختر الصنف والسياسة السعرية ونوع الخصم والفترة. يظهر السعر الأصلي مشطوبًا مع نسبة الخصم على كارت الصنف في المتجر.</p>

        <div className="relative mt-4">
          <label className="mb-1 block text-xs font-black text-muted">الصنف *</label>
          <input className={`${I} w-full`} value={q} placeholder="ابحث بالاسم أو الكود"
            onChange={e => { setQ(e.target.value); setF(v => ({ ...v, productId: '' })); setFocus(true); }}
            onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} autoComplete="off" />
          {selected && <span className="absolute left-2 top-8 text-[10px] font-black text-accent">✓ محدد</span>}
          {focus && !!suggestions.length && (
            <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card shadow-2xl">
              {suggestions.map(p => (
                <button key={p.id} onMouseDown={e => e.preventDefault()}
                  onClick={() => { setF(v => ({ ...v, productId: String(p.id) })); setQ(p.name); setFocus(false); }}
                  className="block w-full border-b border-border px-3 py-2 text-right text-sm last:border-0 hover:bg-surface">
                  <b className="block">{p.name}</b>
                  <span className="text-[11px] text-muted">{p.sku || 'بدون كود'} · {Number(p.sale_price || 0).toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <select className={I} value={f.priceGroupId} onChange={e => setF(v => ({ ...v, priceGroupId: e.target.value }))}>
            <option value="">كل السياسات السعرية</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select className={I} value={f.type} onChange={e => setF(v => ({ ...v, type: e.target.value }))}>
            <option value="percent">نسبة مئوية %</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
          <input className={I} type="number" min="0" step="0.01" placeholder={f.type === 'percent' ? 'نسبة الخصم %' : 'قيمة الخصم'}
            value={f.value} onChange={e => setF(v => ({ ...v, value: e.target.value }))} />
          <div />
          <label className="text-xs font-black text-muted">من<input className={`${I} mt-1 w-full`} type="datetime-local" value={f.starts} onChange={e => setF(v => ({ ...v, starts: e.target.value }))} /></label>
          <label className="text-xs font-black text-muted">إلى (اختياري)<input className={`${I} mt-1 w-full`} type="datetime-local" value={f.ends} onChange={e => setF(v => ({ ...v, ends: e.target.value }))} /></label>
        </div>

        {preview && (
          <div className="mt-3 rounded-xl border border-accent-line bg-accent-soft p-3 text-sm">
            <b>معاينة:</b> <span className="line-through text-muted">{preview.original.toLocaleString()}</span>
            {' → '}<b className="text-accent">{preview.final.toLocaleString()}</b>
            {preview.hasDiscount && <span className="ms-2 rounded-full bg-danger px-2 py-0.5 text-[11px] font-black text-white">-{preview.percent}%</span>}
          </div>
        )}

        <button disabled={busy} onClick={submit} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-black text-on-accent disabled:opacity-50">
          {busy ? 'جارٍ الحفظ…' : 'حفظ العرض'}
        </button>
        {msg && <p className="mt-3 text-sm font-bold text-accent">{msg}</p>}
      </div>

      <div className="rounded-2xl border border-border p-4">
        <h3 className="mb-1 font-black">العروض الحالية</h3>
        <p className="mb-3 text-xs text-muted">اسحب لترتيب ظهورها في قسم العروض بالمتجر.</p>
        <SortableList items={offers} keyOf={o => o.id} onReorder={saveOrder}>
          {(o, i) => {
            const p = productById.get(String(o.product_id));
            const base = basePrice(o.product_id, o.price_group_id);
            const r = applyOffer(base, o);
            const expired = o.ends_at && new Date(o.ends_at) <= new Date();
            return (
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
                <DragHandle />
                <span className="w-6 text-xs font-black text-accent">{i + 1}</span>
                <div className="min-w-40 flex-1">
                  <b className="block text-sm">{p?.name || `#${o.product_id}`}</b>
                  <span className="text-[11px] text-muted">
                    {o.price_group_id ? groupById.get(String(o.price_group_id))?.name || 'سياسة' : 'كل السياسات'}
                    {' · '}{o.discount_type === 'percent' ? `${o.discount_value}%` : `${Number(o.discount_value).toLocaleString()} خصم`}
                    {o.ends_at && ` · ${expired ? 'منتهي' : offerTimeLeft(o.ends_at)}`}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted line-through">{r.original.toLocaleString()}</span>{' '}
                  <b className="text-accent">{r.final.toLocaleString()}</b>
                  {r.hasDiscount && <span className="ms-1 rounded-full bg-danger px-2 py-0.5 text-[10px] font-black text-white">-{r.percent}%</span>}
                </div>
                <label className="flex items-center gap-1 text-[11px] font-black">
                  <input type="checkbox" className="size-4" checked={o.is_active} onChange={e => toggle(o, e.target.checked)} />فعّال
                </label>
                <button onClick={() => remove(o)} className="text-xs font-black text-danger">حذف</button>
              </div>
            );
          }}
        </SortableList>
        {!offers.length && <p className="text-sm text-muted">لا توجد عروض بعد.</p>}
      </div>
    </div>
  );
}
