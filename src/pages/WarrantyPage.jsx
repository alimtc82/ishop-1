import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemePanel';
import Modal from '../components/ui/Modal';
import PolicyModal from '../components/PolicyModal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ImeiInput from '../components/ImeiInput';
import Icon from '../components/ui/Icon';
import SiteFooter from '../components/SiteFooter';
import { checkWarranty, fetchSetting } from '../lib/api';
import { WARRANTY } from '../lib/policies';

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return ''; }
};

export default function WarrantyPage() {
  const navigate = useNavigate();
  const { enterGuest } = useAuth();
  const home = () => navigate('/', { replace: true });

  const [open, setOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [hero, setHero] = useState(null);

  useEffect(() => { fetchSetting('warranty_hero').then((v) => setHero(v || {})); }, []);
  const [phone, setPhone] = useState('');
  const [serial, setSerial] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [browsing, setBrowsing] = useState(false);

  function openModal() {
    setResult(null); setPhone(''); setSerial(''); setOpen(true);
  }

  async function inquire() {
    if (!phone.trim() || !serial.trim() || busy) return;
    setBusy(true); setResult(null);
    try {
      const r = await checkWarranty(phone.trim(), serial.trim());
      setResult(r || { found: false });
    } catch (e) {
      setResult({ error: e.message || 'حصل خطأ' });
    } finally {
      setBusy(false);
    }
  }

  async function seeDevices() {
    setBrowsing(true);
    await enterGuest();
    navigate('/devices', { replace: true });
  }

  return (
    <div className="relative z-1 mx-auto max-w-3xl px-5">
      {/* شريط علوي */}
      <nav className="flex items-center justify-between py-4">
        <button type="button" onClick={home} aria-label="الرئيسية"
                className="flex select-none items-center gap-2.5 outline-none">
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

      {/* الهيرو — قابل للتخصيص من لوحة الأدمن */}
      {(() => {
        const bg = hero?.bg;
        const title = (hero?.title || '').trim();
        const pos = hero?.pos || 'center';
        const justify = pos === 'top' ? 'justify-start' : pos === 'bottom' ? 'justify-end' : 'justify-center';
        return (
          <header className="rise rise-1 relative overflow-hidden rounded-3xl border border-accent-line"
                  style={{ minHeight: 220, background: bg ? `#000 url(${bg}) center/cover` : 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
            {bg && <div className="absolute inset-0 bg-black/45" />}
            <span className="absolute inset-x-0 top-0 z-1 h-0.5 bg-gradient-to-l from-transparent via-accent to-transparent" />
            <div className={`relative z-1 flex min-h-[220px] flex-col items-center px-6 py-8 text-center ${justify}`}>
              {!bg && (
                <span className="mb-4 grid size-16 place-items-center rounded-2xl border border-accent-line bg-card text-accent shadow-sm">
                  <Icon name="warranty" size={30} />
                </span>
              )}
              {title ? (
                <h1 className={`text-4xl font-black leading-tight md:text-5xl ${bg ? 'text-white drop-shadow-lg' : 'gold-text'}`}>
                  {title}
                </h1>
              ) : (
                <h1 className={`text-4xl font-black leading-tight md:text-5xl ${bg ? 'text-white drop-shadow-lg' : ''}`}>
                  المستعمل… <span className={bg ? '' : 'gold-text'}>لكن بأمان أكثر</span>
                </h1>
              )}
              {!bg && <span className="mt-5 flex h-1 w-16 rounded-full bg-accent/40" />}
            </div>
          </header>
        );
      })()}

      {/* المحتوى */}
      <article className="mt-6 space-y-5">
        <p className="rise rise-2 text-[17px] font-bold leading-[1.9] text-text">
          شراء آيفون مستعمل لا يجب أن يكون مخاطرة.
        </p>
        <p className="rise rise-2 text-[15px] leading-[1.9] text-muted">
          في APP TECH، اخترنا أن نجعل تجربة شراء الأجهزة المستعملة أكثر أمانًا ووضوحًا، من خلال خبرة
          حقيقية في سوق الهواتف وفحص شامل لكل جهاز قبل عرضه للبيع.
        </p>
        <blockquote className="rise rise-3 relative rounded-3xl border border-accent-line bg-accent-soft/50 px-6 py-7 text-center">
          <span className="pointer-events-none absolute start-4 top-2 text-5xl text-accent/25">”</span>
          <p className="gold-text text-xl font-black leading-relaxed">
            لأننا لا نبيع جهازًا إلا إذا كنا مستعدين أن نضمن لك جودته وأداءه
          </p>
        </blockquote>
      </article>

      {/* زر سياسة الضمان — يفتح مودال زي الاسترجاع والخصوصية */}
      <div className="mt-6 flex justify-center">
        <button type="button" onClick={() => setPolicyOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-accent-line bg-accent-soft
                           px-5 py-3 text-sm font-black text-accent transition
                           hover:bg-accent hover:text-on-accent active:scale-95">
          🛡️ اقرأ سياسة الضمان كاملة
        </button>
      </div>

      {/* دعوة لمتابعة الضمان */}
      <section className="my-8 overflow-hidden rounded-3xl border border-accent-line px-6 py-10 text-center"
               style={{ background: 'linear-gradient(180deg, var(--accent-soft), transparent)' }}>
        <h2 className="text-2xl font-black">اطمن على <span className="gold-text">ضمانك</span></h2>
        <p className="mt-2 text-sm text-muted">لو اشتريت من APP TECH، اعرف حالة ضمان جهازك في ثانية.</p>
        <Button className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 text-[15px]" onClick={openModal}>
          <Icon name="warranty" size={17} />
          لمتابعة ضمانك اضغط هنا
        </Button>
      </section>

      {/* مودال الاستعلام */}
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        icon="🛡️"
        title="متابعة الضمان"
        description="ادخل رقم هاتفك والرقم المسلسل زي ما اتسجّلوا وقت الشراء."
        actions={
          <>
            <Button variant="plain" onClick={() => setOpen(false)} disabled={busy}>إغلاق</Button>
            <Button loading={busy} disabled={!phone.trim() || !serial.trim()} onClick={inquire}>
              استعلام
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="رقم هاتفك (المسجّل وقت الشراء)" type="tel" inputMode="tel"
                 value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
          <ImeiInput label="الرقم المسلسل (IMEI)" value={serial} onChange={setSerial} onEnter={inquire} />

          {result && <WarrantyResult result={result} onHome={() => { setOpen(false); home(); }} />}
        </div>
      </Modal>

      {/* تصفّح */}
      <div className="mb-10 text-center">
        <button type="button" onClick={seeDevices} disabled={browsing}
                className="inline-flex items-center gap-1.5 text-sm font-black text-accent transition hover:opacity-70">
          <Icon name="bag" size={16} /> تصفّح الأجهزة المتاحة
        </button>
      </div>

      <SiteFooter />

      <PolicyModal policy={policyOpen ? WARRANTY : null} onClose={() => setPolicyOpen(false)} />
    </div>
  );
}

function WarrantyResult({ result, onHome }) {
  if (result.error) {
    return <Box tone="bad">❌ {result.error}. حاول تاني.</Box>;
  }
  if (!result.found) {
    return (
      <Box tone="bad">
        ❌ مفيش ضمان مطابق للبيانات دي.<br />
        اتأكد إن رقم هاتفك والرقم المسلسل زي المسجّلين وقت الشراء بالظبط.
      </Box>
    );
  }
  const name = String(result.buyer_name || '').trim();
  const hi = name ? `أهلاً بك ${name} 👋` : 'أهلاً بك 👋';

  if (result.active) {
    return (
      <Box tone="good">
        {hi}<br />
        جهازك {result.model ? <b>«{result.model}»</b> : ''} لسه مغطى بضمان APP TECH<br />
        حتى <b>{fmtDate(result.expires_at)}</b> — ومتبقّي <b className="num">{result.days_left}</b> يوم.
      </Box>
    );
  }
  // منتهي (أو جهاز قديم من غير تاريخ)
  return (
    <Box tone="warn">
      {hi}<br />
      ⏳ الـ 30 يوم ضمان APP TECH خلصوا{result.model ? <> على جهازك <b>«{result.model}»</b></> : ''} — بس إحنا برضه معاك.
      <br />ارجع للصفحة الرئيسية وتواصل معانا من خلال زر <b>الدعم الفني</b>.
      <button type="button" onClick={onHome}
              className="mt-3 block w-full rounded-xl border border-accent-line bg-accent-soft px-4 py-2.5
                         text-sm font-black text-accent transition hover:bg-accent hover:text-on-accent">
        🏠 الرئيسية والدعم الفني
      </button>
    </Box>
  );
}

function Box({ tone, children }) {
  const cls = {
    good: 'border-[var(--mtc-success)]/40 bg-[var(--mtc-success)]/12 text-text',
    bad: 'border-danger/35 bg-danger/10 text-text',
    warn: 'border-accent-line bg-accent-soft/60 text-text',
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 text-center text-sm leading-relaxed font-bold ${cls}`}>
      {children}
    </div>
  );
}
