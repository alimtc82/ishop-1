import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchSetting } from '../lib/api';
import { saveSetting } from '../lib/adminApi';
import Input from './ui/Input';
import Button from './ui/Button';

export default function BranchesAdmin() {
  const { show } = useToast();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [editVal, setEditVal] = useState('');

  useEffect(() => {
    fetchSetting('branches')
      .then((v) => setBranches(Array.isArray(v) ? v : []))
      .finally(() => setLoading(false));
  }, []);

  async function persist(list) {
    setBusy(true);
    try { await saveSetting('branches', list); setBranches(list); }
    catch (e) { show('❌ ' + (e.message || ''), 'error'); }
    finally { setBusy(false); }
  }

  function add() {
    const b = name.trim();
    if (!b || branches.some((x) => x.toLowerCase() === b.toLowerCase())) return;
    persist([...branches, b]);
    setName('');
    show('✅ اتضاف الفرع');
  }

  function saveEdit(i) {
    const v = editVal.trim();
    if (!v) return;
    const list = branches.map((x, idx) => (idx === i ? v : x));
    persist(list);
    setEditIdx(-1);
  }

  function remove(b) {
    if (!window.confirm(`حذف فرع «${b}»؟`)) return;
    persist(branches.filter((x) => x !== b));
    show('🗑️ اتحذف');
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-accent">الفروع</h1>
        <p className="mt-1 text-sm text-muted">الفروع بتُستخدم في ربط المستخدمين وفورم آراء العملاء.</p>
      </div>

      {/* إضافة */}
      <div className="rounded-3xl border border-border bg-card p-4">
        <p className="mb-2 text-sm font-black text-text">➕ فرع جديد</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="اسم الفرع" className="flex-1" />
          <Button onClick={add} loading={busy} disabled={!name.trim()}>إضافة</Button>
        </div>
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="h-20 animate-pulse rounded-2xl bg-surface" />
      ) : branches.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/40 p-5 text-center text-sm text-muted">مفيش فروع لسه.</div>
      ) : (
        <div className="space-y-2">
          {branches.map((b, i) => (
            <div key={b} className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
              {editIdx === i ? (
                <>
                  <Input value={editVal} onChange={(e) => setEditVal(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && saveEdit(i)} className="flex-1" />
                  <Button onClick={() => saveEdit(i)} loading={busy}>حفظ</Button>
                  <button type="button" onClick={() => setEditIdx(-1)}
                          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-bold text-muted">إلغاء</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-black text-text">🏬 {b}</span>
                  <button type="button" onClick={() => { setEditIdx(i); setEditVal(b); }}
                          className="rounded-lg border border-accent-line bg-accent-soft px-2.5 py-1.5 text-[11px] font-bold text-accent">✏️ تعديل</button>
                  <button type="button" onClick={() => remove(b)}
                          className="rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1.5 text-[11px] font-bold text-danger">🗑️</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted">ملاحظة: تعديل أو حذف فرع مابيغيّرش الفرع المربوط بمستخدمين حاليين تلقائيًا.</p>
    </div>
  );
}
