/**
 * شريط تنظيم الصلاحيات: إحصاء، بحث، وفتح/قفل الأقسام الظاهرة.
 *
 * البحث لا يغيّر أي صلاحية؛ هو فلتر للعرض فقط.
 */
export default function PermissionsToolbar({
  title = 'الصلاحيات',
  activeCount = 0,
  total = 0,
  allOpen = false,
  onToggleAll,
  query = '',
  onQueryChange,
  moduleCount = 0,
  readOnly = false,
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-text">
            {title}
            {readOnly && <span className="ms-2 text-[10px] font-bold text-muted">(عرض فقط)</span>}
          </p>
          <p className="num mt-0.5 text-[11px] font-bold text-muted">
            {activeCount} من {total} مفعّلة
            {query && <> · {moduleCount} أقسام مطابقة</>}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleAll}
          disabled={!moduleCount}
          className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px]
                     font-bold text-muted transition hover:border-accent-line hover:text-accent
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {allOpen ? 'اقفل الكل' : 'افتح الكل'}
        </button>
      </div>

      <div className="relative mt-3">
        <span className="pointer-events-none absolute inset-y-0 start-0 flex w-10 items-center justify-center text-muted">⌕</span>
        <input
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          placeholder="ابحث داخل الصلاحيات أو الأقسام..."
          aria-label="البحث داخل الصلاحيات"
          className="w-full rounded-xl border border-border bg-input py-2 pe-9 ps-10 text-sm text-text
                     outline-none transition placeholder:text-muted
                     focus:border-accent focus:ring-3 focus:ring-[var(--focus-ring)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange?.('')}
            aria-label="مسح بحث الصلاحيات"
            className="absolute inset-y-0 end-0 flex w-9 items-center justify-center text-muted transition hover:text-accent"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
