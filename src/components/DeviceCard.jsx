import BatteryRing from './BatteryRing';
import Badge from './ui/Badge';
import Icon from './ui/Icon';
import { brandIcon, getBrand, isIphone } from '../lib/brands';
import { deviceImageUrl } from '../lib/api';
import { waLink, priceNumber, CURRENCY } from '../utils/format';
import { usePermissions } from '../context/PermissionContext';
import { usePricing } from '../context/PricingContext';
import { computePriceView } from '../lib/priceView';

export default function DeviceCard({
  record: r, isGuest, onOpen, onEdit, onDelete, onArchive,
  compareMode = false, picked = false, onToggleCompare,
}) {
  const img = r.images?.[0] ? deviceImageUrl(r.images[0]) : null;
  const wa = waLink(r);
  const { defaultPolicy, activePolicies, unlockedByDevice } = usePricing();
  const p = usePermissions();
  const isAdmin = p.isAdmin();
  const { applied, defaultPrice } = computePriceView({
    record: r,
    isAdmin,
    defaultPolicy,
    activePolicies,
    unlockedByDevice,
  });
  const showEdit = !isGuest && p.canEdit(r);
  const showDelete = !isGuest && p.canDelete(r);
  const showArchive = !isGuest && p.canArchive(r);

  return (
    <article
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-3xl border
                  bg-card transition duration-200 hover:border-accent-line hover:shadow-lg hover:shadow-black/20
                  ${picked ? 'border-accent ring-2 ring-[var(--focus-ring)]' : 'border-border'}`}
      onClick={() => (compareMode ? onToggleCompare(r.sheetRow) : onOpen(r))}
    >
      <div className="relative aspect-3/4 overflow-hidden bg-surface">
        {img ? (
          <img
            src={img}
            alt={r.model}
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-5xl opacity-40">
            {brandIcon(getBrand(r), r.model)}
          </div>
        )}

        {/* تدرّج سفلي لتحسين قراءة أي عنصر فوق الصورة */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16
                        bg-gradient-to-t from-black/45 to-transparent" />

        {r.images?.length > 1 && (
          <span className="num absolute top-2 end-2 inline-flex items-center gap-1 rounded-full
                           bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
            <Icon name="camera" size={12} /> {r.images.length}
          </span>
        )}

        {r.code && !compareMode && (
          <span className="num absolute top-2 start-2 rounded-full bg-accent px-2 py-1
                           text-[10px] font-black text-on-accent shadow-sm">
            #{r.code}
          </span>
        )}

        {compareMode && (
          <span className={`absolute top-2 start-2 grid size-7 place-items-center rounded-full
                            text-xs font-black transition
                            ${picked ? 'bg-accent text-on-accent' : 'bg-black/60 text-white'}`}>
            {picked ? <Icon name="check" size={16} strokeWidth={3} /> : ''}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-text">{r.model}</h3>
            <p className="num text-xs text-muted">{r.storage}</p>
          </div>
          {isIphone(r) && <BatteryRing value={r.battery} />}
        </div>

        {/* السعر: الأدمن يشوف كل الأسعار بأسمائها بدون شطب؛ الزائر يشوف السعر المطبَّق
            بالأخضر بدون اسم، والافتراضي مشطوبًا عليه بدون اسم */}
        <div className="flex flex-col gap-1">
          {applied.map((row, i) => (
            <div key={i} className="flex flex-col">
              {isAdmin && <span className="text-[10px] font-bold text-muted">{row.name}</span>}
              <span className="flex items-baseline gap-1 text-[var(--mtc-success)]">
                <span className="num text-lg font-black leading-tight">{priceNumber(row.price)}</span>
                <span className="text-[11px] font-bold">{CURRENCY}</span>
              </span>
            </div>
          ))}
          {defaultPrice != null && (
            applied.length > 0 ? (
              isAdmin ? (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted">{defaultPolicy?.name || 'الافتراضي'}</span>
                  <span className="flex items-baseline gap-1 text-[var(--mtc-success)]">
                    <span className="num text-lg font-black leading-tight">{priceNumber(defaultPrice)}</span>
                    <span className="text-[11px] font-bold">{CURRENCY}</span>
                  </span>
                </div>
              ) : (
                <span className="flex items-baseline gap-1 text-muted">
                  <span className="num text-xs font-bold line-through">{priceNumber(defaultPrice)}</span>
                  <span className="text-[10px] font-bold line-through">{CURRENCY}</span>
                </span>
              )
            ) : (
              <span className="flex items-baseline gap-1 text-[var(--mtc-success)]">
                <span className="num text-lg font-black leading-tight">{priceNumber(defaultPrice)}</span>
                <span className="text-[11px] font-bold">{CURRENCY}</span>
              </span>
            )
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {r.color !== '-' && (
            <Badge tone="muted"><Icon name="color" size={12} />{r.color}</Badge>
          )}
          {r.warranty === 'ساري' && (
            <Badge tone="ok"><Icon name="warranty" size={12} />ضمان</Badge>
          )}
          {r.repair !== '-' && r.repair !== 'لا' && (
            <Badge tone="warn"><Icon name="repair" size={12} />صيانة</Badge>
          )}
          {r.lock === 'مشفر على شبكة' && (
            <Badge tone="danger"><Icon name="locked" size={12} />مشفر</Badge>
          )}
          {r.lock === 'غير مشفر على اي شبكة' && (
            <Badge tone="ok"><Icon name="unlocked" size={12} />حر</Badge>
          )}
        </div>

        {!isGuest && (
          <p className="mt-auto text-[11px] text-muted">
            {r.addedby} · <span className="num">{r.date}</span>
          </p>
        )}

        {(() => {
          const btn = 'flex w-full items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition active:scale-[0.98]';
          const actions = [];
          if (wa) actions.push(
            <a key="wa" href={wa} target="_blank" rel="noreferrer"
               className={`${btn} border-[#25d366]/25 bg-[#25d366]/12 text-[#25d366] hover:bg-[#25d366]/25`}>
              <Icon name="whatsapp" size={15} /> واتساب
            </a>
          );
          if (r.phone && r.phone !== '-') actions.push(
            <a key="call" href={`tel:${r.phone}`}
               className={`${btn} border-accent-line bg-accent-soft text-accent hover:bg-accent hover:text-on-accent`}>
              <Icon name="phone" size={15} /> اتصال
            </a>
          );
          if (showEdit) actions.push(
            <button key="edit" type="button" onClick={() => onEdit?.(r)}
                    className={`${btn} border-accent-line bg-accent-soft text-accent hover:bg-accent hover:text-on-accent`}>
              <Icon name="edit" size={15} /> تعديل
            </button>
          );
          if (showDelete) actions.push(
            <button key="del" type="button" onClick={() => onDelete?.(r)}
                    className={`${btn} border-danger/25 bg-danger/10 text-danger hover:bg-danger/25`}>
              <Icon name="delete" size={15} /> حذف
            </button>
          );
          if (showArchive) actions.push(
            <button key="arch" type="button" onClick={() => onArchive?.(r)}
                    className={`${btn} border-[var(--mtc-warning)]/30 bg-[var(--mtc-warning)]/12 text-[var(--mtc-warning)] hover:bg-[var(--mtc-warning)]/25`}>
              <Icon name="archive" size={15} /> أرشفة
            </button>
          );
          if (!actions.length) return null;
          const odd = actions.length % 2 === 1;
          return (
            <div className="grid grid-cols-2 gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
              {actions.map((el, i) => (
                <div key={el.key} className={odd && i === actions.length - 1 ? 'col-span-2' : ''}>
                  {el}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </article>
  );
}
