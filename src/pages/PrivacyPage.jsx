import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemePanel';
import Icon from '../components/ui/Icon';
import SiteFooter from '../components/SiteFooter';
import { fetchContactChannels } from '../lib/api';
import { PRIVACY } from '../lib/policies';

/**
 * V11.30 — صفحة سياسة الخصوصية كـ **راوت عام** له رابط مستقل.
 *
 * ليه؟ Meta بتطلب رابط سياسة خصوصية يفتح لوحده عشان تحوّل تطبيق فيسبوك
 * لوضع Live، والسياسة قبل كده كانت Modal جوّه التطبيق من غير URL.
 *
 * نفس المحتوى بالظبط بتاع `PRIVACY` في `policies.js` — مصدر واحد للحقيقة،
 * فالمودال في الفوتر والصفحة دي بيقروا من نفس المكان.
 *
 * `/data-deletion` بيوصل لنفس الصفحة وبينزّل عند قسم الحذف مباشرةً،
 * عشان يتحط في خانة "Data Deletion Instructions URL" عند Meta.
 */

const DELETE_SECTION = 'حذف بياناتك';

export default function PrivacyPage({ focusDeletion = false }) {
  const navigate = useNavigate();
  const home = () => navigate('/', { replace: true });
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    // القنوات بتتقرا من قاعدة البيانات مش مكتوبة في الكود —
    // الأدمن لو غيّر رقم الدعم، الصفحة دي بتتغيّر معاه.
    fetchContactChannels().then(setChannels).catch(() => setChannels([]));
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!focusDeletion) return;
    // بعد أول رسم — ننزل عند قسم الحذف.
    const t = setTimeout(() => {
      document.getElementById('delete-data')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(t);
  }, [focusDeletion]);

  const support = channels.find((c) => c.is_active && c.whatsapp);

  return (
    <div className="relative z-1 mx-auto max-w-3xl px-5">
      <nav className="flex items-center justify-between py-4">
        <button type="button" onClick={home} aria-label="الرئيسية" className="flex select-none items-center gap-2.5 outline-none">
          <span className="grid size-9 place-items-center rounded-xl border-2 border-accent bg-accent-soft text-accent"><Icon name="device" size={18} /></span>
          <span className="text-xl font-black text-accent">i<span className="text-text">Shop</span></span>
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={home} className="inline-flex items-center gap-1.5 rounded-xl border border-accent-line bg-accent-soft px-3.5 py-2 text-sm font-bold text-accent transition hover:bg-accent hover:text-on-accent active:scale-95"><span>🏠</span><span>الرئيسية</span></button>
          <ThemeToggle />
        </div>
      </nav>

      <header className="rise rise-1 relative overflow-hidden rounded-3xl border border-accent-line" style={{ background: 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
        <span className="absolute inset-x-0 top-0 z-1 h-0.5 bg-gradient-to-l from-transparent via-accent to-transparent" />
        <div className="relative z-1 flex flex-col items-center px-6 py-8 text-center">
          <span className="mb-3 grid size-14 place-items-center rounded-2xl border border-accent-line bg-card text-3xl">{PRIVACY.icon}</span>
          <h1 className="text-3xl font-black leading-tight md:text-4xl">سياسة <span className="gold-text">الخصوصية</span></h1>
          <p className="mt-2 text-xs font-bold text-muted">{PRIVACY.updated}</p>
        </div>
      </header>

      <div className="mt-6 space-y-3">
        {PRIVACY.sections.map((s, i) => {
          const isDelete = s.h === DELETE_SECTION;
          return (
            <section
              key={s.h}
              id={isDelete ? 'delete-data' : undefined}
              style={{ animationDelay: `${i * 0.03}s` }}
              className={`rise scroll-mt-6 rounded-3xl border p-5 ${isDelete ? 'border-accent-line bg-accent-soft/25' : 'border-border bg-card'}`}
            >
              <h2 className={`mb-2 font-black ${isDelete ? 'text-base text-accent' : 'text-sm text-accent'}`}>{s.h}</h2>
              <p className="text-[14px] leading-relaxed text-text">{s.p}</p>

              {isDelete && support && (
                <a
                  href={`https://wa.me/${support.whatsapp}?text=${encodeURIComponent('أرغب في حذف بياناتي من APP TECH')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-black text-on-accent transition hover:brightness-105 active:scale-[.99]"
                >
                  <Icon name="whatsapp" size={16} /> اطلب حذف بياناتك
                </a>
              )}
            </section>
          );
        })}
      </div>

      <SiteFooter />
    </div>
  );
}
