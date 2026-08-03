import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemePanel';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import SiteFooter from '../components/SiteFooter';
import Lightbox from '../components/Lightbox';
import { BADGES } from '../lib/badges';
import { fetchIllustrations } from '../lib/api';

// أنماط بادج الصور حسب النوع (نسخة خفيفة للصفحة العامة — من غير كود أدمن)
const TONE_CLS = {
  bad:  'border-danger/45 bg-danger/20 text-danger',
  good: 'border-[var(--mtc-success)]/50 bg-[var(--mtc-success)]/20 text-[var(--mtc-success)]',
  neutral: 'border-accent-line bg-accent-soft text-accent',
};

// بيقسّم نص الشارة لبلوكات، ويميّز البلوك اللي فيه نقاط (🔸/•)
function parseBody(body) {
  return String(body || '')
    .split('\n\n')
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const isList = lines.every((l) => /^[🔸•]/.test(l)) && lines.length > 1;
      if (isList) {
        return { type: 'list', items: lines.map((l) => l.replace(/^[🔸•]\s*/, '')) };
      }
      return { type: 'p', text: block };
    });
}

export default function BadgeArticle({ badgeKey }) {
  const navigate = useNavigate();
  const { enterGuest } = useAuth();
  const [busy, setBusy] = useState(false);

  const badge = BADGES.find((b) => b.key === badgeKey);
  const [illus, setIllus] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  // جلب الصور التوضيحية للصفحة
  useEffect(() => {
    let alive = true;
    fetchIllustrations(badgeKey)
      .then((rows) => alive && setIllus(rows))
      .catch(() => alive && setIllus([]));
    return () => { alive = false; };
  }, [badgeKey]);

  // مفتاح غير معروف → رجوع للرئيسية
  useEffect(() => {
    if (!badge) navigate('/', { replace: true });
  }, [badge, navigate]);

  useEffect(() => { window.scrollTo(0, 0); }, [badgeKey]);

  if (!badge) return null;

  const blocks = parseBody(badge.body);
  // آخر سطر قصير = اقتباس ختامي بارز
  const last = blocks[blocks.length - 1];
  const hasPullQuote = last?.type === 'p' && last.text.length <= 90 && !last.text.includes('\n');
  const contentBlocks = hasPullQuote ? blocks.slice(0, -1) : blocks;

  const home = () => navigate('/', { replace: true });

  async function seeDevices() {
    setBusy(true);
    await enterGuest();
    navigate('/devices', { replace: true });
  }

  return (
    <div className="relative z-1 mx-auto max-w-3xl px-5">
      {/* ══ شريط علوي ══ */}
      <nav className="flex items-center justify-between py-4">
        <button type="button" onClick={home} aria-label="الرئيسية"
                className="flex select-none items-center gap-2.5 outline-none">
          <span className="grid size-9 place-items-center rounded-xl border-2 border-accent
                           bg-accent-soft text-accent">
            <Icon name="device" size={18} />
          </span>
          <span className="text-xl font-black text-accent">
            i<span className="text-text">Shop</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={home}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-accent-line
                             bg-accent-soft px-3.5 py-2 text-sm font-bold text-accent transition
                             hover:bg-accent hover:text-on-accent active:scale-95">
            <span aria-hidden="true">🏠</span><span>الرئيسية</span>
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* ══ الهيرو ══ */}
      <header className="rise rise-1 relative overflow-hidden rounded-3xl border border-accent-line
                         px-6 py-10 text-center"
              style={{ background: 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-l from-transparent via-accent to-transparent" />
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl border border-accent-line
                         bg-card text-4xl shadow-sm">
          {badge.icon}
        </span>
        <h1 className="text-3xl font-black md:text-4xl">
          <span className="gold-text">{badge.title}</span>
        </h1>
        {badge.tagline && (
          <p className="mx-auto mt-3 max-w-[40ch] text-sm font-bold text-muted">{badge.tagline}</p>
        )}
        <span className="mx-auto mt-5 flex h-1 w-16 rounded-full bg-accent/40" />
      </header>

      {/* ══ المحتوى ══ */}
      <article className="mt-6 space-y-5">
        {contentBlocks.map((blk, i) =>
          blk.type === 'list' ? (
            <ul key={i}
                className={`rise rise-${Math.min(i + 2, 4)} space-y-2.5 rounded-3xl border border-border
                            bg-card p-5`}>
              {blk.items.map((it, j) => (
                <li key={j} className="flex items-start gap-3 text-[15px] leading-relaxed text-text">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full
                                   border border-accent-line bg-accent-soft text-accent">
                    <Icon name="check" size={11} strokeWidth={3} />
                  </span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}
               className={`rise rise-${Math.min(i + 2, 4)} text-[15px] leading-[1.9] text-muted
                          ${i === 0 ? 'text-[17px] font-bold text-text' : ''}`}>
              {blk.text}
            </p>
          )
        )}

        {/* اقتباس ختامي */}
        {hasPullQuote && (
          <blockquote className="rise rise-4 relative rounded-3xl border border-accent-line
                                 bg-accent-soft/50 px-6 py-7 text-center">
            <span className="pointer-events-none absolute start-4 top-2 text-5xl text-accent/25">”</span>
            <p className="gold-text text-xl leading-relaxed font-black">{last.text}</p>
          </blockquote>
        )}
      </article>

      {/* ══ معرض المقارنة ══ */}
      {illus.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-black">شوف الفرق <span className="gold-text">بنفسك</span></h2>
            <p className="mt-1.5 text-xs text-muted">
              صور توضيحية — <span className="font-bold text-danger">أحمر: حالات من خارج APP TECH</span>
              {' · '}
              <span className="font-bold text-[var(--mtc-success)]">أخضر: من APP TECH</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {illus.map((it, i) => (
              <figure key={it.id}
                      onClick={() => setLightbox(i)}
                      style={{ animationDelay: `${i * 0.06}s` }}
                      className="rise group relative cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-square overflow-hidden bg-surface">
                  <img src={it.image_url} alt={it.badge_label || ''} loading="lazy"
                       className="size-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3
                                  bg-gradient-to-t from-black/50 to-transparent" />
                  {/* تلميح التكبير */}
                  <span className="pointer-events-none absolute end-2 bottom-2 grid size-7 place-items-center
                                   rounded-full bg-black/50 text-xs text-white opacity-0 backdrop-blur
                                   transition group-hover:opacity-100">⤢</span>
                  {it.badge_label && (
                    <figcaption className={`absolute start-2 top-2 rounded-full border px-2.5 py-1
                                            text-[10px] font-black backdrop-blur ${TONE_CLS[it.tone] || TONE_CLS.neutral}`}>
                      {it.badge_label}
                    </figcaption>
                  )}
                </div>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ══ الدعوة للتصفّح ══ */}
      <section className="my-8 overflow-hidden rounded-3xl border border-accent-line px-6 py-10 text-center"
               style={{ background: 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
        <h2 className="text-2xl font-black">
          فهمت 👍 <span className="gold-text">يلا نشوف المتاح؟</span>
        </h2>
        <p className="mt-2 text-sm text-muted">كل البيانات قدامك — من غير تسجيل ولا مكالمات</p>
        <Button className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 text-[15px]"
                loading={busy} onClick={seeDevices}>
          <Icon name="bag" size={17} />
          يلا نشوف الأجهزة المتاحة
        </Button>
      </section>

      <SiteFooter />

      {lightbox !== null && (
        <Lightbox
          images={illus.map((x) => x.image_url)}
          index={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
