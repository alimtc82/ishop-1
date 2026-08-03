import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../context/PermissionContext';
import SortableList, { DragHandle } from './ui/SortableList';
import { normProductSearch } from '../lib/productSearch';

const I = 'rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-accent';
const TABS = [
  ['sections', 'أقسام العرض'],
  ['categories', 'ترتيب الأقسام'],
  ['products', 'ترتيب المنتجات'],
  ['featured', 'المنتجات المميزة'],
];

export default function StorefrontLayoutAdmin() {
  const { can } = usePermissions();
  const [tab, setTab] = useState('sections');
  const [layout, setLayout] = useState({ only_in_stock_categories: true, sections: [] });
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState(new Set());
  const [catFilter, setCatFilter] = useState('');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [s, c, p, sv] = await Promise.all([
      supabase.from('site_settings').select('value').eq('key', 'storefront_layout').maybeSingle(),
      supabase.from('product_categories').select('id,name,is_active,sort_order').eq('is_active', true).order('sort_order').order('name'),
      supabase.from('products').select('id,name,sku,category_id,sort_order,is_featured,featured_order,is_active').eq('is_active', true).order('sort_order').order('name'),
      supabase.from('storefront_positive_stock').select('product_id'),
    ]);
    if (s.data?.value) setLayout(s.data.value);
    setCats(c.data || []);
    setProducts(p.data || []);
    setStock(new Set((sv.data || []).map(x => String(x.product_id))));
  };
  useEffect(() => { load(); }, []);

  const save = async (fn, okMsg) => {
    if (!can('can_settings_menu')) return setMsg('ليس لديك صلاحية تعديل إعدادات المتجر.');
    setBusy(true); setMsg('');
    try { await fn(); setMsg(okMsg); } catch (e) { setMsg('❌ ' + e.message); } finally { setBusy(false); }
  };

  const saveLayout = next => {
    setLayout(next);
    return save(async () => {
      const { error } = await supabase.from('site_settings').upsert({ key: 'storefront_layout', value: next }, { onConflict: 'key' });
      if (error) throw error;
    }, '✅ تم حفظ إعدادات العرض.');
  };

  const saveOrder = (table, rows, field = 'sort_order') =>
    save(async () => {
      for (let i = 0; i < rows.length; i++) {
        const { error } = await supabase.from(table).update({ [field]: i }).eq('id', rows[i].id);
        if (error) throw error;
      }
    }, '✅ تم حفظ الترتيب.');

  // ===== المنتجات داخل قسم =====
  const catProducts = useMemo(
    () => products.filter(p => String(p.category_id) === String(catFilter)).sort((a, b) => a.sort_order - b.sort_order),
    [products, catFilter],
  );
  const featured = useMemo(
    () => products.filter(p => p.is_featured).sort((a, b) => a.featured_order - b.featured_order),
    [products],
  );
  const searchPool = useMemo(() => {
    const t = normProductSearch(q);
    if (!t) return [];
    return products.filter(p => !p.is_featured && [p.name, p.sku].some(v => normProductSearch(v).includes(t))).slice(0, 8);
  }, [products, q]);

  const toggleFeatured = (p, on) =>
    save(async () => {
      const { error } = await supabase.from('products')
        .update({ is_featured: on, featured_order: on ? featured.length : 0 }).eq('id', p.id);
      if (error) throw error;
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_featured: on, featured_order: on ? featured.length : 0 } : x));
      setQ('');
    }, on ? '✅ تمت الإضافة للمميزة.' : '✅ تمت الإزالة من المميزة.');

  const Row = ({ children }) => (
    <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-card p-3">{children}</div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border p-4">
        <h3 className="font-black">التحكم في عرض المتجر (اللاندينج)</h3>
        <p className="mt-1 text-xs leading-6 text-muted">تحكّم في أقسام الصفحة الرئيسية وترتيبها، وترتيب الأقسام والمنتجات، وتحديد المنتجات المميزة.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-xl px-4 py-2 text-sm font-black ${tab === k ? 'bg-accent text-on-accent' : 'border border-border text-muted'}`}>{l}</button>
          ))}
        </div>
        {msg && <p className="mt-3 text-sm font-bold text-accent">{msg}</p>}
      </div>

      {/* 1) أقسام العرض + الترتيب + إظهار الأقسام التي بها مخزون */}
      {tab === 'sections' && (
        <div className="rounded-2xl border border-border p-4">
          <label className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
            <div>
              <b className="block text-sm">إظهار الأقسام التي بها مخزون متاح فقط</b>
              <span className="text-xs text-muted">الأقسام الفارغة لن تظهر في المتجر.</span>
            </div>
            <input type="checkbox" className="size-5 accent-current" checked={!!layout.only_in_stock_categories}
              onChange={e => saveLayout({ ...layout, only_in_stock_categories: e.target.checked })} />
          </label>

          <p className="mb-2 text-xs font-black text-muted">اسحب لإعادة الترتيب — والمفتاح للإظهار/الإخفاء</p>
          <SortableList items={layout.sections || []} keyOf={s => s.id}
            onReorder={next => saveLayout({ ...layout, sections: next })}>
            {s => (
              <Row>
                <DragHandle />
                <b className="flex-1 text-sm">{s.label}</b>
                <input type="checkbox" className="size-5" checked={!!s.enabled}
                  onChange={e => saveLayout({
                    ...layout,
                    sections: layout.sections.map(x => x.id === s.id ? { ...x, enabled: e.target.checked } : x),
                  })} />
              </Row>
            )}
          </SortableList>
        </div>
      )}

      {/* 2) ترتيب الأقسام */}
      {tab === 'categories' && (
        <div className="rounded-2xl border border-border p-4">
          <p className="mb-2 text-xs font-black text-muted">اسحب لترتيب ظهور الأقسام في المتجر</p>
          <SortableList items={cats} keyOf={c => c.id}
            onReorder={next => { setCats(next); saveOrder('product_categories', next); }}>
            {(c, i) => (
              <Row>
                <DragHandle />
                <span className="w-6 text-xs font-black text-accent">{i + 1}</span>
                <b className="flex-1 text-sm">{c.name}</b>
                <span className="text-[10px] text-muted">
                  {products.filter(p => String(p.category_id) === String(c.id) && stock.has(String(p.id))).length} صنف متاح
                </span>
              </Row>
            )}
          </SortableList>
        </div>
      )}

      {/* 3) ترتيب المنتجات داخل قسم */}
      {tab === 'products' && (
        <div className="rounded-2xl border border-border p-4">
          <select className={`${I} w-full`} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">اختر القسم لترتيب منتجاته</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {catFilter && (
            <>
              <p className="my-3 text-xs font-black text-muted">اسحب لترتيب ظهور المنتجات داخل القسم</p>
              <SortableList items={catProducts} keyOf={p => p.id}
                onReorder={next => {
                  const ids = new Map(next.map((p, i) => [p.id, i]));
                  setProducts(prev => prev.map(p => ids.has(p.id) ? { ...p, sort_order: ids.get(p.id) } : p));
                  saveOrder('products', next);
                }}>
                {(p, i) => (
                  <Row>
                    <DragHandle />
                    <span className="w-6 text-xs font-black text-accent">{i + 1}</span>
                    <b className="flex-1 text-sm">{p.name}</b>
                    {!stock.has(String(p.id)) && <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-danger">لا يوجد مخزون</span>}
                  </Row>
                )}
              </SortableList>
              {!catProducts.length && <p className="text-sm text-muted">لا توجد منتجات في هذا القسم.</p>}
            </>
          )}
        </div>
      )}

      {/* 4) المنتجات المميزة */}
      {tab === 'featured' && (
        <div className="rounded-2xl border border-border p-4">
          <p className="mb-2 text-xs leading-6 text-muted">المنتجات المميزة هي التي تظهر في قسم «المنتجات المميزة» بالصفحة الرئيسية. ابحث لإضافة منتج، واسحب لإعادة الترتيب.</p>
          <div className="relative">
            <input className={`${I} w-full`} value={q} placeholder="ابحث بالاسم أو الكود لإضافته للمميزة"
              onChange={e => setQ(e.target.value)} autoComplete="off" />
            {!!searchPool.length && (
              <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card shadow-2xl">
                {searchPool.map(p => (
                  <button key={p.id} onClick={() => toggleFeatured(p, true)}
                    className="block w-full border-b border-border px-3 py-2 text-right text-sm last:border-0 hover:bg-surface">
                    <b className="block">{p.name}</b>
                    <span className="text-[11px] text-muted">{p.sku || 'بدون كود'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <SortableList items={featured} keyOf={p => p.id}
              onReorder={next => {
                const ids = new Map(next.map((p, i) => [p.id, i]));
                setProducts(prev => prev.map(p => ids.has(p.id) ? { ...p, featured_order: ids.get(p.id) } : p));
                saveOrder('products', next, 'featured_order');
              }}>
              {(p, i) => (
                <Row>
                  <DragHandle />
                  <span className="w-6 text-xs font-black text-accent">{i + 1}</span>
                  <b className="flex-1 text-sm">{p.name}</b>
                  <button onClick={() => toggleFeatured(p, false)} className="text-xs font-black text-danger">إزالة</button>
                </Row>
              )}
            </SortableList>
            {!featured.length && <p className="text-sm text-muted">لم يتم تمييز أي منتج بعد.</p>}
          </div>
        </div>
      )}

      {busy && <p className="text-xs text-muted">جارٍ الحفظ…</p>}
    </div>
  );
}
