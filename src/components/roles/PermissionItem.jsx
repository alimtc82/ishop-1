import Toggle from '../ui/Toggle';

/**
 * صف صلاحية واحدة: اسم + شرح + الحالة.
 *
 * ⚠️ في وضع القراءة (`readOnly`) بنعرض حالة ثابتة **مش** مفتاح مقفول.
 *    السبب: المفتاح المقفول شكله زي المفتوح تقريبًا على الموبايل
 *    (`cursor-not-allowed` مالهاش أي معنى في اللمس، و`opacity-60`
 *    مش باينة على خلفية غامقة)، فالمستخدم بيدوس ومفيش أي رد فعل
 *    ويفتكر إن الصفحة بايظة.
 *
 * @param {string}   label
 * @param {string}   hint
 * @param {boolean}  value
 * @param {Function} onChange
 * @param {boolean}  readOnly
 */
export default function PermissionItem({ id, label, hint, value = false, onChange, readOnly = false }) {
  return (
    <div
      id={id}
      tabIndex={-1}
      className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition
                  ${value ? 'border-accent-line bg-accent-soft' : 'border-border bg-surface/40'}`}
    >
      <div className="min-w-0">
        <p className={`text-sm font-black ${value ? 'text-accent' : 'text-muted'}`}>{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</p>}
      </div>

      {readOnly ? (
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1
                      text-[11px] font-black
                      ${value
                        ? 'border-[var(--mtc-success)]/40 text-[var(--mtc-success)]'
                        : 'border-border text-muted'}`}
        >
          {value ? '✓ مفعّلة' : '✕ مقفولة'}
        </span>
      ) : (
        <Toggle checked={value} onChange={onChange} label={label} />
      )}
    </div>
  );
}
