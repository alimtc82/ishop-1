import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchRoles, fetchUsers } from '../lib/api';
import { createRole, updateRole, deleteRole } from '../lib/adminApi';
import { formatDate } from '../utils/format';
import Input from './ui/Input';

import { PERMS, DEFAULT_PERMS, MODULE_TREE, DEFAULT_OPEN } from './roles/permissionsConfig';
import { ROLE_BADGES, STATS, ROLE_GROUPS } from './roles/rolesConfig';
import StatisticsCards from './roles/StatisticsCards';
import RolesList from './roles/RolesList';
import RoleHeader from './roles/RoleHeader';
import PermissionsToolbar from './roles/PermissionsToolbar';
import PermissionModule from './roles/PermissionModule';
import RoleUsers from './roles/RoleUsers';
import SaveBar from './roles/SaveBar';

/**
 * قراءة صلاحيات صف كـ booleans.
 * ⚠️ دلالة `!== false` من الأصل: العمود null = **مسموح**.
 *    `=== true` هتقلب كل عمود null من مسموح لممنوع.
 */
function permsOf(row) {
  const admin = row?.is_admin || row?.key === 'admin';
  return Object.fromEntries(PERMS.map(([k]) => [k, admin ? true : row[k] !== false]));
}

/** عدد الصلاحيات المفعّلة — بنفس الدلالة */
function countActive(row) {
  if (!row) return 0;
  if (row.is_admin || row.key === 'admin') return PERMS.length;
  return PERMS.reduce((n, [k]) => n + (row[k] !== false ? 1 : 0), 0);
}

/**
 * ══ منسّق صفحة الأدوار ═════════════════════════════════════════
 * الملف ده لوحده هو اللي بيمسك الحالة وبينادي الشبكة.
 * كل حاجة في `roles/` عرض بحت: props داخلة و callbacks خارجة.
 *
 * الصفحة بترسم من الإعدادات، مش من عناصر مكتوبة بالإيد:
 *   permissionsConfig.js → الصلاحيات والموديولات
 *   rolesConfig.js       → الشارات، الإحصائيات، مجموعات القائمة
 *
 * ⚠️ نداءات الشبكة زي ما هي من V11.6:
 *      fetchRoles() · createRole(row) · updateRole(key, patch) · deleteRole(key)
 *    و fetchUsers() للقراءة بس (V11.9). مفيش عمود جديد ولا payload اتغيّر.
 * ══════════════════════════════════════════════════════════════
 */
export default function RolesAdmin() {
  const { show } = useToast();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // مستخدمين النظام — قراءة بس، للعرض جنب كل دور
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // فورم إضافة دور جديد
  const [label, setLabel] = useState('');
  const [perms, setPerms] = useState({ ...DEFAULT_PERMS });
  const [busy, setBusy] = useState(false);

  // ── حالة واجهة بحتة ──
  const [query, setQuery] = useState('');
  const [permissionQuery, setPermissionQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(null);
  const [open, setOpen] = useState(() => ({ ...DEFAULT_OPEN }));

  async function load() {
    setLoading(true);
    try { setRoles(await fetchRoles()); }
    catch (e) { show('❌ ' + (e.message || ''), 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // لو الجلب فشل (صلاحيات مثلًا) الصفحة بتفضل شغالة زي ما هي بالظبط،
  // وأعداد المستخدمين بس هي اللي مش هتبان.
  useEffect(() => {
    let alive = true;
    fetchUsers()
      .then((rows) => { if (alive) setUsers(rows || []); })
      .catch(() => {})
      .finally(() => { if (alive) setUsersLoading(false); });
    return () => { alive = false; };
  }, []);

  async function add() {
    const l = label.trim();
    if (!l) return;
    setBusy(true);
    try {
      const key = 'r' + Date.now().toString(36);
      await createRole({ key, label: l, is_builtin: false, is_admin: false, ...perms, sort: 100 });
      show('✅ اتضاف الدور');
      setLabel(''); setPerms({ ...DEFAULT_PERMS });
      setCreating(false);
      load();
    } catch (e) { show('❌ ' + (e.message || ''), 'error'); }
    finally { setBusy(false); }
  }

  async function remove(r) {
    if (!window.confirm(`حذف دور «${r.label}»؟ المستخدمين الحاليين بالدور ده مش هيتأثروا.`)) return;
    try {
      await deleteRole(r.key); show('🗑️ اتحذف');
      setRoles((p) => p.filter((x) => x.key !== r.key));
      setSelectedKey(null);
    }
    catch (e) { show('❌ ' + (e.message || ''), 'error'); }
  }

  const builtins = roles.filter((r) => r.is_builtin);
  const customs = roles.filter((r) => !r.is_builtin);

  // ── ربط المستخدمين بالأدوار: ishop_users.role = roles.key ──
  const usersByRole = useMemo(() => {
    const map = {};
    for (const u of users) (map[u.role] ||= []).push(u);
    return map;
  }, [users]);

  const userCounts = useMemo(
    () => Object.fromEntries(Object.entries(usersByRole).map(([k, v]) => [k, v.length])),
    [usersByRole]
  );

  // ── الدور المعروض + المسوّدة ──
  const selected = useMemo(() => roles.find((r) => r.key === selectedKey) || null, [roles, selectedKey]);

  // أول تحميل: افتح أول دور مخصّص، وإلا أول دور موجود
  useEffect(() => {
    if (selectedKey || !roles.length) return;
    setSelectedKey((customs[0] || roles[0]).key);
  }, [roles]); // eslint-disable-line react-hooks/exhaustive-deps

  // المسوّدة بترجع لقيم الدور كل ما الاختيار يتغيّر
  useEffect(() => {
    if (!selected) { setDraft(null); return; }
    setDraft(permsOf(selected));
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // كل الأدوار قابلة لتعديل الصلاحيات ما عدا الأدمن؛ الأدمن كامل دائمًا.
  const editable = !!selected && !(selected.is_admin || selected.key === 'admin');
  const deletable = !!selected && !selected.is_builtin && !(selected.is_admin || selected.key === 'admin');
  const changed = useMemo(() => {
    if (!selected || !draft || !editable) return [];
    return PERMS.map(([k]) => k).filter((k) => draft[k] !== (selected[k] !== false));
  }, [selected, draft, editable]);

  async function saveChanges() {
    if (!selected || !changed.length) return;
    setBusy(true);
    try {
      // نفس نداء الحفظ الأصلي بالظبط، مفتاح مفتاح
      for (const k of changed) await updateRole(selected.key, { [k]: draft[k] });
      setRoles((p) => p.map((x) => x.key === selected.key ? { ...x, ...draft } : x));
      show('✅ اتحفظت الصلاحيات');
    } catch (e) { show('❌ ' + (e.message || ''), 'error'); }
    finally { setBusy(false); }
  }

  function cancelChanges() {
    if (!selected) return;
    setDraft(permsOf(selected));
  }

  // ── البحث ──
  const shownRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.label.toLowerCase().includes(q) || r.key.toLowerCase().includes(q));
  }, [roles, query]);

  // ── مشتقّات العرض — كلها من ملفات الإعدادات ──
  const groups = useMemo(
    () => ROLE_GROUPS.map((g) => ({ id: g.id, label: g.label, roles: g.pick(shownRoles) })),
    [shownRoles]
  );
  const badgesOf = (r) => ROLE_BADGES.filter((b) => r[b.flag]);

  const subtitleOf = (r) => `${r.key} · ${userCounts[r.key] ?? 0} مستخدم`;

  const stats = useMemo(
    () => STATS.map((s) => ({ l: s.label, n: s.value({ roles, builtins, customs, users }) })),
    [roles, builtins, customs, users]
  );

  const meta = selected ? [
    !usersLoading && { id: 'users', text: `👤 ${userCounts[selected.key] ?? 0} مستخدم نشط` },
    selected.created_at && { id: 'created', text: `🗓️ ${formatDate(selected.created_at)}` },
    selected.sort != null && { id: 'sort', text: `↕️ ترتيب ${selected.sort}` },
  ].filter(Boolean) : [];

  // ── قيم الصلاحيات المعروضة ──
  const values = creating ? perms : draft;
  const get = (k) => !!values?.[k];
  const set = (k) =>
    creating
      ? setPerms((p) => ({ ...p, [k]: !p[k] }))
      : setDraft((p) => ({ ...p, [k]: !p[k] }));

  const shownModules = useMemo(() => {
    const q = permissionQuery.trim().toLowerCase();
    if (!q) return MODULE_TREE;

    return MODULE_TREE.map((module) => {
      const moduleMatches = module.label.toLowerCase().includes(q);
      const permissions = moduleMatches
        ? module.permissions
        : module.permissions.filter((permission) =>
            [permission.label, permission.hint].some((text) => text?.toLowerCase().includes(q))
          );
      return { ...module, permissions };
    }).filter((module) => module.permissions.length);
  }, [permissionQuery]);

  const permissionSuggestions = useMemo(() => {
    const q = permissionQuery.trim().toLowerCase();
    if (!q) return [];

    return MODULE_TREE.flatMap((module) => module.permissions.map((permission) => ({
      ...permission,
      moduleKey: module.key,
      moduleLabel: module.label,
      moduleIcon: module.icon,
      screenLabel: permission.screenLabel,
    }))).filter((permission) =>
      [permission.label, permission.hint, permission.moduleLabel, permission.screenLabel]
        .some((text) => text?.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [permissionQuery]);

  function selectPermission({ key, moduleKey }) {
    setOpen((current) => ({ ...current, [moduleKey]: true }));
    setPermissionQuery('');

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(`permission-${key}`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target?.focus({ preventScroll: true });
      });
    });
  }

  const activeCount = countActive(values);
  const allOpen = shownModules.length > 0 && shownModules.every((m) => open[m.key]);
  const toggleAll = () => setOpen((current) => ({
    ...current,
    ...Object.fromEntries(shownModules.map((m) => [m.key, !allOpen])),
  }));

  const dirty = creating ? !!label.trim() : changed.length > 0;

  const modulesPanel = (
    shownModules.length ? (
      <div className="grid gap-3 xl:grid-cols-2">
        {shownModules.map((m) => (
          <PermissionModule
            key={m.key}
            module={m}
            isOpen={!!open[m.key]}
            onToggleOpen={() => setOpen((p) => ({ ...p, [m.key]: !p[m.key] }))}
            get={get}
            set={set}
            readOnly={!creating && !editable}
          />
        ))}
      </div>
    ) : (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-8 text-center">
        <p className="text-sm font-black text-text">لا توجد صلاحيات مطابقة</p>
        <p className="mt-1 text-xs text-muted">جرّب كلمة أخرى أو امسح البحث.</p>
      </div>
    )
  );

  const toolbar = (
    <PermissionsToolbar
      activeCount={activeCount}
      total={PERMS.length}
      allOpen={allOpen}
      onToggleAll={toggleAll}
      query={permissionQuery}
      onQueryChange={setPermissionQuery}
      moduleCount={shownModules.length}
      suggestions={permissionSuggestions}
      onSuggestionSelect={selectPermission}
      readOnly={!creating && !editable}
    />
  );

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-2xl font-black text-accent">الأدوار والصلاحيات</h1>
        <p className="mt-1 text-sm text-muted">
          كل دور بيحدّد الموظف يقدر يعمل إيه. كل الأدوار قابلة لضبط الصلاحيات ما عدا الأدمن — كامل دائمًا.
        </p>
      </div>

      <StatisticsCards stats={stats} loading={loading} />

      <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
        <RolesList
          loading={loading}
          query={query}
          onQueryChange={setQuery}
          groups={groups}
          selectedKey={selectedKey}
          creating={creating}
          subtitleOf={subtitleOf}
          badgesOf={badgesOf}
          countOf={countActive}
          onSelect={(key) => { setCreating(false); setSelectedKey(key); }}
          onCreate={() => { setCreating(true); setLabel(''); setPerms({ ...DEFAULT_PERMS }); }}
        />

        {/* ══ تفاصيل الدور — يمين، عريض ══ */}
        <div className="space-y-4 lg:order-1">
          {creating ? (
            <>
              <div className="rounded-3xl border border-accent-line bg-card p-4">
                <p className="mb-3 text-sm font-black text-accent">➕ دور جديد</p>
                <Input label="اسم الدور" value={label} onChange={(e) => setLabel(e.target.value)}
                       placeholder="مثلاً: بائع" />
              </div>
              {toolbar}
              {modulesPanel}
            </>
          ) : !selected ? (
            <div className="grid min-h-60 place-items-center rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center">
              <div>
                <p className="text-3xl">🎭</p>
                <p className="mt-2 text-sm font-black text-text">اختار دور من القائمة</p>
                <p className="mt-1 text-xs text-muted">أو ابدأ دور جديد بصلاحياته.</p>
              </div>
            </div>
          ) : (
            <>
              <RoleHeader
                role={selected}
                badges={badgesOf(selected)}
                meta={meta}
                editable={deletable}
                activeCount={activeCount}
                total={PERMS.length}
                onDelete={() => remove(selected)}
                readOnlyNote={(selected.is_admin || selected.key === 'admin') ? '👑 الأدمن لديه كل الصلاحيات دائمًا ولا يمكن إغلاقها.' : ''}
              />
              <RoleUsers users={usersByRole[selected.key] ?? []} loading={usersLoading} />
              {toolbar}
              {draft && modulesPanel}
            </>
          )}
        </div>
      </div>

      <SaveBar
        visible={dirty}
        busy={busy}
        message={creating ? `دور جديد: ${label.trim()}` : `${changed.length} تغيير في «${selected?.label}»`}
        saveLabel={creating ? 'إضافة الدور' : 'حفظ التغييرات'}
        onSave={creating ? add : saveChanges}
        onCancel={creating ? () => setCreating(false) : cancelChanges}
      />
    </div>
  );
}
