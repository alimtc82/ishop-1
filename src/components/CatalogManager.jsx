import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchCatalogAll } from '../lib/api';
import {
  createCatalogType, updateCatalogType, deleteCatalogType,
  createCatalogModel, updateCatalogModel, deleteCatalogModel,
  createCatalogColor, updateCatalogColor, deleteCatalogColor,
  setModelColors,
} from '../lib/adminApi';
import Input from './ui/Input';
import Button from './ui/Button';
import Modal from './ui/Modal';

export default function CatalogManager() {
  const { show } = useToast();
  const [data, setData] = useState(null);
  const [view, setView] = useState('types');       // types | models | model
  const [selType, setSelType] = useState(null);
  const [selModel, setSelModel] = useState(null);
  const [typeSearch, setTypeSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [newType, setNewType] = useState('');
  const [editType, setEditType] = useState(null);  // {id, name}
  const [modelModal, setModelModal] = useState(null); // {mode, model?}
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reload() {
    try { setData(await fetchCatalogAll()); }
    catch (e) { show('❌ ' + (e.message || ''), 'error'); }
  }
  useEffect(() => { reload(); }, []);

  const maps = useMemo(() => {
    if (!data) return null;
    const modelCountByType = {};
    for (const m of data.models) modelCountByType[m.type_id] = (modelCountByType[m.type_id] || 0) + 1;
    const colorUsage = {};
    for (const l of data.links) colorUsage[l.color_id] = (colorUsage[l.color_id] || 0) + 1;
    const colorById = Object.fromEntries(data.colors.map((c) => [c.id, c]));
    const linksByModel = {};
    for (const l of data.links) (linksByModel[l.model_id] ||= []).push(l.color_id);
    return { modelCountByType, colorUsage, colorById, linksByModel };
  }, [data]);

  if (!data || !maps) return <div className="h-40 animate-pulse rounded-2xl bg-surface" />;

  const wrap = async (fn) => { setBusy(true); try { await fn(); await reload(); } catch (e) { show('❌ ' + (e.message || ''), 'error'); } finally { setBusy(false); } };

  const typesList = data.types.filter((t) => !typeSearch || t.name.toLowerCase().includes(typeSearch.toLowerCase()));
  const typeObj = data.types.find((t) => t.id === selType) || null;
  const modelsList = data.models
    .filter((m) => m.type_id === selType)
    .filter((m) => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase()));
  const modelObj = data.models.find((m) => m.id === selModel) || null;

  // ── أنواع ──
  const addType = () => { const n = newType.trim(); if (!n) return; wrap(() => createCatalogType(n, data.types.length)); setNewType(''); };
  const saveType = () => { const n = editType.name.trim(); if (!n) return; wrap(() => updateCatalogType(editType.id, { name: n })); setEditType(null); };
  const toggleType = (t) => wrap(() => updateCatalogType(t.id, { active: !t.active }));
  const removeType = (t) => {
    if ((maps.modelCountByType[t.id] || 0) > 0) { show('⛔ لا يمكن حذف نوع مرتبط بموديلات. انقل أو احذف الموديلات أولًا، أو عطّل النوع.', 'error'); return; }
    if (window.confirm(`حذف نوع «${t.name}»؟`)) wrap(() => deleteCatalogType(t.id));
  };
  const openType = (t) => { setSelType(t.id); setModelSearch(''); setView('models'); };

  // ── موديلات ──
  const toggleModel = (m) => wrap(() => updateCatalogModel(m.id, { active: !m.active }));
  const removeModel = (m) => { if (window.confirm(`حذف موديل «${m.name}»؟ (الأجهزة القديمة مش هتتأثر)`)) wrap(async () => { await deleteCatalogModel(m.id); if (selModel === m.id) setView('models'); }); };
  const duplicateModel = (m) => wrap(async () => {
    const nid = await createCatalogModel({ type_id: m.type_id, name: `${m.name} (نسخة)`, active: m.active, sort: (m.sort || 0) + 1 });
    const cids = maps.linksByModel[m.id] || [];
    if (cids.length) await setModelColors(nid, cids);
  });
  const openModel = (m) => { setSelModel(m.id); setView('model'); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-accent">إدارة الكتالوج</h1>
          <p className="mt-0.5 text-[11px] text-muted">النوع ← الموديل ← الألوان (مصدر موحّد)</p>
        </div>
        <button type="button" onClick={() => setLibraryOpen(true)}
                className="shrink-0 rounded-xl border border-accent-line bg-accent-soft px-3 py-2 text-xs font-black text-accent">🎨 مكتبة الألوان</button>
      </div>

      {/* ═══ الأنواع ═══ */}
      {view === 'types' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="flex gap-2">
              <Input value={newType} onChange={(e) => setNewType(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addType()} placeholder="نوع جديد (iPhone, iPad…)" className="flex-1" />
              <Button onClick={addType} loading={busy} disabled={!newType.trim()}>إضافة</Button>
            </div>
            <input value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} placeholder="🔍 ابحث في الأنواع"
                   className="mt-2 w-full rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-text outline-none focus:border-accent" />
          </div>
          <div className="space-y-2">
            {typesList.map((t) => (
              <div key={t.id} className={`rounded-2xl border bg-card p-3 ${t.active ? 'border-border' : 'border-danger/30 opacity-60'}`}>
                {editType?.id === t.id ? (
                  <div className="flex gap-2">
                    <Input value={editType.name} onChange={(e) => setEditType({ ...editType, name: e.target.value })} className="flex-1" />
                    <Button onClick={saveType} loading={busy}>حفظ</Button>
                    <button type="button" onClick={() => setEditType(null)} className="rounded-lg border border-border bg-surface px-2.5 text-xs text-muted">إلغاء</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => openType(t)} className="flex-1 text-start">
                      <span className="text-sm font-black text-text">{t.name}</span>
                      <span className="ms-2 text-[11px] font-bold text-muted num">{maps.modelCountByType[t.id] || 0} موديل</span>
                      {!t.active && <span className="ms-1 text-[10px] text-danger">(معطّل)</span>}
                    </button>
                    <button type="button" onClick={() => setEditType({ id: t.id, name: t.name })} className="rounded-lg border border-accent-line bg-accent-soft px-2 py-1 text-[11px] font-bold text-accent">✏️</button>
                    <button type="button" onClick={() => toggleType(t)} className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-bold text-muted">{t.active ? '⏸️' : '✅'}</button>
                    <button type="button" onClick={() => removeType(t)} className="rounded-lg border border-danger/25 bg-danger/10 px-2 py-1 text-[11px] font-bold text-danger">🗑️</button>
                    <button type="button" onClick={() => openType(t)} className="text-accent">‹</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ الموديلات ═══ */}
      {view === 'models' && typeObj && (
        <div className="space-y-3">
          <button type="button" onClick={() => setView('types')} className="inline-flex items-center gap-1 rounded-xl border border-accent-line bg-accent-soft px-3 py-1.5 text-xs font-black text-accent">‹ الأنواع</button>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-text">{typeObj.name}</h2>
            <Button onClick={() => setModelModal({ mode: 'add' })}>➕ موديل</Button>
          </div>
          <input value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} placeholder="🔍 ابحث في الموديلات"
                 className="w-full rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-text outline-none focus:border-accent" />
          <div className="space-y-2">
            {modelsList.length === 0 && <p className="rounded-2xl border border-border bg-surface/40 p-5 text-center text-xs text-muted">مفيش موديلات في النوع ده.</p>}
            {modelsList.map((m) => (
              <button key={m.id} type="button" onClick={() => openModel(m)}
                      className={`flex w-full items-center justify-between rounded-2xl border bg-card p-3.5 text-start ${m.active ? 'border-border' : 'border-danger/30 opacity-60'}`}>
                <span>
                  <span className="text-sm font-black text-text">{m.name}</span>
                  {!m.active && <span className="ms-1 text-[10px] text-danger">(معطّل)</span>}
                  <span className="mt-0.5 block text-[10px] text-muted num">{(maps.linksByModel[m.id] || []).length} لون</span>
                </span>
                <span className="text-accent">‹</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ تفاصيل الموديل ═══ */}
      {view === 'model' && modelObj && (
        <div className="space-y-4">
          <button type="button" onClick={() => setView('models')} className="inline-flex items-center gap-1 rounded-xl border border-accent-line bg-accent-soft px-3 py-1.5 text-xs font-black text-accent">‹ الموديلات</button>
          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="text-xl font-black text-text">{modelObj.name}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">{typeObj?.name}</span>
              <span className={`rounded-full px-2.5 py-1 ${modelObj.active ? 'bg-[var(--mtc-success)]/12 text-[var(--mtc-success)]' : 'bg-danger/12 text-danger'}`}>{modelObj.active ? 'نشط' : 'معطّل'}</span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-muted num">ترتيب: {modelObj.sort ?? 0}</span>
            </div>

            <p className="mb-2 mt-4 text-xs font-black text-muted">الألوان المتاحة</p>
            <div className="flex flex-wrap gap-2">
              {(maps.linksByModel[modelObj.id] || []).length === 0 && <span className="text-[11px] text-muted">مفيش ألوان.</span>}
              {(maps.linksByModel[modelObj.id] || []).map((cid) => {
                const c = maps.colorById[cid]; if (!c) return null;
                return (
                  <span key={cid} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-text">
                    <span className="inline-block size-3 rounded-full border border-black/20" style={{ background: c.hex || '#888' }} />
                    {c.name_en}
                  </span>
                );
              })}
            </div>
            <button type="button" onClick={() => setModelModal({ mode: 'edit', model: modelObj })}
                    className="mt-4 w-full rounded-xl border border-accent-line bg-accent-soft px-3 py-2.5 text-xs font-black text-accent">+ إدارة الموديل والألوان</button>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button type="button" onClick={() => duplicateModel(modelObj)} className="rounded-xl border border-border bg-surface px-2 py-2 text-[11px] font-bold text-muted">📋 تكرار</button>
              <button type="button" onClick={() => toggleModel(modelObj)} className="rounded-xl border border-border bg-surface px-2 py-2 text-[11px] font-bold text-muted">{modelObj.active ? '⏸️ تعطيل' : '✅ تفعيل'}</button>
              <button type="button" onClick={() => removeModel(modelObj)} className="rounded-xl border border-danger/25 bg-danger/10 px-2 py-2 text-[11px] font-bold text-danger">🗑️ حذف</button>
            </div>
          </div>
        </div>
      )}

      {modelModal && (
        <ModelModal data={data} maps={maps} mode={modelModal.mode} model={modelModal.model}
                    defaultTypeId={selType} onClose={() => setModelModal(null)}
                    onSaved={async () => { setModelModal(null); await reload(); }} />
      )}
      {libraryOpen && <ColorsLibrary data={data} maps={maps} onClose={() => setLibraryOpen(false)} onChanged={reload} />}
    </div>
  );
}

// ═══════════ Modal: إضافة/تعديل موديل + ألوانه ═══════════
function ModelModal({ data, maps, mode, model, defaultTypeId, onClose, onSaved }) {
  const { show } = useToast();
  const [typeId, setTypeId] = useState(model?.type_id ?? defaultTypeId ?? data.types[0]?.id);
  const [name, setName] = useState(model?.name ?? '');
  const [active, setActive] = useState(model ? model.active : true);
  const [sort, setSort] = useState(model?.sort ?? 0);
  const [sel, setSel] = useState(new Set(model ? (maps.linksByModel[model.id] || []) : []));
  const [colors, setColors] = useState(data.colors);
  const [csearch, setCsearch] = useState('');
  const [newColor, setNewColor] = useState({ name: '', hex: '#888888' });
  const [busy, setBusy] = useState(false);

  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const shown = colors.filter((c) => !csearch || c.name_en.toLowerCase().includes(csearch.toLowerCase()) || (c.name_ar || '').includes(csearch));

  async function quickAddColor() {
    const n = newColor.name.trim(); if (!n) return;
    try {
      const id = await createCatalogColor({ name_en: n, hex: newColor.hex, sort: colors.length });
      setColors((p) => [...p, { id, name_en: n, hex: newColor.hex, active: true }]);
      setSel((p) => new Set(p).add(id));
      setNewColor({ name: '', hex: '#888888' });
    } catch (e) { show('❌ ' + (e.message || ''), 'error'); }
  }

  async function save() {
    if (!name.trim() || !typeId) return;
    setBusy(true);
    try {
      let id = model?.id;
      if (mode === 'add') id = await createCatalogModel({ type_id: typeId, name: name.trim(), active, sort: Number(sort) || 0 });
      else await updateCatalogModel(id, { type_id: typeId, name: name.trim(), active, sort: Number(sort) || 0 });
      await setModelColors(id, [...sel]);
      show('✅ اتحفظ');
      onSaved();
    } catch (e) { show('❌ ' + (e.message || ''), 'error'); setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title={mode === 'add' ? 'موديل جديد' : 'تعديل الموديل'}>
      <div className="space-y-3 text-start">
        <div>
          <label className="mb-1 block text-xs font-bold text-muted">النوع *</label>
          <select value={typeId} onChange={(e) => setTypeId(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent">
            {data.types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <Input label="اسم الموديل *" value={name} onChange={(e) => setName(e.target.value)} placeholder="iPhone 16 Pro Max" />
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-text">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[var(--mtc-gold)]" /> نشط
          </label>
          <div className="flex flex-1 items-center gap-2">
            <label className="text-xs font-bold text-muted">الترتيب</label>
            <input type="number" value={sort} onChange={(e) => setSort(e.target.value)}
                   className="w-20 rounded-lg border border-border bg-input px-2 py-1.5 text-sm text-text outline-none focus:border-accent" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/40 p-3">
          <p className="mb-2 text-xs font-black text-text">الألوان</p>
          <input value={csearch} onChange={(e) => setCsearch(e.target.value)} placeholder="🔍 ابحث عن لون"
                 className="mb-2 w-full rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-text outline-none focus:border-accent" />
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {shown.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[13px] text-text hover:bg-card">
                <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} className="size-4 accent-[var(--mtc-gold)]" />
                <span className="inline-block size-3.5 rounded-full border border-black/20" style={{ background: c.hex || '#888' }} />
                {c.name_en}{c.name_ar ? <span className="text-muted">· {c.name_ar}</span> : ''}
                {c.active === false && <span className="text-[10px] text-danger">(معطّل)</span>}
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
            <input type="color" value={newColor.hex} onChange={(e) => setNewColor((p) => ({ ...p, hex: e.target.value }))} className="size-8 rounded border border-border bg-transparent" />
            <input value={newColor.name} onChange={(e) => setNewColor((p) => ({ ...p, name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && quickAddColor()}
                   placeholder="لون جديد" className="flex-1 rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent" />
            <button type="button" onClick={quickAddColor} className="rounded-lg border border-accent-line bg-accent-soft px-3 py-1.5 text-[11px] font-bold text-accent">+ لون</button>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button className="flex-1" onClick={save} loading={busy} disabled={!name.trim()}>حفظ</Button>
          <button type="button" onClick={onClose} className="rounded-xl border border-border bg-surface px-4 text-sm font-bold text-muted">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════ Modal: مكتبة الألوان ═══════════
function ColorsLibrary({ data, maps, onClose, onChanged }) {
  const { show } = useToast();
  const [form, setForm] = useState({ name_en: '', name_ar: '', hex: '#888888' });
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const wrap = async (fn) => { setBusy(true); try { await fn(); await onChanged(); } catch (e) { show('❌ ' + (e.message || ''), 'error'); } finally { setBusy(false); } };
  const add = () => { const n = form.name_en.trim(); if (!n) return; wrap(() => createCatalogColor({ name_en: n, name_ar: form.name_ar.trim() || null, hex: form.hex, sort: data.colors.length })); setForm({ name_en: '', name_ar: '', hex: '#888888' }); };
  const saveEdit = () => wrap(() => updateCatalogColor(edit.id, { name_en: edit.name_en.trim(), name_ar: edit.name_ar?.trim() || null, hex: edit.hex })).then(() => setEdit(null));
  const remove = (c) => {
    const used = maps.colorUsage[c.id] || 0;
    if (used > 0) { show(`⛔ اللون مستخدم في ${used} موديل. شيله منهم أولًا أو عطّله.`, 'error'); return; }
    if (window.confirm(`حذف لون «${c.name_en}»؟`)) wrap(() => deleteCatalogColor(c.id));
  };
  const shown = data.colors.filter((c) => !q || c.name_en.toLowerCase().includes(q.toLowerCase()) || (c.name_ar || '').includes(q));

  return (
    <Modal open onClose={onClose} title="🎨 مكتبة الألوان">
      <div className="space-y-3 text-start">
        <div className="rounded-2xl border border-border bg-surface/40 p-3">
          <div className="flex items-center gap-2">
            <input type="color" value={form.hex} onChange={(e) => setForm((p) => ({ ...p, hex: e.target.value }))} className="size-9 rounded border border-border bg-transparent" />
            <input value={form.name_en} onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))} placeholder="اسم اللون (EN)" className="flex-1 rounded-lg border border-border bg-input px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent" />
          </div>
          <div className="mt-2 flex gap-2">
            <input value={form.name_ar} onChange={(e) => setForm((p) => ({ ...p, name_ar: e.target.value }))} placeholder="عربي (اختياري)" className="flex-1 rounded-lg border border-border bg-input px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent" />
            <Button onClick={add} loading={busy} disabled={!form.name_en.trim()}>إضافة</Button>
          </div>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ابحث" className="w-full rounded-lg border border-border bg-input px-3 py-1.5 text-sm text-text outline-none focus:border-accent" />
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {shown.map((c) => (
            <div key={c.id} className={`rounded-xl border p-2.5 ${c.active === false ? 'border-danger/30 opacity-60' : 'border-border'} bg-card`}>
              {edit?.id === c.id ? (
                <div className="flex items-center gap-2">
                  <input type="color" value={edit.hex || '#888888'} onChange={(e) => setEdit({ ...edit, hex: e.target.value })} className="size-8 rounded border border-border bg-transparent" />
                  <input value={edit.name_en} onChange={(e) => setEdit({ ...edit, name_en: e.target.value })} className="flex-1 rounded-lg border border-border bg-input px-2 py-1 text-sm text-text" />
                  <button type="button" onClick={saveEdit} className="rounded-lg border border-accent bg-accent px-2.5 py-1 text-[11px] font-bold text-on-accent">حفظ</button>
                  <button type="button" onClick={() => setEdit(null)} className="text-xs text-muted">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-block size-5 rounded-full border border-black/20" style={{ background: c.hex || '#888' }} />
                  <span className="flex-1 text-sm font-bold text-text">{c.name_en}{c.name_ar ? <span className="text-[11px] text-muted"> · {c.name_ar}</span> : ''}</span>
                  <span className="text-[10px] text-muted num">{maps.colorUsage[c.id] || 0} موديل</span>
                  <button type="button" onClick={() => updateCatalogColor(c.id, { active: !(c.active !== false) }).then(onChanged)} className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] text-muted">{c.active === false ? '✅' : '⏸️'}</button>
                  <button type="button" onClick={() => setEdit({ id: c.id, name_en: c.name_en, name_ar: c.name_ar, hex: c.hex })} className="rounded-lg border border-accent-line bg-accent-soft px-2 py-1 text-[11px] text-accent">✏️</button>
                  <button type="button" onClick={() => remove(c)} className="rounded-lg border border-danger/25 bg-danger/10 px-2 py-1 text-[11px] text-danger">🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
