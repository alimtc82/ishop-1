import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemePanel';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import SiteFooter from '../components/SiteFooter';
import SupportModal from '../components/SupportModal';
import { BADGES } from '../lib/badges';
import { deviceSeries } from '../lib/iphoneSeries';
import { SkeletonCard } from '../components/ui/Skeleton';
import { fetchDevices, deviceImageUrl } from '../lib/api';
import { formatBattery, batteryNum } from '../utils/format';
import { brandIcon, getBrand, isIphone } from '../lib/brands';

// ══ صفحة معرض الأجهزة المستعملة ═══════════════════════════════
// صفحة مستقلة (route: /used) بترجع بالكامل زي ما كانت الرئيسية
// قبل V11.49، بس دلوقتي كصفحة فرعية جوه متجر APP TECH. الدخول السري
// للموظفين اتنقل لهوم المتجر — فاللوجو هنا بيرجّع للمتجر عادي.
// ══ نظرة على المخزون — بيانات حقيقية ═════════════════════════
function useStock() {
  const [state, setState] = useState({ loading: true, count: 0, latest: [], records: [] });

  useEffect(() => {
    let alive = true;
    fetchDevices({ guest: true })
      .then((rows) => {
        if (!alive) return;
        setState({ loading: false, count: rows.length, latest: rows.slice(0, 4), records: rows });
      })
      .catch(() => alive && setState({ loading: false, count: 0, latest: [], records: [] }));
    return () => { alive = false; };
  }, []);

  return state;
}

const BAT_COLOR = (n) => (n >= 80 ? '#2ecc71' : n >= 60 ? '#f5c842' : '#e74c3c');

function TeaserCard({ r, onClick, delay = 0 }) {
  const img = r.images?.[0] ? deviceImageUrl(r.images[0]) : null;
  const iphone = isIphone(r);
  const bat = formatBattery(r.battery);
  const n = batteryNum(bat);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
      className="rise group relative flex flex-col overflow-hidden rounded-3xl border border-border
                 bg-card text-start transition-all duration-300 hover:-translate-y-1.5
                 hover:border-accent hover:shadow-[0_18px_40px_-18px_var(--focus-ring)]"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-surface">
        {img ? (
          <img src={img} alt={r.model} loading="lazy"
               className="size-full object-cover transition duration-500 group-hover:scale-110" />
        ) : (
          <div className="grid size-full place-items-center text-5xl opacity-40">
            {brandIcon(getBrand(r), r.model)}
          </div>
        )}

        {/* تدرّج سفلي لإبراز الاسم فوق الصورة */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5
                        bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        {/* كود الجهاز */}
        {r.device_code && (
          <span className="num absolute top-2.5 start-2.5 rounded-lg bg-black/55 px-2 py-0.5
                           text-[10px] font-black text-gold backdrop-blur-sm">
            #{r.device_code}
          </span>
        )}

        {/* شارة الضمان */}
        {r.warranty === 'ساري' && (
          <span className="absolute top-2.5 end-2.5 inline-flex items-center gap-1 rounded-lg
                           bg-[var(--mtc-success)]/90 px-2 py-0.5 text-[10px] font-black text-white
                           backdrop-blur-sm">
            <Icon name="warranty" size={11} /> ضمان
          </span>
        )}

        {/* الاسم فوق الصورة */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="truncate text-sm font-black text-white drop-shadow">{r.model}</h3>
          <p className="truncate text-[11px] text-white/70">
            <span className="num">{r.storage}</span>{r.color && r.color !== '-' ? ` · ${r.color}` : ''}
          </p>
        </div>
      </div>

      {/* الشريط السفلي: البطارية (iPhone بس) + دعوة */}
      <div className={`flex items-center px-3.5 py-2.5 ${iphone ? 'justify-between' : 'justify-end'}`}>
        {iphone && (
          <span className="num inline-flex items-center gap-1.5 text-xs font-bold"
                style={{ color: n ? BAT_COLOR(n) : 'var(--muted)' }}>
            <Icon name="battery" size={15} /> {bat}
          </span>
        )}
        <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-accent
                         opacity-0 transition group-hover:opacity-100">
          التفاصيل <Icon name="chevron" size={13} />
        </span>
      </div>
    </button>
  );
}

const FEATURES = [
  { icon: 'warranty', title: 'الضمان وما بعد البيع',   desc: 'ضمان 30 يوم على كل جهاز + دعم بعد الشراء. اضغط لمتابعة ضمانك.', action: 'warranty' },
  { icon: 'headphones', title: 'دعم فني متخصص', desc: 'خدمة ما بعد البيع — إحنا معاك بعد ما تشتري.', action: 'support' },
  { icon: 'award', title: 'الآراء وتقييمات العملاء',  desc: 'شوف تجارب عملائنا وشاركنا رأيك. اضغط لعرض التقييمات.', action: 'reviews' },
];

const STATS = [
  { icon: 'device', label: 'جهاز متاح', key: 'count', action: 'devices' },
  { emoji: '🍎', label: 'سلاسل iPhone', key: 'series', action: 'series' },
  { emoji: '🤖', label: 'أندرويد', key: 'android', action: 'android' },
];

export default function UsedShowcase() {
  const { enterGuest } = useAuth();
  const navigate = useNavigate();
  const { loading, count, latest, records } = useStock();
  const seriesCount = useMemo(
    () => new Set((records || []).map((r) => deviceSeries(r.model)).filter(Boolean)).size,
    [records]
  );
  const androidCount = useMemo(
    () => (records || []).filter((r) => getBrand(r) !== 'iPhone').length,
    [records]
  );
  const [busy, setBusy] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  async function browse() {
    setBusy(true);
    await enterGuest();
  }

  return (
    <div className="relative z-1 mx-auto max-w-5xl px-5">
      {/* ══ الشريط ══ */}
      <nav className="flex items-center justify-between py-4">
        <button type="button" onClick={() => navigate('/')} aria-label="متجر APP TECH"
                className="flex select-none items-center gap-2.5 outline-none">
          <span className="grid size-9 place-items-center rounded-xl border-2 border-accent
                           bg-accent-soft text-accent">
            <Icon name="device" size={18} />
          </span>
          <span className="text-start leading-none">
            <span className="block text-xl font-black text-accent">
              i<span className="text-text">Shop</span>
            </span>
            <span className="mt-0.5 block text-[8px] font-bold tracking-[0.22em] text-muted">
              MTC GROUP
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card
                       px-3.5 py-2 text-xs font-black text-text transition
                       hover:border-accent-line hover:text-accent active:scale-95"
          >
            <Icon name="chevron" size={14} /> المتجر
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* ══ الهيرو ══ */}
      <section className="grid gap-6 py-4 md:grid-cols-2 md:items-center md:gap-10 md:py-12">
        <div className="md:order-1">
          {!loading && count > 0 && (
            <span className="rise rise-1 mb-4 inline-flex items-center gap-2 rounded-full border
                             border-accent-line bg-accent-soft px-3.5 py-1.5 text-[11px]
                             font-black text-accent">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full
                                 bg-[var(--mtc-success)] opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[var(--mtc-success)]" />
              </span>
              <span className="num">{count}</span> جهاز متاح الآن
            </span>
          )}

          <h1 className="rise rise-1 text-[40px] leading-[1.1] font-black tracking-tight md:text-[56px]">
            <span className="gold-text">معرض الأجهزة</span>
            <br />
            المستعملة
          </h1>

          <p className="rise rise-2 mt-4 max-w-[44ch] text-[15px] leading-relaxed text-muted">
            أجهزة مختارة بعناية، بحالة ممتازة وأسعار تنافسية. كل جهاز بحالته
            وبطاريته وضمانه — قدامك بالتفصيل قبل ما تقرر.
          </p>

          <div className="rise rise-3 mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="w-full py-3.5 text-[15px] sm:w-auto sm:px-8"
                    loading={busy} onClick={browse}>
              <Icon name="bag" size={17} />
              تصفّح الأجهزة المتاحة
            </Button>
            <button type="button" onClick={() => setSupportOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border
                               border-border bg-card px-6 py-3.5 text-[15px] font-black text-text
                               transition hover:border-accent-line hover:text-accent sm:w-auto">
              <Icon name="headphones" size={17} /> تواصل معنا
            </button>
          </div>

          <div className="rise rise-4 mt-5 grid grid-cols-2 gap-2">
            {BADGES.map((b, i) => (
              <button
                key={b.key}
                type="button"
                onClick={() => navigate('/why/' + b.key)}
                className={`group flex w-full items-center justify-center gap-1.5 rounded-full border border-border
                           bg-surface px-3 py-1.5 text-[11px] font-bold whitespace-nowrap
                           text-muted transition hover:border-accent-line hover:text-accent
                           ${BADGES.length % 2 === 1 && i === BADGES.length - 1 ? 'col-span-2' : ''}`}
              >
                <Icon name="check" size={11} className="text-[var(--mtc-success)]" strokeWidth={3} />
                {b.title}
                <Icon name="info" size={10} className="opacity-40 transition group-hover:opacity-70" />
              </button>
            ))}
          </div>
        </div>

        <div className="rise rise-2 relative mx-auto w-full max-w-[320px] md:order-2 md:max-w-none">
          <div className="absolute inset-[-14%] -z-1 rounded-full blur-3xl"
               style={{ background: 'radial-gradient(circle, var(--accent-soft), transparent 62%)' }} />
          <img src="/hero.jpg" alt="أجهزة APP TECH — موبايلات وساعات ولابتوبات"
               width="807" height="860"
               className="float-slow w-full rounded-3xl" fetchPriority="high" />
        </div>
      </section>

      {/* ══ الأرقام — بطاقات مميزة ══ */}
      <div className="grid grid-cols-3 gap-3">
        {STATS.map((s, i) => {
          const val = s.key === 'count' ? (loading ? '—' : count)
            : s.key === 'series' ? (loading ? '—' : seriesCount)
            : s.key === 'android' ? (loading ? '—' : androidCount)
            : s.value;
          const onClick = s.action === 'devices' ? browse
            : s.action === 'series' ? () => navigate('/series')
            : s.action === 'android' ? () => navigate('/android')
            : undefined;
          const Comp = onClick ? 'button' : 'div';
          return (
            <Comp key={s.label} type={onClick ? 'button' : undefined} onClick={onClick}
                  className={`rise rise-${i + 1} group relative overflow-hidden rounded-3xl border p-4 text-center transition ${
                    onClick
                      ? 'cursor-pointer border-accent-line bg-accent-soft/30 hover:bg-accent-soft hover:shadow-lg active:scale-95'
                      : 'border-border bg-card hover:border-accent-line'
                  }`}>
              <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-transparent via-accent to-transparent
                               opacity-0 transition group-hover:opacity-100" />
              <span className="mx-auto mb-2 grid size-10 place-items-center rounded-xl border border-accent-line
                               bg-accent-soft text-accent">
                {s.emoji ? <span className="text-lg leading-none">{s.emoji}</span> : <Icon name={s.icon} size={19} />}
              </span>
              <b className="num block text-2xl font-black text-accent">{val}</b>
              <span className="text-[11px] font-bold text-muted">
                {s.label}
                {onClick && <span className="ms-1 text-accent">←</span>}
              </span>
            </Comp>
          );
        })}
      </div>

      {/* ══ وصل حديثًا ══ */}
      <section className="py-10">
        <div className="mb-5 flex items-baseline justify-between">
          <div>
            <h2 className="text-2xl font-black">وصل حديثًا</h2>
            <p className="mt-1 text-xs text-muted">أحدث الأجهزة المضافة للمخزون</p>
          </div>
          <button type="button" onClick={browse}
                  className="inline-flex items-center gap-1 text-xs font-black text-accent transition hover:opacity-70">
            شوف الكل <Icon name="chevron" size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : latest.map((r, i) => <TeaserCard key={r.id} r={r} onClick={browse} delay={i * 0.08} />)}
        </div>
      </section>

      {/* ══ المميزات ══ */}
      <section className="grid gap-3.5 border-t border-border py-10 md:grid-cols-3">
        {FEATURES.map((f, i) => {
          const inner = (
            <>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl
                               border border-accent-line bg-accent-soft text-accent
                               transition group-hover:scale-110">
                <Icon name={f.icon} size={22} />
              </span>
              <div>
                <h3 className="text-sm font-black text-text">
                  {f.title}
                  {f.action && <span className="ms-1.5 text-[10px] text-accent">← اضغط</span>}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{f.desc}</p>
              </div>
            </>
          );

          if (f.action === 'warranty' || f.action === 'reviews') {
            return (
              <button
                key={f.title}
                type="button"
                onClick={() => navigate('/' + f.action)}
                style={{ animationDelay: `${i * 0.1}s` }}
                className="rise group flex items-start gap-3.5 rounded-2xl border border-accent-line bg-accent-soft/40 p-4 text-start
                           transition hover:bg-accent-soft hover:shadow-lg"
              >
                {inner}
              </button>
            );
          }

          return f.action === 'support' ? (
            <button
              key={f.title}
              type="button"
              onClick={() => setSupportOpen(true)}
              style={{ animationDelay: `${i * 0.1}s` }}
              className="rise group flex items-start gap-3.5 rounded-2xl border border-accent-line bg-accent-soft/40 p-4 text-start
                         transition hover:bg-accent-soft hover:shadow-lg"
            >
              {inner}
            </button>
          ) : (
            <div key={f.title}
                 style={{ animationDelay: `${i * 0.1}s` }}
                 className="rise group flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4
                            transition hover:border-accent-line">
              {inner}
            </div>
          );
        })}
      </section>

      {/* ══ الختام ══ */}
      <section className="my-4 overflow-hidden rounded-3xl border border-accent-line px-6 py-12 text-center"
               style={{ background: 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
        <h2 className="text-3xl font-black">
          جاهز تشوف <span className="gold-text">المتاح؟</span>
        </h2>
        <p className="mt-2.5 text-sm text-muted">كل البيانات قدامك — من غير تسجيل ولا مكالمات</p>
        <Button className="mt-6 inline-flex items-center gap-2 px-10 py-3.5 text-[15px]" loading={busy} onClick={browse}>
          <Icon name="bag" size={17} />
          تصفّح الأجهزة
        </Button>
      </section>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />

      <SiteFooter />

    </div>
  );
}
