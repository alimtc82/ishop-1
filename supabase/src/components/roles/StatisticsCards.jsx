/**
 * كروت الإحصائيات فوق الصفحة.
 * عرض بحت — بتستقبل الأرقام محسوبة من RolesAdmin.
 *
 * @param {{n:number,l:string}[]} stats
 * @param {boolean} loading
 */
export default function StatisticsCards({ stats = [], loading = false }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.l} className="rounded-2xl border border-border bg-card px-3.5 py-3">
          <p className="num text-2xl font-black leading-none text-accent">{loading ? '—' : s.n}</p>
          <p className="mt-1.5 text-[11px] font-bold text-muted">{s.l}</p>
        </div>
      ))}
    </div>
  );
}
