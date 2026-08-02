import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchSetting } from '../lib/api';
import { saveSetting } from '../lib/adminApi';
import Input from './ui/Input';
import Button from './ui/Button';

export default function TypesAdmin() {
  const { show } = useToast();
  const [types, setTypes] = useState([]);
  const [allModels, setAllModels] = useState([]); // أسماء الموديلات المتاحة
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [picker, setPicker] = useState({}); // typeName -> موديل مختار للإضافة

  useEffect(() => {
    Promise.all([fetchSetting('device_types'), fetchSetting('device_models')])
      .then(([t, m]) => {
        setTypes(Array.isArray(t) ? t : []);
        setAllModels(Array.isArray(m) ? m.map((x) => x.name) : []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function persist(list) {
    setBusy(true);
    try { await saveSetting('device_types', list); setTypes(list); }
    catch (e) { show('❌ ' + (e.message || ''), 'error'); }
    finally { setBusy(false); }
  }

  function addType() {
    const n = name.trim();
    if (!n || types.some((t) => t.name.toLowerCase() === n.toLowerCase())) return;
    persist([...types, { name: n, models: [] }]);
    setName('');
  }
  function removeType(n) {
    if (!window.confirm(`حذف نوع «${n}»؟`)) return;
    persist(types.filter((t) => t.name !== n));
  }
  function addModelToType(tn) {
    const m = picker[tn];
    if (!m) return;
    persist(types.map((t) => t.name === tn && !t.models.includes(m) ? { ...t, models: [...t.models, m] } : t));
    setPicker((p) => ({ ...p, [tn]: '' }));
  }
  function removeModelFromType(tn, m) {
    persist(types.map((t) => t.name === tn ? { ...t, models: t.models.filter((x) => x !== m) } : t));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-accent">الأنواع</h1>
        <p className="mt-1 text-sm text-muted">النوع (الماركة) والموديلات المتاحة له — بتظهر في منسدلة إدخال جهاز جديد.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4">
        <p className="mb-2 text-sm font-black text-text">➕ نوع جديد</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && addType()} placeholder="اسم النوع (مثلاً Samsung)" className="flex-1" />
          <Button onClick={addType} loading={busy} disabled={!name.trim()}>إضافة</Button>
        </div>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <div className="space-y-2">
          {types.map((t) => {
            const avail = allModels.filter((m) => !t.models.includes(m));
            return (
              <div key={t.name} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-black text-text">{t.name} <span className="text-[11px] font-bold text-muted">({t.models.length})</span></span>
                  <button type="button" onClick={() => removeType(t.name)}
                          className="rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger">🗑️</button>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {t.models.length === 0 && <span className="text-[11px] text-muted">مفيش موديلات — بيبقى الموديل نص حر عند الإدخال.</span>}
                  {t.models.map((m) => (
                    <span key={m} className="inline-flex items-center gap-1 rounded-full border border-accent-line bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
                      {m}<button type="button" onClick={() => removeModelFromType(t.name, m)} className="text-danger">✕</button>
                    </span>
                  ))}
                </div>
                {avail.length > 0 && (
                  <div className="flex gap-2">
                    <select value={picker[t.name] || ''} onChange={(e) => setPicker((p) => ({ ...p, [t.name]: e.target.value }))}
                            className="flex-1 rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent">
                      <option value="">أضف موديل…</option>
                      {avail.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button type="button" onClick={() => addModelToType(t.name)}
                            className="rounded-lg border border-accent-line bg-accent-soft px-3 py-1.5 text-[11px] font-bold text-accent">إضافة</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted">الموديلات وألوانها بتتضاف من تبويب «الموديلات».</p>
    </div>
  );
}
