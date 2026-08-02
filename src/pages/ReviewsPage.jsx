import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { ThemeToggle } from '../components/ThemePanel';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import SiteFooter from '../components/SiteFooter';
import { fetchReviews, submitReview, fetchSetting, signInCustomerWithFacebook, getCustomerSession, signOutCustomer, fetchOwnReviews, deleteOwnReview } from '../lib/api';
import { isCustomerSession } from '../lib/customerSession';
import { supabase } from '../lib/supabase';

const DEFAULT_TITLE = 'آراء وتقييمات عملائنا';

export default function ReviewsPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const home = () => navigate('/', { replace: true });
  const [hero, setHero] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [branches, setBranches] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [authBusy, setAuthBusy] = useState(true);
  const [branch, setBranch] = useState('');
  const [guestName, setGuestName] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [ownReviewIds, setOwnReviewIds] = useState(new Set());
  const [lastReview, setLastReview] = useState(null);
  const [deletingReview, setDeletingReview] = useState(null);
  // رسالة الرجعة من فيسبوك تتقال مرة واحدة بس (StrictMode بيشغّل الـ effect مرتين)
  const announced = useRef(false);

  useEffect(() => {
    fetchSetting('reviews_hero').then((v) => setHero(v || {}));
    fetchSetting('branches').then((v) => setBranches(Array.isArray(v) ? v : []));
    fetchSetting('reviews_require_approval').then((v) => setRequireApproval(v !== false));
    fetchReviews().then(setReviews).catch(() => setReviews([]));

    // V11.29: الرجعة من فيسبوك بتيجي على /reviews?oauth=facebook&code=...
    // بنقرا الفلاج قبل ما ننضّف الرابط، عشان نعرف نقول رسالة النتيجة.
    const returning = new URLSearchParams(window.location.search).get('oauth') === 'facebook';
    const cleanUrl = () => window.history.replaceState({}, '', '/reviews');

    // V11.25: resolve any completed Facebook OAuth session on page load.
    // The review form itself remains available to guests at all times.
    const resolve = () => getCustomerSession()
      .then((x) => {
        const c = x?.customer || null;
        setCustomer(c);
        if (c?.id) fetchOwnReviews(c.id).then((rows) => setOwnReviewIds(new Set(rows.map((r) => r.id)))).catch(() => setOwnReviewIds(new Set()));
        else setOwnReviewIds(new Set());
        if (!returning || announced.current) return;
        announced.current = true;
        cleanUrl();
        if (c) show(`✅ تم تسجيل دخولك — أهلاً ${c.display_name}`, 'success');
        else show('❌ ما قدرناش نكمّل الدخول بفيسبوك — جرّب تاني', 'error');
      })
      .catch((e) => {
        setCustomer(null);
        if (!returning || announced.current) return;
        announced.current = true;
        cleanUrl();
        // كان بيتبلع في catch فاضي، فالمشكلة كانت بتظهر كصفحة ساكتة.
        show('❌ تعذر جلب بياناتك من فيسبوك: ' + (e.message || ''), 'error');
      })
      .finally(() => setAuthBusy(false));

    resolve();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isCustomerSession(session)) setTimeout(resolve, 0);
    });
    window.scrollTo(0, 0);
    return () => listener.subscription.unsubscribe();
  }, [show]);

  async function facebookLogin() {
    setAuthBusy(true);
    announced.current = false;
    try { await signInCustomerWithFacebook(); }
    catch (e) { setAuthBusy(false); show('❌ تعذر تسجيل الدخول بفيسبوك: ' + (e.message || ''), 'error'); }
  }

  async function logoutCustomer() {
    await signOutCustomer();
    setCustomer(null); setDone(false); setOwnReviewIds(new Set()); setLastReview(null); announced.current = false;
    show('تم تسجيل خروجك', 'info');
  }

  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const created = await submitReview({ branch, body, rating, customer, guestName, requireApproval });
      setLastReview(created || null);
      if (customer?.id && created?.id) setOwnReviewIds((prev) => new Set([...prev, created.id]));
      setDone(true); setBody(''); setRating(5); setGuestName('');
      if (!requireApproval) fetchReviews().then(setReviews).catch(() => {});
    } catch (e) { show('❌ حصل خطأ: ' + (e.message || ''), 'error'); }
    finally { setBusy(false); }
  }


  async function retractReview(id) {
    if (!customer?.id || !id || deletingReview) return;
    if (!window.confirm('هل تريد حذف تقييمك؟')) return;
    setDeletingReview(id);
    try {
      await deleteOwnReview(id, customer.id);
      setOwnReviewIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setReviews((prev) => Array.isArray(prev) ? prev.filter((r) => r.id !== id) : prev);
      if (lastReview?.id === id) { setLastReview(null); setDone(false); }
      show('تم حذف تقييمك', 'success');
    } catch (e) { show('❌ تعذر حذف التقييم: ' + (e.message || ''), 'error'); }
    finally { setDeletingReview(null); }
  }

  const bg = hero?.bg;
  const title = (hero?.title || '').trim();
  const pos = hero?.pos || 'center';
  const justify = pos === 'top' ? 'justify-start' : pos === 'bottom' ? 'justify-end' : 'justify-center';

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

      <header className="rise rise-1 relative overflow-hidden rounded-3xl border border-accent-line" style={{ minHeight: 200, background: bg ? `#000 url(${bg}) center/cover` : 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
        {bg && <div className="absolute inset-0 bg-black/45" />}
        <span className="absolute inset-x-0 top-0 z-1 h-0.5 bg-gradient-to-l from-transparent via-accent to-transparent" />
        <div className={`relative z-1 flex min-h-[200px] flex-col items-center px-6 py-8 text-center ${justify}`}>
          {!bg && <span className="mb-3 grid size-14 place-items-center rounded-2xl border border-accent-line bg-card text-3xl">⭐</span>}
          <h1 className={`text-3xl font-black leading-tight md:text-4xl ${bg ? 'text-white drop-shadow-lg' : ''}`}>{title || <>آراء <span className="gold-text">وتقييمات عملائنا</span></>}</h1>
        </div>
      </header>

      <div className="mt-6 space-y-3">
        {reviews === null ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />) : reviews.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted">لسه مفيش تقييمات منشورة — كن أول واحد يشاركنا رأيه 👇</div>
        ) : reviews.map((r, i) => (
          <figure key={r.id} style={{ animationDelay: `${i * 0.04}s` }} className="rise rounded-3xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-3">
              {r.avatar_url ? <img src={r.avatar_url} alt="" referrerPolicy="no-referrer" className="size-11 rounded-full border border-border object-cover" /> : <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-lg">👤</span>}
              <div className="min-w-0"><div className="truncate text-sm font-black text-text">{r.customer_name || 'عميل iShop'}</div><div className="text-[11px] font-bold text-muted">{r.branch || 'iShop'}</div></div>
              <div className="mr-auto flex text-accent" aria-label={`${r.rating || 5} من 5`}>{'★★★★★'.split('').map((s, j) => <span key={j} className={j < (r.rating || 5) ? '' : 'opacity-20'}>{s}</span>)}</div>
            </div>
            <blockquote className="text-[15px] leading-relaxed text-text">{r.body}</blockquote>
            {customer && ownReviewIds.has(r.id) && <button type="button" disabled={deletingReview === r.id} onClick={() => retractReview(r.id)} className="mt-3 text-[11px] font-bold text-danger underline disabled:opacity-50">{deletingReview === r.id ? 'جاري الحذف…' : 'تراجعت عن رأيي'}</button>}
          </figure>
        ))}
      </div>

      <section className="my-8 rounded-3xl border border-accent-line bg-accent-soft/25 p-6">
        <h2 className="text-xl font-black">شاركنا <span className="gold-text">رأيك</span></h2>
        <p className="mt-1 text-xs text-muted">سجّل بفيسبوك لعرض اسمك وصورتك، أو اكتب تقييمك مباشرة بدون تسجيل دخول.</p>

        {authBusy ? <div className="mt-5 h-14 animate-pulse rounded-2xl bg-surface" /> : (
          <div className="mt-5 space-y-4">
            {customer ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                {customer.avatar_url ? <img src={customer.avatar_url} alt="" referrerPolicy="no-referrer" className="size-12 rounded-full object-cover" /> : <span className="grid size-12 place-items-center rounded-full bg-accent-soft">👤</span>}
                <div className="min-w-0"><p className="truncate text-sm font-black text-text">{customer.display_name}</p><p className="text-[11px] text-muted">متصل عبر Facebook</p></div>
                <button type="button" onClick={logoutCustomer} className="mr-auto text-[11px] font-bold text-muted underline">تغيير الحساب</button>
              </div>
            ) : (
              <>
                <button type="button" onClick={facebookLogin} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1877F2] px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:brightness-105 active:scale-[.99]">
                  <span className="grid size-7 place-items-center rounded-full bg-white text-lg font-black text-[#1877F2]">f</span> متابعة باستخدام Facebook
                </button>
                <div className="flex items-center gap-3 text-[11px] font-bold text-muted"><span className="h-px flex-1 bg-border" /><span>أو اكتب تقييمك مباشرة</span><span className="h-px flex-1 bg-border" /></div>
                <div><label className="mb-1.5 block text-xs font-bold text-muted">الاسم <span className="font-normal">(اختياري)</span></label><input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="اكتب اسمك أو اتركه فارغًا" className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent" /></div>
              </>
            )}
            {done ? (
              <div className="rounded-2xl border border-[var(--mtc-success)]/40 bg-[var(--mtc-success)]/12 p-5 text-center text-sm font-bold text-text">
                <div className="text-lg">✨</div>
                <p className="mt-1">شكرًا لرأيك!</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-muted">{requireApproval ? 'تم تسجيل تقييمك، وسيظهر مع التحديث القادم للموقع.' : 'رأيك اتنشر مباشرة وأصبح ظاهرًا للزوار.'}</p>
                {customer && lastReview?.id && <button type="button" disabled={deletingReview === lastReview.id} onClick={() => retractReview(lastReview.id)} className="mt-3 block w-full text-xs font-black text-danger underline disabled:opacity-50">{deletingReview === lastReview.id ? 'جاري الحذف…' : 'تراجعت عن رأيي'}</button>}
                <button type="button" onClick={() => { setDone(false); setLastReview(null); }} className="mt-2 block w-full text-xs font-black text-accent">إضافة تقييم آخر</button>
              </div>
            ) : (
              <>
                <div><label className="mb-1.5 block text-xs font-bold text-muted">الفرع</label><select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent"><option value="">اختر الفرع</option>{branches.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
                <div><label className="mb-2 block text-xs font-bold text-muted">تقييمك</label><div className="flex gap-1" dir="ltr">{[1,2,3,4,5].map((n) => <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} نجوم`} className={`text-3xl leading-none transition active:scale-90 ${n <= rating ? 'text-accent' : 'text-muted opacity-25'}`}>★</button>)}</div></div>
                <div><label className="mb-1.5 block text-xs font-bold text-muted">رأيك</label><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="اكتب رأيك في الخدمة والجهاز..." className="w-full resize-y rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent" /></div>
                <Button className="w-full" loading={busy} disabled={!body.trim()} onClick={send}>{requireApproval ? 'إرسال التقييم' : 'نشر التقييم'}</Button>
              </>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
