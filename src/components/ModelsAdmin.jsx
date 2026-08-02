import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchSetting } from '../lib/api';
import { saveSetting } from '../lib/adminApi';
import Input from './ui/Input';
import Button from './ui/Button';

export default function ModelsAdmin() {
  const { show } = useToast();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [colorInputs, setColorInputs] = useState({}); // name -> نص لون جديد

  useEffect(() => {
    fetchSetting('device_models')
      .then((v) => setModels(Array.isArray(v) ? v : []))
      .finally(() => setLoading(false));
  }, []);

  async function persist(list) {
    setBusy(true);
    try { await saveSetting('device_models', list); setModels(list); }
    catch (e) { show('❌ ' + (e.message || ''), 'error'); }
    finally { setBusy(false); }
  }

  function addModel() {
    const n = name.trim();
    if (!n || models.some((m) => m.name.toLowerCase() === n.toLowerCase())) return;
    persist([{ name: n, colors: [] }, ...models]);
    setName('');
  }
  function removeModel(n) {
    if (!window.confirm(`حذف موديل «${n}»؟`)) return;
    persist(models.filter((m) => m.name !== n));
  }
  function addColor(n) {
    const c = (colorInputs[n] || '').trim();
    if (!c) return;
    persist(models.map((m) => m.name === n && !m.colors.includes(c) ? { ...m, colors: [...m.colors, c] } : m));
    setColorInputs((p) => ({ ...p, [n]: '' }));
  }
  function removeColor(n, c) {
    persist(models.map((m) => m.name === n ? { ...m, colors: m.colors.filter((x) => x !== c) } : m));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-accent">الموديلات</h1>
        <p className="mt-1 text-sm text-muted">الموديل وألوانه — بتظهر في منسدلة اللون عند إدخال جهاز جديد.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4">
        <p className="mb-2 text-sm font-black text-text">➕ موديل جديد</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && addModel()} placeholder="اسم الموديل (مثلاً Galaxy S24)" className="flex-1" />
          <Button onClick={addModel} loading={busy} disabled={!name.trim()}>إضافة</Button>
        </div>
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <div className="space-y-2">
          {models.map((m) => (
            <div key={m.name} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-black text-text">{m.name}</span>
                <button type="button" onClick={() => removeModel(m.name)}
                        className="rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger">🗑️</button>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {m.colors.length === 0 && <span className="text-[11px] text-muted">مفيش ألوان — بيبقى نص حر عند الإدخال.</span>}
                {m.colors.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-full border border-accent-line bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-accent">
                    {c}<button type="button" onClick={() => removeColor(m.name, c)} className="text-danger">✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={colorInputs[m.name] || ''}
                       onChange={(e) => setColorInputs((p) => ({ ...p, [m.name]: e.target.value }))}
                       onKeyDown={(e) => e.key === 'Enter' && addColor(m.name)}
                       placeholder="أضف لون"
                       className="flex-1 rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent" />
                <button type="button" onClick={() => addColor(m.name)}
                        className="rounded-lg border border-accent-line bg-accent-soft px-3 py-1.5 text-[11px] font-bold text-accent">+ لون</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
