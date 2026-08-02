import { useEffect, useState } from 'react';
import { fetchSetting } from '../lib/api';
import { saveSetting } from '../lib/adminApi';
import { useToast } from '../context/ToastContext';
import { NewsTickerView } from './ui/NewsTicker';

// ══════════════════════════════════════════════════════════════
//  NewsTickerAdmin — إعدادات شريط الأخبار (V13.7.4)
//  يخزّن في site_settings تحت المفتاح news_ticker:
//  { enabled, text, speed, direction }
// ══════════════════════════════════════════════════════════════

const DEFAULTS = { enabled: false, text: '', speed: 5, direction: 'rtl' };

const inputCls =
  'w-full rounded-xl border border-border bg-input px-3.5 py-3 text-sm text-text ' +
  'outline-none transition placeholder:text-muted leading-8 ' +
  'focus:border-accent focus:ring-3 focus:ring-[var(--focus-ring)]';

export default function NewsTickerAdmin() {
  const { show } = useToast();
  const [cfg, setCfg] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSetting('news_ticker')
      .then((v) => {
        if (!alive) return;
        const val = typeof v === 'string' ? safeParse(v) : v;
        setCfg({ ...DEFAULTS, ...(val || {}) });
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));

  async function save() {
    setSaving(true);
    try {
      await saveSetting('news_ticker', {
        enabled: !!cfg.enabled,
        text: String(cfg.text || '').trim(),
        speed: Number(cfg.speed) || 5,
        direction: cfg.direction === 'ltr' ? 'ltr' : 'rtl',
      });
      show('✅ تم حفظ شريط الأخبار — هيظهر لكل الزوار');
    } catch (e) {
      show('❌ ' + (e.message || 'فشل الحفظ'), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">جاري التحميل…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-black">📢 شريط الأخبار المتحرك</h2>
        <p className="mt-1 text-xs text-muted">
          النص بيظهر متحرك أعلى الصفحة الرئيسية لكل الزوار. كل خبر في سطر. للرابط اكتب:
          <span dir="ltr" className="mx-1 rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-accent">[الكلام](https://الرابط)</span>
          — يظهر أزرق ويفتح في تبويب جديد.
        </p>
      </div>

      {/* معاينة حيّة */}
      <div className="overflow-hidden rounded-2xl border border-accent-line" style={{ background: 'linear-gradient(90deg, var(--accent-soft), transparent)' }}>
        <div className="flex items-stretch" style={{ direction: 'rtl' }}>
          <div className="flex shrink-0 items-center gap-1.5 px-3.5 text-[12px] font-black text-on-accent" style={{ background: 'var(--accent)' }}>
            <span className="inline-block size-2 animate-pulse rounded-full" style={{ background: '#c0392b' }} /> عاجل
          </div>
          {String(cfg.text || '').trim()
            ? <NewsTickerView text={cfg.text} speed={cfg.speed} direction={cfg.direction} />
            : <div className="flex-1 px-4 py-3 text-xs text-muted">اكتب النص تحت وشوف المعاينة هنا…</div>}
        </div>
      </div>
      <p className="-mt-2 text-center text-[11px] text-muted">↑ معاينة حيّة — بتتحرك زي ما هتظهر بالظبط</p>

      {/* النص */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <label className="mb-2 block text-xs font-bold text-muted">النص الإعلامي (كل خبر في سطر)</label>
        <textarea
          className={inputCls}
          rows={5}
          dir="rtl"
          value={cfg.text}
          onChange={(e) => set({ text: e.target.value })}
          placeholder={'🎉 خصم 15% على الإكسسوارات — [اطلب الآن](https://ishop-1.vercel.app)\n📱 وصل آيفون 17 برو ماكس'}
        />

        {/* تفعيل */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div><div className="text-sm font-bold">تفعيل الشريط</div><div className="text-[11px] text-muted">إظهار/إخفاء من الصفحة الرئيسية</div></div>
          <button
            type="button"
            role="switch"
            aria-checked={cfg.enabled}
            onClick={() => set({ enabled: !cfg.enabled })}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition ${cfg.enabled ? 'border-accent-line bg-accent-soft' : 'border-border bg-surface'}`}
          >
            <span className={`absolute top-0.5 size-5 rounded-full transition-all ${cfg.enabled ? 'start-0.5 bg-accent' : 'end-0.5 bg-muted'}`} />
          </button>
        </div>

        {/* السرعة */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div><div className="text-sm font-bold">السرعة</div><div className="text-[11px] text-muted">أبطأ ← → أسرع (مستقلة عن الاستمرار)</div></div>
          <input type="range" min="1" max="10" value={cfg.speed}
                 onChange={(e) => set({ speed: Number(e.target.value) })}
                 className="w-40" style={{ accentColor: 'var(--accent)' }} />
        </div>

        {/* الاتجاه */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div><div className="text-sm font-bold">اتجاه الحركة</div><div className="text-[11px] text-muted">RTL طبيعي للعربي</div></div>
          <div className="flex overflow-hidden rounded-xl border border-border">
            {[['rtl', 'يمين ← شمال'], ['ltr', 'شمال → يمين']].map(([d, lbl]) => (
              <button key={d} type="button" onClick={() => set({ direction: d })}
                      className={`px-3 py-2 text-[12px] font-black ${cfg.direction === d ? 'bg-accent text-on-accent' : 'text-muted'}`}>{lbl}</button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-black text-on-accent disabled:opacity-60"
        >
          {saving ? 'جاري الحفظ…' : 'حفظ ونشر'}
        </button>
      </div>
    </div>
  );
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
