/**
 * صف صلاحية واحدة: اسم، تلميح، وخانة اختيار.
 * التأشير يعني أن الدور مسموح له بهذا الإجراء.
 */
export default function PermissionItem({ id, label, hint, value = false, onChange, readOnly = false }) {
  const tone = value ? 'border-accent-line bg-accent-soft' : 'border-border bg-surface/40';

  return (
    <div id={id} tabIndex={-1} className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 transition ${tone}`}>
      <div className="min-w-0">
        <p className={`text-sm font-black ${value ? 'text-accent' : 'text-muted'}`}>{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</p>}
      </div>

      {readOnly ? (
        <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${value ? 'border-[var(--mtc-success)]/40 text-[var(--mtc-success)]' : 'border-border text-muted'}`}>
          {value ? '✓ مفعّلة' : '✕ مقفولة'}
        </span>
      ) : (
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] font-black text-muted">
          <input
            type="checkbox"
            checked={value}
            onChange={() => onChange?.()}
            aria-label={label}
            className="size-5 cursor-pointer rounded border-border accent-[var(--accent)]"
          />
          <span>{value ? 'مفعّلة' : 'مقفولة'}</span>
        </label>
      )}
    </div>
  );
}
