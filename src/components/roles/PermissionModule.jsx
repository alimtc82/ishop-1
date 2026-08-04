import Icon from '../ui/Icon';
import PermissionItem from './PermissionItem';

function PermissionList({ permissions, get, set, readOnly }) {
  return (
    <div className="space-y-2">
      {permissions.map((permission) => (
        <PermissionItem
          key={permission.key}
          id={`permission-${permission.key}`}
          label={permission.label}
          hint={permission.hint}
          value={get(permission.key)}
          readOnly={readOnly}
          onChange={() => set(permission.key)}
        />
      ))}
    </div>
  );
}

/**
 * موديول صلاحيات. في ERP تظهر الشاشات أولًا، ثم إجراءات كل شاشة
 * كخانات اختيار مستقلة.
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
  const on = list.filter((permission) => get(permission.key)).length;
  const screens = module.screens ?? [];

  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-card ${module.key === 'erp' ? 'xl:col-span-2' : ''}`}>
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
          {screens.length ? (
            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
              {screens.map((screen) => {
                const enabled = screen.permissions.filter((permission) => get(permission.key)).length;
                return (
                  <section key={screen.key} className="rounded-2xl border border-border bg-surface/30 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-2">
                      <div>
                        <h3 className="text-sm font-black text-text">{screen.label}</h3>
                        <p className="text-[11px] font-bold text-muted">الشاشة وأزرارها</p>
                      </div>
                      <span className="num rounded-full border border-border bg-card px-2 py-1 text-[10px] font-black text-muted">
                        {enabled}/{screen.permissions.length}
                      </span>
                    </div>
                    <PermissionList permissions={screen.permissions} get={get} set={set} readOnly={readOnly} />
                  </section>
                );
              })}
            </div>
          ) : list.length ? (
            <PermissionList permissions={list} get={get} set={set} readOnly={readOnly} />
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
