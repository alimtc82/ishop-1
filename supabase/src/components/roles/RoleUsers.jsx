/**
 * المستخدمين اللي شايلين الدور المعروض.
 *
 * ⚠️ عرض بحت للقراءة. البيانات جاية من `ishop_users` عن طريق
 *    fetchUsers() الموجودة أصلًا — مفيش جدول جديد ولا عمود جديد،
 *    ومفيش أي كتابة من هنا.
 *
 * ⚠️ fetchUsers() بتفلتر is_active = true، فالعدد ده للنشطين بس.
 *
 * @param {object[]} users
 * @param {boolean}  loading
 */
export default function RoleUsers({ users = [], loading = false }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <p className="text-sm font-black text-text">المستخدمين</p>
        <span className="num rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-black text-muted">
          {loading ? '…' : users.length}
        </span>
        <span className="flex-1" />
        <span className="text-[10px] font-bold text-muted">نشطين بس</span>
      </div>

      {loading ? (
        <div className="flex gap-2">
          {[0, 1].map((i) => <div key={i} className="h-9 w-28 animate-pulse rounded-xl bg-surface" />)}
        </div>
      ) : users.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[11px] font-bold text-muted">
          مفيش حد على الدور ده دلوقتي
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {users.map((u) => (
            <span
              key={u.id ?? u.username}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-2.5 py-1.5"
              title={u.username}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-accent-soft text-[10px] font-black text-accent">
                {(u.display_name || u.username || '؟').charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block max-w-36 truncate text-[11px] font-black text-text">
                  {u.display_name || u.username}
                </span>
                {u.branch && (
                  <span className="block truncate text-[9px] font-bold text-muted">{u.branch}</span>
                )}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
