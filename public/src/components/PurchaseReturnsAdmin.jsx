import { useEffect, useMemo, useState } from 'react';
import { useAllowedBranches } from '../hooks/useAllowedBranches';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../context/PermissionContext';
import ERPDocumentViewer from './ERPDocumentViewer';

const I = 'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text';

export default function PurchaseReturnsAdmin() {
  const { branches, loading: branchesLoading, canAccessBranch, canSeeAllBranches } = useAllowedBranches();
  const { can } = usePermissions();

  const [allInvoices, setAllInvoices] = useState([]);
  const [allTreasuries, setAllTreasuries] = useState([]);
  const [allReturns, setAllReturns] = useState([]);
  const [returnedMap, setReturnedMap] = useState({}); // { invoiceId: { productId: returnedQty } }
  const [invoice, setInvoice] = useState('');
  const [qty, setQty] = useState({});
  const [serials, setSerials] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [settlementType, setSettlementType] = useState('cash');
  const [treasury, setTreasury] = useState('');
  const [viewDoc, setViewDoc] = useState(null);

  const loadRecent = () =>
    supabase.from('purchase_returns').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setAllReturns(data || []));

  const loadInvoices = async () => {
    const { data: invs } = await supabase.from('purchase_invoices')
      .select('*,suppliers(name),purchase_invoice_items(*,products(name,sku,serial_tracked))')
      .eq('status', 'posted').order('created_at', { ascending: false });
    setAllInvoices(invs || []);
    const ids = (invs || []).map(i => i.id);
    const map = {};
    if (ids.length) {
      const { data: rets } = await supabase.from('purchase_returns')
        .select('purchase_invoice_id,status,purchase_return_items(product_id,quantity)')
        .eq('status', 'posted').in('purchase_invoice_id', ids);
      (rets || []).forEach(r => (r.purchase_return_items || []).forEach(it => {
        map[r.purchase_invoice_id] = map[r.purchase_invoice_id] || {};
        map[r.purchase_invoice_id][it.product_id] = (map[r.purchase_invoice_id][it.product_id] || 0) + Number(it.quantity || 0);
      }));
    }
    setReturnedMap(map);
  };

  useEffect(() => {
    supabase.from('treasuries').select('id,name,branch').eq('is_active', true).order('name')
      .then(({ data }) => setAllTreasuries(data || []));
    loadInvoices();
    loadRecent();
  }, []);

  const treasuries = useMemo(
    () => allTreasuries.filter(x => !x.branch || canAccessBranch(x.branch)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTreasuries, branches, canSeeAllBranches],
  );
  const returnRows = useMemo(
    () => allReturns.filter(x => !x.branch || canAccessBranch(x.branch)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allReturns, branches, canSeeAllBranches],
  );

  const remainingOf = (invx) => {
    const pool = { ...(returnedMap[invx.id] || {}) };
    const items = (invx.purchase_invoice_items || []).map(it => {
      const used = Math.min(pool[it.product_id] || 0, Number(it.quantity));
      pool[it.product_id] = (pool[it.product_id] || 0) - used;
      return { ...it, remaining: Number(it.quantity) - used };
    });
    return { items, totalRemaining: items.reduce((s, i) => s + i.remaining, 0) };
  };

  const invoices = useMemo(
    () => allInvoices
      .filter(x => !x.branch || canAccessBranch(x.branch))
      .filter(x => remainingOf(x).totalRemaining > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allInvoices, returnedMap, branches, canSeeAllBranches],
  );

  const inv = invoices.find(x => String(x.id) === invoice);
  const invItems = inv ? remainingOf(inv).items.filter(x => x.remaining > 0) : [];
  const selected = useMemo(
    () => invItems.filter(x => Number(qty[x.id] || 0) > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inv, qty, returnedMap],
  );
  const total = selected.reduce((s, x) => s + Number(qty[x.id]) * Number(x.unit_cost), 0);

  const post = async () => {
    if (!can('can_erp_purchase_return')) return setMsg('ليس لديك صلاحية ترحيل المستندات.');
    setBusy(true); setMsg('');
    try {
      if (!inv) throw Error('اختر فاتورة شراء.');
      if (settlementType === 'cash' && !treasury) throw Error('حدد الخزينة المستلمة من المورد.');
      if (!selected.length) throw Error('حدد كمية مرتجعة.');
      for (const x of selected) {
        if (Number(qty[x.id]) > x.remaining) {
          throw Error(`الكمية المرتجعة للصنف ${x.products?.name || ''} تتجاوز المتاح (${x.remaining}).`);
        }
      }
      const lines = selected.map(x => {
        const q = Number(qty[x.id]);
        const ss = x.products?.serial_tracked
          ? (serials[x.id] || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
          : [];
        return { item_id: x.id, quantity: q, serial_numbers: ss };
      });
      const { data, error } = await supabase.rpc('post_purchase_return_tx', {
        p_invoice_id: inv.id,
        p_items: lines,
        p_settlement_type: settlementType,
        p_treasury_id: settlementType === 'cash' ? Number(treasury) : null,
      });
      if (error) throw error;
      setQty({}); setSerials({}); setInvoice('');
      await loadInvoices();
      loadRecent();
      setMsg(`تم ترحيل مرتجع الشراء ${data?.number || ''} كعملية مخزنية ومحاسبية واحدة.`);
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-border p-4">
      <h3 className="font-black">مرتجع مشتريات</h3>
      <p className="mt-1 text-xs text-muted">المرتجع مرتبط بفاتورة شراء مُرحّلة ويخصم الكميات من مخزون نفس الفرع.</p>
      <select className={`${I} mt-3`} value={invoice} onChange={e => { setInvoice(e.target.value); setQty({}); setSerials({}); }}>
        <option value="">اختر فاتورة شراء</option>
        {invoices.map(x => <option key={x.id} value={x.id}>{x.invoice_number} · {x.suppliers?.name || 'مورد'}</option>)}
      </select>
      {!branchesLoading && invoices.length === 0 && (
        <p className="mt-2 text-xs font-bold text-danger">لا توجد فواتير شراء قابلة للإرجاع ضمن فروعك المتاحة. (الفواتير المرتجعة بالكامل لا تظهر، ولو المفروض تشوف فواتير فعّل «عرض جميع الفروع» أو اربط المستخدم بالفرع.)</p>
      )}
      {invItems.map(x => (
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_130px_1fr]" key={x.id}>
          <div className="py-2">{x.products?.name} · المتاح للإرجاع {x.remaining} من {x.quantity}</div>
          <input className={I} type="number" min="0" max={x.remaining} step={x.products?.serial_tracked ? '1' : '0.001'} value={qty[x.id] || ''} onChange={e => setQty({ ...qty, [x.id]: e.target.value })} placeholder="المرتجع" />
          <textarea className={I} disabled={!x.products?.serial_tracked} value={serials[x.id] || ''} onChange={e => setSerials({ ...serials, [x.id]: e.target.value })} placeholder={x.products?.serial_tracked ? 'السريلات المرتجعة' : 'غير متتبع بالسريال'} />
        </div>
      ))}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <select className={I} value={settlementType} onChange={e => { setSettlementType(e.target.value); setTreasury(''); }}>
          <option value="cash">رد نقدي من المورد</option>
          <option value="credit">على حساب المورد</option>
        </select>
        {settlementType === 'cash' && (
          <select className={I} value={treasury} onChange={e => setTreasury(e.target.value)}>
            <option value="">الخزينة المستلمة *</option>
            {treasuries.filter(t => !t.branch || t.branch === inv?.branch).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
      {inv && <div className="mt-3 font-black">إجمالي المرتجع: {total.toLocaleString()}</div>}
      <button disabled={busy || !can('can_erp_purchase_return')} onClick={post} className="mt-3 rounded-xl bg-accent px-5 py-2.5 font-black text-on-accent disabled:opacity-50">{busy ? 'جارٍ الترحيل...' : 'ترحيل المرتجع'}</button>
      {msg && <p className="mt-2 text-sm font-bold text-accent">{msg}</p>}
      <div className="mt-6">
        {returnRows.length > 0 && (
          <div className="rounded-2xl border border-border p-4">
            <h3 className="mb-3 font-black">مرتجعات المشتريات</h3>
            {returnRows.map(r => (
              <button type="button" key={r.id} onClick={() => setViewDoc(r.id)} className="me-2 mb-2 rounded-lg border border-border px-3 py-2 font-black text-accent underline">{r.return_number}</button>
            ))}
          </div>
        )}
        {viewDoc && <ERPDocumentViewer type="purchase_return" id={viewDoc} onClose={() => setViewDoc(null)} />}
      </div>
    </div>
  );
}
