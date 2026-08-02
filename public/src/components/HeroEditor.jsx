import { useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchSetting, uploadIllustration } from '../lib/api';
import { saveSetting } from '../lib/adminApi';
import Input from './ui/Input';
import Button from './ui/Button';

const POS = [
  { key: 'top', label: 'أعلى' },
  { key: 'center', label: 'الوسط' },
  { key: 'bottom', label: 'أسفل' },
];

// محرّر كارت (هيرو) عام — يُستخدم لصفحة الضمان والتقييمات
// props: settingKey, uploadKey, heading, description, defaultTitle
export default function HeroEditor({ settingKey, uploadKey, heading, description, defaultTitle }) {
  const { show } = useToast();
  const [bg, setBg] = useState('');
  const [title, setTitle] = useState('');
  const [pos, setPos] = useState('center');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchSetting(settingKey)
      .then((v) => { setBg(v?.bg || ''); setTitle(v?.title || ''); setPos(v?.pos || 'center'); })
      .finally(() => setLoading(false));
  }, [settingKey]);

  async function onPickBg(e) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setBusy(true);
    try {
      show('⏳ جاري رفع الخلفية...', 'info');
      const url = await uploadIllustration(file, uploadKey || settingKey);
      setBg(url);
      show('✅ اترفعت — اضغط حفظ للتثبيت');
    } catch (e) {
      show('❌ فشل الرفع: ' + (e.message || ''), 'error');
    } finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    try {
      await saveSetting(settingKey, { bg: bg || null, title: title.trim(), pos });
      show('✅ اتحفظ');
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="h-40 animate-pulse rounded-3xl bg-surface" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-accent">{heading}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-accent-line"
           style={{ minHeight: 190, background: bg ? `#000 url(${bg}) center/cover` : 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
        {bg && <div className="absolute inset-0 bg-black/45" />}
        <div className={`relative flex min-h-[190px] flex-col px-6 py-6 text-center ${
          pos === 'top' ? 'justify-start' : pos === 'bottom' ? 'justify-end' : 'justify-center'
        }`}>
          <h2 className={`text-3xl font-black leading-tight md:text-4xl ${bg ? 'text-white drop-shadow' : 'text-text'}`}>
            {(title || defaultTitle)}
          </h2>
        </div>
      </div>

      <Input label="نص الكارت" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defaultTitle} />

      <div>
        <label className="mb-1.5 block text-xs font-bold text-muted">مكان النص</label>
        <div className="flex gap-2">
          {POS.map((p) => (
            <button key={p.key} type="button" onClick={() => setPos(p.key)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      pos === p.key ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-muted'
                    }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold text-muted">صورة الخلفية</label>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickBg} disabled={busy}
                 className="text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-xs file:font-bold file:text-accent" />
          {bg && (
            <button type="button" onClick={() => setBg('')}
                    className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-1.5 text-[11px] font-bold text-danger">
              إزالة الخلفية
            </button>
          )}
        </div>
      </div>

      <Button loading={busy} onClick={save} className="w-full">💾 حفظ</Button>
    </div>
  );
}
