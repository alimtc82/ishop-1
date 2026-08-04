import { useEffect, useMemo, useState } from 'react';
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

function ScreenContent({ screen, get, set, readOnly }) {
  const enabled = screen.permissions.filter((permission) => get(permission.key)).length;
  const allEnabled = enabled === screen.permissions.length;

  function toggleScreen() {
    if (readOnly) return;
    // نغيّر العناصر اللازمة فقط، لكي يظل منطق التبعية في الأبناء مطبقًا.
    screen.permissions
      .filter((permission) => get(permission.key) === allEnabled)
      .forEach((permission) => set(permission.key));
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-text">{screen.label}</h3>
            <span className="num rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-black text-muted">
              {enabled}/{screen.permissions.length}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-bold text-muted">صلاحية الشاشة ثم الإجراءات المتاحة بداخلها</p>
        </div>
        {!readOnly && (
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-black text-text transition hover:border-accent-line">
            <input
              type="checkbox"
              checked={allEnabled}
              onChange={toggleScreen}
              aria-label={`اختيار كل صلاحيات ${screen.label}`}
              className="size-4 cursor-pointer rounded border-border accent-[var(--accent)]"
            />
            {allEnabled ? 'إغلاق الكل' : 'اختيار الكل'}
          </label>
        )}
      </div>
      <PermissionList permissions={screen.permissions} get={get} set={set} readOnly={readOnly} />
    </section>
  );
}

/**
 * على الموبايل: الكروت الحالية المتتابعة.
 * على الكمبيوتر: قائمة شاشات جانبية ثابتة ومحتوى واسع، على نمط المرجع.
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
  const [activeScreenKey, setActiveScreenKey] = useState(screens[0]?.key ?? '');

  useEffect(() => {
    if (screens.length && !screens.some((screen) => screen.key === activeScreenKey)) {
      setActiveScreenKey(screens[0].key);
    }
  }, [screens, activeScreenKey]);

  const activeScreen = useMemo(
    () => screens.find((screen) => screen.key === activeScreenKey) || screens[0],
    [screens, activeScreenKey]
  );

  const screenList = screens.length ? (
    <>
      <div className="space-y-4 lg:hidden">
        {screens.map((screen) => (
          <ScreenContent key={screen.key} screen={screen} get={get} set={set} readOnly={readOnly} />
        ))}
      </div>

      <div className="hidden lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-5">
        <aside className="h-fit overflow-hidden rounded-2xl border border-border bg-surface/40">
          <div className="border-b border-border px-3 py-3">
            <p className="text-sm font-black text-accent">شاشات {module.label}</p>
            <p className="mt-0.5 text-[11px] font-bold text-muted">اختر شاشة لضبط أزرارها</p>
          </div>
          <div className="max-h-[70vh] space-y-1 overflow-y-auto p-2">
            {screens.map((screen) => {
              const enabled = screen.permissions.filter((permission) => get(permission.key)).length;
              const selected = screen.key === activeScreen?.key;
              return (
                <button
                  key={screen.key}
                  type="button"
                  onClick={() => setActiveScreenKey(screen.key)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-xs font-black transition ${selected ? 'bg-accent text-on-accent shadow-sm' : 'text-text hover:bg-card'}`}
                >
                  <span className="min-w-0 flex-1">{screen.label}</span>
                  <span className={`num rounded-full px-1.5 py-0.5 text-[10px] ${selected ? 'bg-black/15 text-on-accent' : 'bg-card text-muted'}`}>
                    {enabled}/{screen.permissions.length}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
        {activeScreen && <ScreenContent screen={activeScreen} get={get} set={set} readOnly={readOnly} />}
      </div>
    </>
  ) : list.length ? (
    <PermissionList permissions={list} get={get} set={set} readOnly={readOnly} />
  ) : (
    <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[11px] font-bold text-muted">{emptyText}</p>
  );

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-surface/60"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-base">{module.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-text">{module.label}</span>
          <span className="num block text-[10px] font-bold text-muted">{list.length ? `${on} / ${list.length} مفعّلة` : 'مفيش صلاحيات لسه'}</span>
        </span>
        <span className={`text-muted transition-transform duration-200 ${isOpen ? '-rotate-90' : ''}`}><Icon name="chevron" size={16} /></span>
      </button>
      {isOpen && <div className="border-t border-border p-3 sm:p-4">{screenList}</div>}
    </div>
  );
}
