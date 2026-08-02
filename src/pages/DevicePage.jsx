import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDevices } from '../hooks/useDevices';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePricing } from '../context/PricingContext';
import { useToast } from '../context/ToastContext';
import { computePriceView } from '../lib/priceView';
import { deviceImageUrl } from '../lib/api';
import { waLink, priceNumber, CURRENCY } from '../utils/format';
import { isIphone } from '../lib/brands';
import BatteryRing from '../components/BatteryRing';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import ImageCarousel from '../components/ImageCarousel';
import Lightbox from '../components/Lightbox';
import ShareBar from '../components/ShareBar';

const FIELDS = [
  ['الموديل', 'model'], ['السعة', 'storage'], ['اللون', 'color'],
  ['البطارية', 'battery'], ['الدورات', 'cycles'], ['الشريحة', 'sim'],
  ['العلبة', 'box'], ['الصيانة', 'repair'], ['الجمرك', 'tax'],
  ['الضمان', 'warrantyDisplay'], ['القفل', 'lock'],
  ['العيوب', 'defects'], ['إضافات', 'extras'],
];

export default function DevicePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest } = useAuth();
  const perms = usePermissions();
  const { records, archived, loading } = useDevices({ guest: isGuest });
  const { defaultPolicy, activePolicies, unlockedByDevice } = usePricing();
  const { show } = useToast();
  const [lightbox, setLightbox] = useState(null);

  // لينك مشترك (تحميل مباشر بلا انتقال داخلي) → الزائر ما يشوفش أي أسعار،
  // ولا حتى السعر الافتراضي المُعلَن. الموظف/الأدمن يشوفوا عادي.
  const hidePrices = isGuest && !location.state?.internal;

  const all = [...(records || []), ...(archived || [])];
  const r = all.find(
    (d) => String(d.code) === String(code) || String(d.sheetRow) === String(code)
  );

  if (loading && !r) {
    return <div className="py-24 text-center text-sm font-bold text-muted">جاري التحميل…</div>;
  }

  if (!r) {
    return (
      <div className="space-y-4 py-24 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-border bg-card text-muted opacity-50">
          <Icon name="search" size={28} />
        </div>
        <p className="text-sm font-bold text-muted">الجهاز غير متاح</p>
        <Button onClick={() => navigate('/devices')}>رجوع للأجهزة</Button>
      </div>
    );
  }

  const isAdmin = perms.isAdmin();
  const { applied, defaultPrice } = hidePrices
    ? { applied: [], defaultPrice: null }
    : computePriceView({
        record: r,
        isAdmin,
        defaultPolicy,
        activePolicies,
        unlockedByDevice,
      });

  const wa = waLink(r);
  const iphone = isIphone(r);
  const shareUrl = `${window.location.origin}/d/${r.code || r.sheetRow}`;
  const shareText = `${r.model} ${r.storage}`.trim();

  async function copyInfo() {
    const lines = [
      `📱 *${r.model} ${r.storage}*${r.code ? ' — كود: #' + r.code : ''}`,
      isIphone(r) && `🔋 البطارية: ${r.battery}`,
      r.cycles !== '-' && `⚡ الشحنات: ${r.cycles}`,
      r.color !== '-' && `🎨 اللون: ${r.color}`,
      r.sim !== '-' && `📶 الشريحة: ${r.sim}`,
      r.box !== '-' && `📦 الكرتونة: ${r.box}`,
      r.repair !== '-' && `🔧 صيانة: ${r.repair}`,
      r.tax !== '-' && `🏛️ الجمارك: ${r.tax}`,
      r.warranty !== '-' && `✅ الضمان: ${r.warrantyDisplay}`,
      r.lock !== '-' && `🔒 الشفرة: ${r.lock}`,
      r.defects !== '-' && `⚠️ أعطال: ${r.defects}`,
      r.extras !== '-' && `💬 ملاحظات: ${r.extras}`,
      r.phone && r.phone !== '-' && `📞 للتواصل: ${r.phone}`,
    ].filter(Boolean);
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      show('📋 اتنسخت بيانات الجهاز');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      show('📋 اتنسخت بيانات الجهاز');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="رجوع"
        className="inline-flex items-center gap-2 rounded-xl border border-accent-line
                   bg-accent-soft px-4 py-2.5 text-sm font-black text-accent transition
                   hover:bg-accent hover:text-on-accent active:scale-95"
      >
        <span aria-hidden="true" className="text-lg leading-none">‹</span>
        رجوع
      </button>

      {/* الرأس: البطارية (iPhone بس) + الموديل + الأسعار */}
      <div className="flex items-start gap-3">
        {iphone && <BatteryRing value={r.battery} />}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-text">{r.model}</h1>
          <p className="num text-sm text-muted">
            {r.storage}{r.code && ` · #${r.code}`}
          </p>
          {applied.map((row, i) => (
            <div key={i} className="mt-1 flex flex-col">
              {isAdmin && <span className="text-xs font-bold text-muted">{row.name}</span>}
              <span className="flex items-baseline gap-1.5 text-[var(--mtc-success)]">
                <span className="num text-xl font-black">{priceNumber(row.price)}</span>
                <span className="text-sm font-bold">{CURRENCY}</span>
              </span>
            </div>
          ))}
          {defaultPrice != null && (
            applied.length > 0 ? (
              isAdmin ? (
                <div className="mt-1 flex flex-col">
                  <span className="text-xs font-bold text-muted">{defaultPolicy?.name || 'الافتراضي'}</span>
                  <span className="flex items-baseline gap-1.5 text-[var(--mtc-success)]">
                    <span className="num text-xl font-black">{priceNumber(defaultPrice)}</span>
                    <span className="text-sm font-bold">{CURRENCY}</span>
                  </span>
                </div>
              ) : (
                <span className="flex items-baseline gap-1 text-muted">
                  <span className="num text-sm font-bold line-through">{priceNumber(defaultPrice)}</span>
                  <span className="text-xs font-bold line-through">{CURRENCY}</span>
                </span>
              )
            ) : (
              <span className="mt-1 flex items-baseline gap-1.5 text-[var(--mtc-success)]">
                <span className="num text-lg font-black">{priceNumber(defaultPrice)}</span>
                <span className="text-sm font-bold">{CURRENCY}</span>
              </span>
            )
          )}
        </div>
      </div>

      <ShareBar url={shareUrl} text={shareText} />

      {r.images?.length > 0 && (
        <ImageCarousel images={r.images.map(deviceImageUrl)} alt={r.model} onOpen={setLightbox} />
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {FIELDS.map(([label, key]) =>
          (key === 'battery' && !iphone) ? null :
          r[key] && r[key] !== '-' ? (
            <div key={key} className="flex flex-col">
              <dt className="text-[11px] font-bold text-muted">{label}</dt>
              <dd className="num text-sm font-bold text-text">{r[key]}</dd>
            </div>
          ) : null
        )}
      </dl>

      {!isGuest && (
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="muted">أضافه: {r.addedby}</Badge>
          <Badge tone="muted">{r.date}</Badge>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={copyInfo}>
          <Icon name="copy" size={15} /> نسخ البيانات
        </Button>
        {r.phone && r.phone !== '-' && (
          <a
            href={`tel:${r.phone}`}
            className="inline-flex items-center gap-2 rounded-xl border border-accent-line bg-accent-soft px-4 py-2.5 text-sm font-bold text-accent transition hover:bg-accent hover:text-on-accent"
          >
            <Icon name="phone" size={15} /> اتصال بالبائع
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-[#25d366]/25 bg-[#25d366]/12 px-4 py-2.5 text-sm font-bold text-[#25d366] transition hover:bg-[#25d366]/25"
          >
            <Icon name="whatsapp" size={15} /> واتساب
          </a>
        )}
      </div>

      {lightbox !== null && (
        <Lightbox images={r.images.map(deviceImageUrl)} index={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
