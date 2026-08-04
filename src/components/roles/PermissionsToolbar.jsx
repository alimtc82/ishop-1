function MatchedText({ text = '', query = '' }) {
  const start = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (start < 0 || !query.trim()) return text;

  const end = start + query.trim().length;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-accent-soft px-0.5 font-black text-accent">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

/**
 * شريط تنظيم الصلاحيات: إحصاء، بحث، اقتراحات، وفتح/قفل الأقسام الظاهرة.
 *
 * البحث لا يغيّر أي صلاحية. اختيار اقتراح يفتح قسمه وينقل المستخدم
 * إلى الصلاحية نفسها لاتخاذ الإجراء.
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
  suggestions = [],
  onSuggestionSelect,
  readOnly = false,
}) {
  const hasQuery = !!query.trim();

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
            {hasQuery && <> · {moduleCount} أقسام مطابقة</>}
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
        <span className="pointer-events-none absolute inset-y-0 start-0 z-10 flex w-10 items-center justify-center text-muted">⌕</span>
        <input
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          placeholder="ابحث بجزء من اسم الصلاحية أو تلميحها..."
          aria-label="البحث داخل الصلاحيات"
          aria-autocomplete="list"
          aria-expanded={hasQuery}
          className="w-full rounded-xl border border-border bg-input py-2 pe-9 ps-10 text-sm text-text
                     outline-none transition placeholder:text-muted
                     focus:border-accent focus:ring-3 focus:ring-[var(--focus-ring)]"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => onQueryChange?.('')}
            aria-label="مسح بحث الصلاحيات"
            className="absolute inset-y-0 end-0 z-10 flex w-9 items-center justify-center text-muted transition hover:text-accent"
          >
            ✕
          </button>
        )}

        {hasQuery && (
          <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
            {suggestions.length ? (
              suggestions.map((permission) => (
                <button
                  key={permission.key}
                  type="button"
                  onClick={() => onSuggestionSelect?.(permission)}
                  className="w-full rounded-lg px-3 py-2 text-start transition hover:bg-accent-soft"
                >
                  <span className="block text-sm font-black text-text">
                    <MatchedText text={permission.label} query={query} />
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                    {permission.moduleIcon} <MatchedText text={permission.moduleLabel} query={query} />
                    {permission.hint && <> · <MatchedText text={permission.hint} query={query} /></>}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-xs font-bold text-muted">لا توجد صلاحيات أو تلميحات مطابقة.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
