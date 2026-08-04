import Icon from '../ui/Icon';
import PermissionItem from './PermissionItem';

/**
 * موديول واحد: ترويسة قابلة للفتح/القفل + صفوف الصلاحيات جوّاها.
 *
 * بيرسم من `module.permissions` مباشرة — يعني إضافة صلاحية في ملف
 * الإعدادات بتظهر هنا من غير ما الملف ده يتفتح.
 *
 * @param {{key,icon,label,permissions:{key,label,hint}[]}} module
 * @param {boolean}  isOpen
 * @param {Function} onToggleOpen
 * @param {Function} get   (permKey) => boolean
 * @param {Function} set   (permKey) => void
 * @param {boolean}  readOnly   وضع العرض فقط (الأدوار الأساسية)
 * @param {string}   emptyText
 */
export default function PermissionModule({
  module,
  isOpen,
  onToggleOpen,
  get,
  set,
  readOnly = false,
  emptyText = 'الموديول ده لسه مالوش صلاحيات في النظام',
}) {
  const list = module.permissions ?? [];
  const on = list.filter((p) => get(p.key)).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-surface/60"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-base">
          {module.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-text">{module.label}</span>
          <span className="num block text-[10px] font-bold text-muted">
            {list.length ? `${on} / ${list.length} مفعّلة` : 'مفيش صلاحيات لسه'}
          </span>
        </span>
        <span className={`text-muted transition-transform duration-200 ${isOpen ? '-rotate-90' : ''}`}>
          <Icon name="chevron" size={16} />
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-border p-3">
          {list.length ? (
            <div className="space-y-2">
              {list.map((p) => (
                <PermissionItem
                  key={p.key}
                  id={`permission-${p.key}`}
                  label={p.label}
                  hint={p.hint}
                  value={get(p.key)}
                  readOnly={readOnly}
                  onChange={() => set(p.key)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[11px] font-bold text-muted">
              {emptyText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
