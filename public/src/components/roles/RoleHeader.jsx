import Button from '../ui/Button';

/**
 * ترويسة تفاصيل الدور: الاسم، الشارات، سطر البيانات، شريط التقدّم، الحذف.
 *
 * كومبوننت عام: الشارات والبيانات كلها جاية جاهزة من فوق، فمفيش أي
 * عنصر مكتوب بالإيد هنا. إضافة شارة أو بيان = تعديل في الإعدادات بس.
 *
 * @param {object}                       role
 * @param {{label:string,className:string}[]} badges
 * @param {{id:string,text:string}[]}    meta
 * @param {boolean}  editable
 * @param {number}   activeCount
 * @param {number}   total
 * @param {Function} onDelete
 * @param {string}   readOnlyNote
 */
export default function RoleHeader({
  role,
  badges = [],
  meta = [],
  editable = false,
  activeCount = 0,
  total = 0,
  onDelete,
  readOnlyNote = 'الدور ده أساسي — صلاحياته للعرض بس.',
}) {
  if (!role) return null;
  const pct = total ? (activeCount / total) * 100 : 0;

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-text">{role.label}</h2>
            {badges.map((b) => (
              <span key={b.label}
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${b.className}`}>
                {b.label}
              </span>
            ))}
          </div>
          <p className="num mt-1 text-[11px] font-bold text-muted">{role.key}</p>
        </div>

        {editable && (
          <Button variant="danger" onClick={onDelete} className="shrink-0 px-3 py-1.5 text-[11px]">
            🗑️ حذف
          </Button>
        )}
      </div>

      {meta.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3
                        text-[10px] font-bold text-muted">
          {meta.map((m) => <span key={m.id} className="num">{m.text}</span>)}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="num text-[11px] font-black text-muted">{activeCount}/{total}</span>
      </div>

      {!editable && readOnlyNote && (
        <p className="mt-3 rounded-xl border border-border bg-surface/50 px-3 py-2 text-[11px] font-bold text-muted">
          {readOnlyNote}
        </p>
      )}
    </div>
  );
}
