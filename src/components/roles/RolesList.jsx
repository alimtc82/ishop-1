import Button from '../ui/Button';
import Icon from '../ui/Icon';

/** كارت دور واحد في القائمة */
function RoleItem({ role, active, subtitle, badges = [], count, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-start transition
                  ${active ? 'border-accent bg-accent-soft' : 'border-border bg-card hover:border-accent-line'}`}
    >
      <span className={`h-8 w-1 shrink-0 rounded-full ${active ? 'bg-accent' : 'bg-border'}`} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-black ${active ? 'text-accent' : 'text-text'}`}>
          {role.label}
        </span>
        <span className="num block truncate text-[10px] font-bold text-muted">{subtitle}</span>
      </span>
      {badges.map((b) => <span key={b.label} className="text-[10px]">{b.short}</span>)}
      {count != null && (
        <span className="num shrink-0 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[10px] font-black text-muted">
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * قائمة الأدوار: بحث + زرار إضافة + مجموعات.
 *
 * الكومبوننت ما بيعرفش إيه هو الدور «الأساسي» ولا «المخصّص» — بياخد
 * `groups` جاهزة، فينفع يعيد تقسيمها من غير ما يتفتح.
 *
 * @param {boolean}  loading
 * @param {string}   query
 * @param {Function} onQueryChange
 * @param {{id,label,roles}[]} groups
 * @param {string}   selectedKey
 * @param {boolean}  creating
 * @param {Function} subtitleOf   (role) => string
 * @param {Function} badgesOf     (role) => badge[]
 * @param {Function} countOf      (role) => number
 * @param {Function} onSelect
 * @param {Function} onCreate
 * @param {string}   createLabel
 * @param {string}   searchPlaceholder
 * @param {string}   emptyText
 */
export default function RolesList({
  loading = false,
  query = '',
  onQueryChange,
  groups = [],
  selectedKey,
  creating = false,
  subtitleOf = (r) => r.key,
  badgesOf = () => [],
  countOf = () => null,
  onSelect,
  onCreate,
  createLabel = '➕ دور جديد',
  searchPlaceholder = 'ابحث عن دور...',
  emptyText = 'مفيش دور بالاسم ده',
}) {
  const shown = groups.filter((g) => g.roles.length > 0);
  const noResults = !!query.trim() && shown.length === 0;

  return (
    <aside className="space-y-3 lg:order-2">
      {/* البحث */}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-0 flex w-10 items-center justify-center text-muted">
          <Icon name="search" size={15} />
        </span>
        <input
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-border bg-input py-2.5 pe-9 ps-10 text-sm text-text
                     outline-none transition placeholder:text-muted
                     focus:border-accent focus:ring-3 focus:ring-[var(--focus-ring)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange?.('')}
            aria-label="مسح البحث"
            className="absolute inset-y-0 end-0 flex w-9 items-center justify-center text-muted transition hover:text-accent"
          >
            ✕
          </button>
        )}
      </div>

      <Button variant={creating ? 'primary' : 'ghost'} className="w-full" onClick={onCreate}>
        {createLabel}
      </Button>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface" />)}
        </div>
      ) : noResults ? (
        <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-xs font-bold text-muted">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-4">
          {shown.map((g) => (
            <section key={g.id} className="space-y-2">
              <p className="px-1 text-[11px] font-black tracking-wide text-muted">{g.label}</p>
              {g.roles.map((r) => (
                <RoleItem
                  key={r.key}
                  role={r}
                  active={!creating && selectedKey === r.key}
                  subtitle={subtitleOf(r)}
                  badges={badgesOf(r)}
                  count={countOf(r)}
                  onSelect={() => onSelect?.(r.key)}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
