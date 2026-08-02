import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemePanel';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import SiteFooter from '../components/SiteFooter';
import { fetchDevices, deviceImageUrl } from '../lib/api';
import { SERIES_META, deviceSeries, seriesRank } from '../lib/iphoneSeries';

export default function SeriesPage() {
  const navigate = useNavigate();
  const { enterGuest } = useAuth();
  const home = () => navigate('/', { replace: true });

  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchDevices({ guest: true })
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // تجميع الأجهزة حسب السلسلة
  const groups = useMemo(() => {
    if (!rows) return null;
    const map = new Map();
    for (const r of rows) {
      const key = deviceSeries(r.model);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.entries()]
      .map(([key, devices]) => ({ key, devices }))
      .sort((a, b) => seriesRank(b.key) - seriesRank(a.key));
  }, [rows]);

  // ⚠️ الصفحة دي بتجيب الصفوف **الخام** من fetchDevices() مباشرة، مش
  //    من useDevices — يعني الأسماء أسماء الداتابيز: device_code و id،
  //    مش code و sheetRow بتوع normalize(). خلط الاتنين كان بيوجّه
  //    الزائر لـ /d/undefined فتطلعله «الجهاز غير متاح».
  async function openDevice(r) {
    await enterGuest();
    navigate('/d/' + encodeURIComponent(r.device_code || r.id), { replace: true });
  }
  async function browseAll() {
    await enterGuest();
    navigate('/devices', { replace: true });
  }

  return (
    <div className="relative z-1 mx-auto max-w-4xl px-5">
      {/* شريط علوي */}
      <nav className="flex items-center justify-between py-4">
        <button type="button" onClick={home} aria-label="الرئيسية" className="flex select-none items-center gap-2.5 outline-none">
          <span className="grid size-9 place-items-center rounded-xl border-2 border-accent bg-accent-soft text-accent">
            <Icon name="device" size={18} />
          </span>
          <span className="text-xl font-black text-accent">i<span className="text-text">Shop</span></span>
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={home}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-accent-line bg-accent-soft
                             px-3.5 py-2 text-sm font-bold text-accent transition hover:bg-accent hover:text-on-accent active:scale-95">
            <span aria-hidden="true">🏠</span><span>الرئيسية</span>
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* الهيرو */}
      <header className="rise rise-1 relative overflow-hidden rounded-3xl border border-accent-line px-6 py-9 text-center"
              style={{ background: 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-transparent via-accent to-transparent" />
        <span className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl border border-accent-line bg-card text-accent">
          <Icon name="mobile" size={26} />
        </span>
        <h1 className="text-3xl font-black md:text-4xl"><span className="gold-text">سلاسل iPhone</span> المتاحة</h1>
        <p className="mx-auto mt-2 max-w-[42ch] text-sm text-muted">اعرف مميزات كل سلسلة، وشوف الأجهزة المتوفرة منها دلوقتي.</p>
      </header>

      {/* القوائم */}
      <div className="mt-6 space-y-5 pb-4">
        {groups === null ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-surface" />
          ))
        ) : groups.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted">
            مفيش أجهزة iPhone متاحة دلوقتي.
          </div>
        ) : (
          groups.map((g, gi) => <SeriesCard key={g.key} name={g.key} devices={g.devices}
                                            delay={gi * 0.05} onOpen={openDevice} />)
        )}
      </div>

      {/* دعوة للتصفّح */}
      {groups && groups.length > 0 && (
        <div className="mb-10 text-center">
          <Button className="inline-flex items-center gap-2 px-7 py-3" onClick={browseAll}>
            <Icon name="bag" size={16} /> تصفّح كل الأجهزة المتاحة
          </Button>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

function SeriesCard({ name, devices, delay, onOpen }) {
  const meta = SERIES_META[name];
  return (
    <section style={{ animationDelay: `${delay}s` }}
             className="rise overflow-hidden rounded-3xl border border-border bg-card">
      {/* رأس السلسلة */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"
           style={{ background: 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black text-text" dir="ltr" style={{ textAlign: 'right' }}>{name}</h2>
          {meta && <span className="text-[11px] font-bold text-muted">سنة الإصدار: <span className="num">{meta.year}</span></span>}
        </div>
        <span className="shrink-0 rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-[11px] font-black text-accent">
          <span className="num">{devices.length}</span> متاح
        </span>
      </div>

      {/* المواصفات */}
      {meta && (
        <div className="grid grid-cols-2 gap-2 px-5 pt-4 sm:grid-cols-3">
          <Spec icon="repair" label="المعالج" value={meta.chip} />
          <Spec icon="device" label="الرام" value={meta.ram} />
          <Spec icon="check" label="مميز بـ" value={meta.highlight} wide />
        </div>
      )}

      {/* الأجهزة المتاحة */}
      <div className="px-5 pb-5 pt-4">
        <p className="mb-2 text-[11px] font-black text-muted">الأجهزة المتاحة</p>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {devices.map((r) => (
            <button key={r.id} type="button" onClick={() => onOpen(r)}
                    className="group w-32 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface text-start transition hover:border-accent-line active:scale-95">
              <div className="relative aspect-square bg-card">
                {r.images?.[0] ? (
                  <img src={deviceImageUrl(r.images[0])} alt="" loading="lazy"
                       className="size-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="grid size-full place-items-center text-muted"><Icon name="mobile" size={26} /></div>
                )}
                {r.device_code && (
                  <span className="absolute end-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-black text-white num">#{r.device_code}</span>
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-[11px] font-black text-text">{r.model}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {r.storage || ''}{r.battery ? ` · ${r.battery}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Spec({ icon, label, value, wide }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface/50 px-3 py-2.5 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-muted">
        <Icon name={icon} size={12} /> {label}
      </span>
      <p className="text-[12px] font-bold leading-snug text-text">{value}</p>
    </div>
  );
}
