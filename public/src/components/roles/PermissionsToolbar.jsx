/**
 * شريط فوق قسم الصلاحيات: العدّاد + فتح/قفل كل الموديولات.
 *
 * ⚠️ الأزرار هنا بتحرّك حالة العرض بس (مفتوح/مقفول) — عمرها ما بتلمس
 *    قيمة صلاحية ولا بتحفظ حاجة.
 *
 * @param {string}   title
 * @param {number}   activeCount
 * @param {number}   total
 * @param {boolean}  allOpen
 * @param {Function} onToggleAll
 * @param {boolean}  readOnly
 */
export default function PermissionsToolbar({
  title = 'الصلاحيات',
  activeCount = 0,
  total = 0,
  allOpen = false,
  onToggleAll,
  readOnly = false,
}) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-text">
          {title}
          {readOnly && <span className="ms-2 text-[10px] font-bold text-muted">(عرض فقط)</span>}
        </p>
        <p className="num text-[11px] font-bold text-muted">{activeCount} من {total} مفعّلة</p>
      </div>

      <button
        type="button"
        onClick={onToggleAll}
        className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px]
                   font-bold text-muted transition hover:border-accent-line hover:text-accent"
      >
        {allOpen ? 'اقفل الكل' : 'افتح الكل'}
      </button>
    </div>
  );
}
