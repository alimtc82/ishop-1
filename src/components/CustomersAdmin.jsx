import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { usePermissions } from '../context/PermissionContext';
import {
  fetchCustomers, fetchCustomerCounts, fetchCustomerDevices, createCustomer,
  updateCustomer, deleteCustomerCompletely,
} from '../lib/adminApi';
import Button from './ui/Button';
import { downloadPartyTemplate, exportParties, importParties, parsePartyFile } from '../lib/partyImportExport';
import ListPagination,{useListPagination} from './ui/ListPagination';
import PartyPaymentsAdmin from './PartyPaymentsAdmin';
import PartyStatementAdmin from './PartyStatementAdmin';
import { supabase } from '../lib/supabase';

/**
 * V11.32 — قسم العملاء.
 *
 * مصدر واحد للحقيقة: عمود `customers.source` هو اللي بيحدد نوع العميل،
 * مفيش أي قايمة موازية ممكن تفرق عنه.
 */
const SOURCES = {
  facebook_review: { label: 'فيسبوك', icon: '📘', tone: 'border-[var(--mtc-info)]/30 bg-[var(--mtc-info)]/12 text-[var(--mtc-info)]' },
  purchase: { label: 'مشتري', icon: '🛒', tone: 'border-accent-line bg-accent-soft text-accent' },
  manual: { label: 'يدوي', icon: '✍️', tone: 'border-border bg-surface text-muted' },
};
const sourceOf = (s) => SOURCES[s] || { label: s || '—', icon: '•', tone: 'border-border bg-surface text-muted' };

const phoneForTel = (phone) => String(phone || '').trim().replace(/[^\d+]/g, '');
const phoneForWhatsApp = (phone) => {
  const clean = String(phone || '').replace(/\D/g, '');
  // أرقام مصر المحلية: 01xxxxxxxxx -> 201xxxxxxxxx
  if (/^01\d{9}$/.test(clean)) return `2${clean}`;
  if (/^20\d{11}$/.test(clean)) return clean;
  return clean.replace(/^00/, '');
};
const whatsappUrl = (phone) => `https://wa.me/${phoneForWhatsApp(phone)}`;

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'facebook_review', label: '📘 فيسبوك' },
  { key: 'purchase', label: '🛒 مشتريين' },
  { key: 'manual', label: '✍️ يدوي' },
];

export default function CustomersAdmin() {
  const { show } = useToast();
  const { can } = usePermissions();
  const canCreateCustomer = can('can_customer_create');
  const canOpenCustomer = can('can_customer_card');
  const canSeePhone = can('can_customer_phone');
  const canCallCustomer = canSeePhone && can('can_customer_call');
  const canWhatsAppCustomer = canSeePhone && can('can_customer_whatsapp');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ devices: {}, reviews: {} });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);   // null | 'new' | صف العميل
  const [busy, setBusy] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewDevices, setViewDevices] = useState([]);
  const [importBusy,setImportBusy]=useState(false);
  const [accountBalance,setAccountBalance]=useState(0); const [cardTab,setCardTab]=useState('info');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [list, c] = await Promise.all([fetchCustomers(), fetchCustomerCounts()]);
      setRows(list);
      setCounts(c);
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  }

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && r.source !== filter) return false;
      if (!t) return true;
      return [r.display_name, r.phone, r.email]
        .some((v) => String(v || '').toLowerCase().includes(t));
    });
  }, [rows, q, filter]);
  const pager=useListPagination(shown,[q,filter]);

  async function doImport(e) { const file=e.target.files?.[0]; e.target.value=''; if(!file)return; setImportBusy(true); try { const items=await parsePartyFile(file); const r=await importParties('customer',items); if(r.errors.length){show(`❌ لم يتم الاستيراد: ${r.errors.length} صف به أخطاء. أول خطأ: صف ${r.errors[0].row} — ${r.errors[0].error}`,'error'); return;} await load(); show(`✅ تم استيراد ${r.inserted} عميل`); } catch(x){show('❌ '+x.message,'error')} finally {setImportBusy(false)} }

  async function openCustomerCard(r) {
    if (!canOpenCustomer) return;
    setViewing(r); setCardTab('info');
    setViewDevices([]);
    supabase.from('dues').select('amount,settled_amount,due_type,status').eq('party_type','customer').eq('party_id',r.id).neq('status','cancelled').then(({data})=>setAccountBalance((data||[]).reduce((a,d)=>a+(d.due_type==='receivable'?1:-1)*(Number(d.amount||0)-Number(d.settled_amount||0)),Number(r.opening_balance||0))));
    try {
      const devices = await fetchCustomerDevices(r.id);
      setViewDevices(devices);
    } catch (e) {
      show('❌ فشل تحميل أجهزة العميل: ' + (e.message || ''), 'error');
    }
  }

  async function save(form) {
    const name = form.display_name.trim();
    if (!name) { show('⚠️ الاسم مطلوب', 'error'); return; }
    setBusy('save');
    try {
      if (editing === 'new') {
        const created = await createCustomer(form);
        setRows((p) => [created, ...p]);
        show('✅ اتضاف العميل');
      } else {
        const updated = await updateCustomer(editing.id, form);
        setRows((p) => p.map((r) => (r.id === updated.id ? updated : r)));
        show('✅ اتحفظ');
      }
      setEditing(null);
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function remove(r) {
    const d = counts.devices[r.id] || 0;
    const v = counts.reviews[r.id] || 0;
    const extra = [
      v ? `${v} تقييم (هيتمسحوا)` : null,
      d ? `${d} جهاز مؤرشف (هيفضلوا، بس الربط هيتفك)` : null,
    ].filter(Boolean).join('\n');
    if (!window.confirm(`حذف «${r.display_name}» نهائيًا؟\n\n${extra || 'مفيش حاجة مربوطة بيه.'}\n\nمالهاش رجعة.`)) return;
    setBusy(r.id);
    try {
      await deleteCustomerCompletely(r.id);
      setRows((p) => p.filter((x) => x.id !== r.id));
      show('🗑️ اتمسح العميل');
      // العدّادات ممكن تكون اتغيّرت — نرجع للحقيقة من السيرفر
      fetchCustomerCounts().then(setCounts).catch(() => {});
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
    } finally {
      setBusy(null);
    }
  }

  if (editing) {
    return <CustomerForm initial={editing === 'new' ? null : editing}
                         busy={busy === 'save'}
                         onSave={save} onCancel={() => setEditing(null)} />;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-accent">العملاء</h1>
          <p className="num mt-1 text-sm text-muted">{rows.length} عميل</p>
        </div>
        <div className="flex flex-wrap gap-2"><button className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-black" onClick={()=>downloadPartyTemplate('customer')}>تحميل قالب</button><label className="cursor-pointer rounded-xl border border-accent-line bg-accent-soft px-3 py-2 text-xs font-black text-accent">{importBusy?'جارٍ الاستيراد…':'استيراد Excel'}<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={doImport}/></label><button className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-black" onClick={()=>exportParties('customer',rows)}>تصدير Excel</button>{canCreateCustomer && <Button onClick={() => setEditing('new')}>➕ عميل جديد</Button>}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${
                    filter === f.key
                      ? 'border-accent-line bg-accent text-on-accent'
                      : 'border-border bg-card text-muted hover:border-accent-line'
                  }`}>
            {f.label}
          </button>
        ))}
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)}
             placeholder="دوّر بالاسم أو التليفون أو الإيميل…"
             className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-accent-line" />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">
          مفيش عملاء مطابقين.
        </p>
      ) : (
        <div className="space-y-2">
          {pager.visible.map((r) => {
            const src = sourceOf(r.source);
            const d = counts.devices[r.id] || 0;
            const v = counts.reviews[r.id] || 0;
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-on-accent">
                    {r.display_name?.charAt(0)?.toUpperCase() ?? '؟'}
                  </span>
                )}

                <button type="button" onClick={() => openCustomerCard(r)} disabled={!canOpenCustomer} className="min-w-0 flex-1 text-start group disabled:cursor-default">
                  <p className="truncate text-sm font-black text-text underline-offset-4 group-hover:text-accent group-hover:underline">{r.display_name}</p>
                  <p className="num truncate text-xs text-muted">{[canSeePhone ? r.phone : null, r.email].filter(Boolean).join(' · ') || (canSeePhone ? 'مفيش بيانات تواصل' : 'رقم الهاتف مخفي')}</p>
                </button>

                <span className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-black ${src.tone}`}>
                  {src.icon} {src.label}
                </span>

                {(d > 0 || v > 0) && (
                  <span className="num shrink-0 text-[11px] font-bold text-muted">
                    {d > 0 && `🛒 ${d}`}{d > 0 && v > 0 && ' · '}{v > 0 && `⭐ ${v}`}
                  </span>
                )}

                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => setEditing(r)}
                          className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-text">✏️</button>
                  <button type="button" onClick={() => remove(r)} disabled={busy === r.id}
                          className="rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger disabled:opacity-50">
                    {busy === r.id ? '…' : '🗑️'}
                  </button>
                </div>
              </div>
            );
          })}
          <ListPagination {...pager}/>
        </div>
      )}
      {viewing && (() => {
        const src = sourceOf(viewing.source);
        const d = counts.devices[viewing.id] || 0;
        const v = counts.reviews[viewing.id] || 0;
        const val = (obj, ...keys) => keys.map(k => obj?.[k]).find(x => x !== null && x !== undefined && x !== '') || '—';
        return (
          <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4" onClick={() => setViewing(null)}>
            <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-accent-line bg-card p-5 shadow-2xl"
                 onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                {viewing.avatar_url ? (
                  <img src={viewing.avatar_url} alt="" className="size-16 rounded-full object-cover" />
                ) : (
                  <span className="grid size-16 place-items-center rounded-full bg-accent text-xl font-black text-on-accent">
                    {viewing.display_name?.charAt(0)?.toUpperCase() || '؟'}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-black text-accent">{viewing.display_name}</h2>
                  {canSeePhone ? (viewing.phone ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {canCallCustomer ? (
                        <a href={`tel:${phoneForTel(viewing.phone)}`} className="num text-sm font-bold text-accent underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()} title="اتصال مباشر">📞 {viewing.phone}</a>
                      ) : (
                        <span className="num text-sm font-bold text-muted">{viewing.phone}</span>
                      )}
                      {canWhatsAppCustomer && (
                        <a href={whatsappUrl(viewing.phone)} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-black text-emerald-500" onClick={(e) => e.stopPropagation()} title="مراسلة عبر واتساب">واتساب 💬</a>
                      )}
                    </div>
                  ) : <p className="mt-1 text-sm text-muted">بدون رقم هاتف</p>) : (
                    <p className="mt-1 text-sm font-bold text-muted">رقم الهاتف مخفي</p>
                  )}
                  <p className="num text-xs text-muted">{viewing.email || ''}</p>
                  <span className={`mt-2 inline-block rounded-lg border px-2 py-1 text-[11px] font-black ${src.tone}`}>{src.icon} {src.label}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border bg-surface/60 p-3 text-center">
                  <div className="num text-xl font-black text-accent">{d}</div><div className="text-xs text-muted">أجهزة مشتراة</div>
                </div>
                <div className="rounded-2xl border border-border bg-surface/60 p-3 text-center">
                  <div className="num text-xl font-black text-accent">{v}</div><div className="text-xs text-muted">تقييمات</div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-accent-line bg-accent-soft p-4"><div className="text-xs text-muted">صافي حساب العميل</div><div className="mt-1 text-xl font-black text-accent">{Math.abs(accountBalance).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} <span className="text-xs">{accountBalance===0?'مسدد':accountBalance>0?'لنا على العميل':'للعميل علينا'}</span></div></div>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>setCardTab('pay')} className="rounded-xl bg-accent px-4 py-2 text-sm font-black text-on-accent">تحصيل</button><button type="button" onClick={()=>setCardTab('statement')} className="rounded-xl border border-border px-4 py-2 text-sm font-black">كشف حساب</button><button type="button" onClick={()=>{const r=viewing;setViewing(null);setEditing(r)}} className="rounded-xl border border-border px-4 py-2 text-sm font-black">تعديل البيانات</button></div>
              {cardTab==='pay'&&<div className="mt-4"><PartyPaymentsAdmin type="customer" initialPartyId={viewing.id}/></div>}
              {cardTab==='statement'&&<div className="mt-4"><PartyStatementAdmin type="customer" initialPartyId={viewing.id}/></div>}

              <div className="mt-5">
                <h3 className="mb-2 text-sm font-black text-accent">📦 الأجهزة التي اشتراها</h3>
                {viewDevices.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-surface/40 p-4 text-center text-sm text-muted">لا توجد أجهزة مرتبطة بهذا العميل.</div>
                ) : (
                  <div className="space-y-2">
                    {viewDevices.map((dev) => (
                      <div key={dev.id || dev.sheet_row || dev.sheetRow} className="rounded-2xl border border-border bg-surface/50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-black text-text">{val(dev, 'model', 'device_model', 'name', 'device_name')}</div>
                          <div className="num text-xs font-bold text-muted">#{val(dev, 'sheet_row', 'sheetRow', 'id')}</div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <p><span className="text-muted">IMEI:</span> <span className="num font-bold">{val(dev, 'imei', 'IMEI')}</span></p>
                          <p><span className="text-muted">السعة:</span> <b>{val(dev, 'capacity', 'storage')}</b></p>
                          <p><span className="text-muted">اللون:</span> <b>{val(dev, 'color')}</b></p>
                          <p><span className="text-muted">الحالة:</span> <b>{val(dev, 'archive_reason', 'archiveReason', 'status')}</b></p>
                          <p><span className="text-muted">تاريخ البيع:</span> <span className="num">{val(dev, 'archived_at', 'archivedAt')}</span></p>
                          <p><span className="text-muted">البائع:</span> <b>{val(dev, 'archived_by_name', 'archivedByName', 'seller_name')}</b></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => { const r = viewing; setViewing(null); setEditing(r); }}>✏️ تعديل البيانات الأساسية</Button>
                <button type="button" onClick={() => setViewing(null)}
                        className="rounded-2xl border border-border bg-surface px-5 py-2.5 text-sm font-black text-muted">إغلاق</button>
              </div>
            </div>
          </div>
        );
      })()}

    </>
  );
}

function CustomerForm({ initial, busy, onSave, onCancel }) {
  const [form, setForm] = useState({
    display_name: initial?.display_name || '',
    business_name: initial?.business_name || '',
    opening_balance: String(initial?.opening_balance ?? 0),
    phone: initial?.phone || '',
    email: initial?.email || '',
  });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const fb = initial?.source === 'facebook_review';

  return (
    <>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel}
                className="text-sm font-bold text-muted transition hover:text-accent">‹ رجوع</button>
        <h1 className="text-xl font-black text-accent">
          {initial ? `✏️ تعديل: ${initial.display_name}` : '➕ عميل جديد'}
        </h1>
      </div>

      {fb && (
        <p className="rounded-2xl border border-accent-line bg-accent-soft/30 p-3 text-xs font-bold text-accent">
          العميل ده مسجّل بفيسبوك. لو غيّرت الاسم أو الصورة، أول مرة يسجّل دخول تاني
          هترجع من فيسبوك زي ما هي.
        </p>
      )}

      <div className="space-y-3 rounded-3xl border border-border bg-card p-5">
        <Field label="الاسم" value={form.display_name} onChange={set('display_name')} autoFocus />
        <Field label="اسم النشاط" value={form.business_name} onChange={set('business_name')} />
        <Field label="التليفون" value={form.phone} onChange={set('phone')} dir="ltr" />
        <Field label="الإيميل" value={form.email} onChange={set('email')} dir="ltr" />
        <Field label="الرصيد الافتتاحي (مستحق لنا على العميل)" type="number" min="0" step="0.01" value={form.opening_balance} onChange={set('opening_balance')} dir="ltr" />

        <div className="flex gap-2 pt-1">
          <Button onClick={() => onSave(form)} disabled={busy}>
            {busy ? '⏳ بيحفظ…' : '💾 حفظ'}
          </Button>
          <button type="button" onClick={onCancel}
                  className="rounded-2xl border border-border bg-surface px-5 py-2.5 text-sm font-black text-muted">
            إلغاء
          </button>
        </div>
      </div>


    </>
  );
}

function Field({ label, dir, ...rest }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-muted">{label}</span>
      <input {...rest} dir={dir}
             className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent-line" />
    </label>
  );
}
