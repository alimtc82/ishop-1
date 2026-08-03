import { useEffect, useRef, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchIllustrations, uploadIllustration } from '../lib/api';
import { createIllustration, updateIllustration, deleteIllustration } from '../lib/adminApi';
import { BADGES } from '../lib/badges';
import Input from './ui/Input';

// أنماط البادج حسب النوع — مشتركة مع الصفحة العامة
export const TONE = {
  bad:  { def: 'من خارج APP TECH', cls: 'border-danger/40 bg-danger/15 text-danger' },
  good: { def: 'من APP TECH',      cls: 'border-[var(--mtc-success)]/45 bg-[var(--mtc-success)]/18 text-[var(--mtc-success)]' },
  neutral: { def: '',           cls: 'border-accent-line bg-accent-soft text-accent' },
};
const TONE_ORDER = ['bad', 'good', 'neutral'];
const TONE_NAME = { bad: '❌ مشكلة (خارج APP TECH)', good: '✅ سليمة (APP TECH)', neutral: '⭐ مخصص' };

export default function Illustrations() {
  const { show } = useToast();
  const [key, setKey] = useState(BADGES[0]?.key ?? 'refurb');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tone, setTone] = useState('bad');
  const [label, setLabel] = useState(TONE.bad.def);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await fetchIllustrations(key));
    } catch (e) {
      show('❌ فشل التحميل: ' + (e.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [key]);

  function chooseTone(t) {
    setTone(t);
    // نملأ البادج بالافتراضي طالما المستخدم مغيّرهوش لحاجة مخصصة
    if (!label || TONE_ORDER.some((x) => TONE[x].def === label)) setLabel(TONE[t].def);
  }

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setUploading(true);
    try {
      show('⏳ جاري رفع الصورة...', 'info');
      const url = await uploadIllustration(file, key);
      await createIllustration({
        badge_key: key,
        image_url: url,
        badge_label: (label || TONE[tone].def || '').trim(),
        tone,
        sort: items.length,
      });
      show('✅ اتضافت الصورة');
      load();
    } catch (e) {
      show('❌ فشل الرفع: ' + (e.message || ''), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function saveLabel(item, value) {
    if (value === item.badge_label) return;
    try {
      await updateIllustration(item.id, { badge_label: value });
      setItems((p) => p.map((x) => (x.id === item.id ? { ...x, badge_label: value } : x)));
    } catch (e) { show('❌ ' + (e.message || ''), 'error'); }
  }

  async function cycleTone(item) {
    const next = TONE_ORDER[(TONE_ORDER.indexOf(item.tone) + 1) % TONE_ORDER.length];
    try {
      await updateIllustration(item.id, { tone: next });
      setItems((p) => p.map((x) => (x.id === item.id ? { ...x, tone: next } : x)));
    } catch (e) { show('❌ ' + (e.message || ''), 'error'); }
  }

  async function remove(item) {
    if (!window.confirm('حذف الصورة نهائيًا؟')) return;
    try {
      await deleteIllustration(item.id, item.image_url);
      show('🗑️ اتحذفت');
      setItems((p) => p.filter((x) => x.id !== item.id));
    } catch (e) { show('❌ ' + (e.message || ''), 'error'); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-accent">الصور التوضيحية</h1>
        <p className="mt-1 text-sm text-muted">صور المقارنة اللي بتظهر في صفحات «ليه APP TECH». كل صورة عليها بادج.</p>
      </div>

      {/* اختيار الصفحة */}
      <div className="flex flex-wrap gap-2">
        {BADGES.map((b) => (
          <button key={b.key} type="button" onClick={() => setKey(b.key)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                    key === b.key
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-border bg-surface text-muted hover:border-accent-line hover:text-accent'
                  }`}>
            {b.icon} {b.title}
          </button>
        ))}
      </div>

      {/* رفع صورة جديدة */}
      <div className="rounded-3xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-black text-text">➕ إضافة صورة</p>

        <div className="flex flex-wrap gap-2">
          {TONE_ORDER.map((t) => (
            <button key={t} type="button" onClick={() => chooseTone(t)}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                      tone === t ? TONE[t].cls : 'border-border bg-surface text-muted'
                    }`}>
              {TONE_NAME[t]}
            </button>
          ))}
        </div>

        <Input label="نص البادج على الصورة" value={label}
               onChange={(e) => setLabel(e.target.value)}
               placeholder={tone === 'neutral' ? 'اكتب البادج المخصص' : TONE[tone].def} />

        <input ref={fileRef} type="file" accept="image/*" onChange={onPick} disabled={uploading}
               className="text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-xs file:font-bold file:text-accent" />
        {uploading && <p className="text-[11px] font-bold text-accent">⏳ جاري الرفع...</p>}
      </div>

      {/* الصور الحالية */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/40 p-5 text-center text-sm text-muted">
          مفيش صور للصفحة دي لسه.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative aspect-square bg-surface">
                <img src={it.image_url} alt="" className="size-full object-cover" />
                {it.badge_label && (
                  <span className={`absolute start-2 top-2 rounded-full border px-2.5 py-1 text-[10px] font-black backdrop-blur ${TONE[it.tone]?.cls || TONE.neutral.cls}`}>
                    {it.badge_label}
                  </span>
                )}
              </div>
              <div className="space-y-2 p-2.5">
                <input
                  defaultValue={it.badge_label}
                  onBlur={(e) => saveLabel(it, e.target.value.trim())}
                  placeholder="نص البادج"
                  className="w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-[11px] text-text outline-none focus:border-accent"
                />
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => cycleTone(it)}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold ${TONE[it.tone]?.cls || TONE.neutral.cls}`}>
                    {TONE_NAME[it.tone]}
                  </button>
                  <button type="button" onClick={() => remove(it)}
                          className="rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1.5 text-[11px] font-bold text-danger transition hover:bg-danger/25">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
