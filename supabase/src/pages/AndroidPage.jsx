import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemePanel';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import SiteFooter from '../components/SiteFooter';
import { fetchDevices, deviceImageUrl } from '../lib/api';
import { getBrand, brandIcon } from '../lib/brands';

// ما يميّز أندرويد
const PERKS = [
  'تنوّع هائل: ماركات وموديلات وأسعار تناسب كل ميزانية.',
  'تخصيص كامل للواجهة والويدجت والتطبيقات الافتراضية بحرية.',
  'ذاكرة قابلة للتوسعة (كروت SD) في كتير من الأجهزة.',
  'شحن سريع جدًا ومواصفات بطارية عالية.',
  'تعدد المهام: تقسيم الشاشة والنوافذ المنبثقة.',
  'مرونة في الملفات والمشاركة وتكامل مع خدمات Google.',
];

export default function AndroidPage() {
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

  // تجميع غير الآيفون حسب الماركة
  const groups = useMemo(() => {
    if (!rows) return null;
    const map = new Map();
    for (const r of rows) {
      const brand = getBrand(r);
      if (brand === 'iPhone') continue;
      const key = brand || 'أخرى';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.entries()]
      .map(([brand, devices]) => ({ brand, devices }))
      .sort((a, b) => b.devices.length - a.devices.length);
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
        <span className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl border border-accent-line bg-card text-3xl">🤖</span>
        <h1 className="text-3xl font-black md:text-4xl">عالم <span className="gold-text">أندرويد</span></h1>
        <p className="mx-auto mt-2 max-w-[42ch] text-sm font-bold text-muted">حريّة أوسع، خيارات أكتر، وأجهزة لكل ذوق وميزانية.</p>
      </header>

      {/* ما يميّز أندرويد */}
      <section className="rise rise-2 mt-6 rounded-3xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-accent">
          ✨ ما يميّز أندرويد عن iPhone
        </h2>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {PERKS.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-text">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-accent-line bg-accent-soft text-accent">
                <Icon name="check" size={11} strokeWidth={3} />
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* الأجهزة حسب الماركة */}
      <div className="mt-6 space-y-5 pb-4">
        {groups === null ? (
          Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-surface" />)
        ) : groups.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted">
            مفيش أجهزة أندرويد متاحة دلوقتي.
          </div>
        ) : (
          groups.map((g, gi) => (
            <section key={g.brand} style={{ animationDelay: `${gi * 0.05}s` }}
                     className="rise overflow-hidden rounded-3xl border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"
                   style={{ background: 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
                <h2 className="flex items-center gap-2 text-xl font-black text-text">
                  <span>{brandIcon(g.brand, g.devices[0]?.model)}</span> {g.brand}
                </h2>
                <span className="shrink-0 rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-[11px] font-black text-accent">
                  <span className="num">{g.devices.length}</span> متاح
                </span>
              </div>
              <div className="px-5 py-4">
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {g.devices.map((r) => (
                    <button key={r.id} type="button" onClick={() => openDevice(r)}
                            className="group w-32 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface text-start transition hover:border-accent-line active:scale-95">
                      <div className="relative aspect-square bg-card">
                        {r.images?.[0] ? (
                          <img src={deviceImageUrl(r.images[0])} alt="" loading="lazy"
                               className="size-full object-cover transition group-hover:scale-105" />
                        ) : (
                          <div className="grid size-full place-items-center text-muted"><Icon name="device" size={26} /></div>
                        )}
                        {r.device_code && (
                          <span className="absolute end-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-black text-white num">#{r.device_code}</span>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="truncate text-[11px] font-black text-text">{r.model}</p>
                        <p className="mt-0.5 text-[10px] text-muted">{r.storage || ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ))
        )}
      </div>

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
