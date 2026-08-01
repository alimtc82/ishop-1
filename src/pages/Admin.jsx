import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePermissions } from '../context/PermissionContext';
import { fetchUsers, fetchRoles, fetchPendingReviewsCount } from '../lib/api';
import { updateUserRow } from '../lib/adminApi';
import UserForm from '../components/UserForm';
import ContactChannels from '../components/ContactChannels';
import NewsTickerAdmin from '../components/NewsTickerAdmin';
import PrintSettingsAdmin from '../components/PrintSettingsAdmin';
import Pricing from '../components/Pricing';
import Illustrations from '../components/Illustrations';
import HeroEditor from '../components/HeroEditor';
import ReviewsAdmin from '../components/ReviewsAdmin';
import RolesAdmin from '../components/RolesAdmin';
import BranchesAdmin from '../components/BranchesAdmin';
import CatalogManager from '../components/CatalogManager';
import CustomersAdmin from '../components/CustomersAdmin';
import SoundSettings from '../components/SoundSettings';
import Button from '../components/ui/Button';

const ROLE_LABEL = { admin: '👑 أدمن', entry: '📝 إدخال', user: '👤 مستخدم' };
const ROLE_TONE = {
  admin: 'bg-accent-soft text-accent border-accent-line',
  entry: 'bg-[var(--mtc-info)]/12 text-[var(--mtc-info)] border-[var(--mtc-info)]/30',
  user: 'bg-surface text-muted border-border',
};

// أقسام الإعدادات — تُعرض كشبكة كروت (تتوسّع لأي عدد)
const SECTIONS = [
  { key: 'users', perm: 'can_settings_users', icon: '👥', label: 'المستخدمين' },
  { key: 'roles', perm: 'can_settings_roles', icon: '🎭', label: 'الأدوار' },
  { key: 'branches', perm: 'can_settings_branches', icon: '🏬', label: 'الفروع' },
  { key: 'catalog', perm: 'can_settings_catalog', icon: '🗂️', label: 'الكتالوج' },
  { key: 'channels', perm: 'can_settings_channels', icon: '📞', label: 'قنوات الاتصال' },
  { key: 'prices', perm: 'can_settings_prices', icon: '💲', label: 'الأسعار' },
  { key: 'illus', perm: 'can_settings_illus', icon: '🖼️', label: 'الصور التوضيحية' },
  { key: 'ticker', perm: 'can_settings_ticker', icon: '📢', label: 'شريط الأخبار' },
  { key: 'printing', perm: 'can_settings_printing', icon: '🖨️', label: 'إعدادات الطباعة' },
  { key: 'warranty', perm: 'can_settings_warranty', icon: '🛡️', label: 'كارت الضمان' },
  { key: 'reviews', perm: 'can_settings_reviews', icon: '⭐', label: 'التقييمات' },
  { key: 'customers', perm: 'can_settings_customers', icon: '🧑‍🤝‍🧑', label: 'العملاء' },
  { key: 'sounds', perm: 'can_settings', icon: '🔊', label: 'الصوتيات' },
];

export default function Admin() {
  const { username: myUsername } = useAuth();
  const { show } = useToast();
  const { can } = usePermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | create | edit
  const [editUser, setEditUser] = useState(null);
  const [tab, setTab] = useState('users'); // القسم النشط في القائمة الجانبية
  const [rolesMap, setRolesMap] = useState({});
  const [pendingReviews, setPendingReviews] = useState(0);
  const [openMenu, setOpenMenu] = useState('accounts');

  useEffect(() => {
    fetchRoles()
      .then((rs) => setRolesMap(Object.fromEntries(rs.map((r) => [r.key, r.label]))))
      .catch(() => {});
  }, []);

  // عدد التقييمات المنتظرة — يعيد الجلب لما نرجع للشبكة بعد الاعتماد
  useEffect(() => {
    fetchPendingReviewsCount().then(setPendingReviews).catch(() => {});
  }, [tab]);

  async function load() {
    setLoading(true);
    try {
      setUsers(await fetchUsers());
    } catch (e) {
      show('❌ فشل تحميل المستخدمين: ' + (e.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(u) {
    // مايقدرش يعطّل نفسه
    if (u.username === myUsername) {
      show('❗ مش هتقدر تعطّل حسابك', 'error');
      return;
    }
    try {
      await updateUserRow(u.id, { is_active: !u.is_active });
      show(u.is_active ? '⏸️ تم تعطيل الحساب' : '✅ تم تفعيل الحساب');
      load();
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
    }
  }

  function onSaved() {
    setView('list');
    setEditUser(null);
    load();
  }

  // Keep this hook before the conditional create/edit return.
  // React requires hooks to run in the same order on every render.
  const allowedSections = SECTIONS.filter((s) => can(s.perm));
  const activeSection = allowedSections.find((s) => s.key === tab) || allowedSections[0];

  useEffect(() => {
    if (allowedSections.length && !allowedSections.some((s) => s.key === tab)) {
      setTab(allowedSections[0].key);
    }
  }, [tab, can]);

  if (view === 'create' || view === 'edit') {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <div className="mb-5 flex items-center gap-3">
          <button type="button" onClick={() => { setView('list'); setEditUser(null); }}
                  className="text-sm font-bold text-muted transition hover:text-accent">
            ‹ رجوع
          </button>
          <h1 className="text-xl font-black text-accent">
            {view === 'create' ? '➕ مستخدم جديد' : `✏️ تعديل: ${editUser?.display_name}`}
          </h1>
        </div>
        <div className="rounded-3xl border border-border bg-card p-6">
          <UserForm
            user={view === 'edit' ? editUser : null}
            onSaved={onSaved}
            onCancel={() => { setView('list'); setEditUser(null); }}
          />
        </div>
      </div>
    );
  }


  const sectionContent = !activeSection ? (
    <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm font-bold text-muted">لا توجد أقسام إعدادات متاحة لهذا الحساب.</div>
  ) : activeSection.key === 'channels' ? (
    <ContactChannels />
  ) : activeSection.key === 'roles' ? (
    <RolesAdmin />
  ) : activeSection.key === 'branches' ? (
    <BranchesAdmin />
  ) : activeSection.key === 'catalog' ? (
    <CatalogManager />
  ) : activeSection.key === 'prices' ? (
    <Pricing />
  ) : activeSection.key === 'illus' ? (
    <Illustrations />
  ) : activeSection.key === 'ticker' ? (
    <NewsTickerAdmin />
  ) : activeSection.key === 'printing' ? (
    <PrintSettingsAdmin />
  ) : activeSection.key === 'warranty' ? (
    <HeroEditor
      settingKey="warranty_hero"
      uploadKey="warranty-hero"
      heading="كارت صفحة الضمان"
      description="غيّر خلفية الكارت العلوي ونصّه ومكان النص — بيظهر لكل الزوار."
      defaultTitle="المستعمل… لكن بأمان أكثر"
    />
  ) : activeSection.key === 'reviews' ? (
    <ReviewsAdmin />
  ) : activeSection.key === 'customers' ? (
    <CustomersAdmin />
  ) : activeSection.key === 'sounds' ? (
    <SoundSettings />
  ) : (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-accent">إدارة المستخدمين</h2>
          <p className="num mt-1 text-sm text-muted">{users.length} مستخدم</p>
        </div>
        <Button onClick={() => setView('create')}>➕ مستخدم جديد</Button>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {users.map((u) => (
            <div key={u.id}
                 className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 ${
                   u.is_active ? 'border-border' : 'border-danger/30 opacity-60'
                 }`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-black text-on-accent">
                {u.display_name?.charAt(0)?.toUpperCase() ?? '؟'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-black text-text">{u.display_name}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ROLE_TONE[u.role] || ROLE_TONE.user}`}>
                    {ROLE_LABEL[u.role] || rolesMap[u.role] || u.role}
                  </span>
                  {u.username === myUsername && <span className="text-[10px] font-bold text-muted">(أنت)</span>}
                </div>
                <p className="num text-xs text-muted">{u.username}{u.email ? ` · ${u.email}` : ''}</p>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => { setEditUser(u); setView('edit'); }}
                        className="rounded-lg border border-accent-line bg-accent-soft px-2.5 py-1.5 text-[11px] font-bold text-accent transition hover:bg-accent hover:text-on-accent">
                  ✏️ تعديل
                </button>
                {u.username !== myUsername && (
                  <button type="button" onClick={() => toggleActive(u)}
                          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                            u.is_active
                              ? 'border-danger/25 bg-danger/10 text-danger hover:bg-danger/25'
                              : 'border-[var(--mtc-success)]/30 bg-[var(--mtc-success)]/12 text-[var(--mtc-success)]'
                          }`}>
                    {u.is_active ? '⏸️ تعطيل' : '✅ تفعيل'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const MENU_GROUPS = [
    { key: 'accounts', icon: '👥', label: 'المستخدمين والصلاحيات', children: ['users', 'roles'] },
    { key: 'organization', icon: '🏬', label: 'الفروع والتنظيم', children: ['branches'] },
    { key: 'catalogue', icon: '🗂️', label: 'الكتالوج والمحتوى', children: ['catalog', 'illus', 'warranty', 'ticker', 'printing'] },
    { key: 'customersMenu', icon: '🤝', label: 'العملاء والتواصل', children: ['customers', 'channels', 'reviews'] },
    { key: 'management', icon: '📊', label: 'الإدارة والتقارير', children: ['reports', 'prices'] },
    { key: 'systemPrefs', icon: '⚙️', label: 'تفضيلات النظام', children: ['sounds'] },
  ].map((g) => ({ ...g, sections: g.children.map((key) => allowedSections.find((s) => s.key === key)).filter(Boolean) }))
    .filter((g) => g.sections.length > 0);

  function chooseSection(section, groupKey) {
    setOpenMenu(groupKey);
    setTab(section.key);
  }

  return (
    <div className="mx-auto max-w-7xl py-5" dir="rtl">
      <div className="mb-4 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            <h1 className="text-2xl font-black text-accent">الإعدادات</h1>
            <p className="mt-1 text-xs font-bold text-muted">إدارة النظام والصلاحيات والمحتوى من مكان واحد</p>
          </div>
          {activeSection && (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-accent-line bg-accent-soft px-3 py-2 text-xs font-black text-accent">
              <span className="text-lg">{activeSection.icon}</span>{activeSection.label}
            </div>
          )}
        </div>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-5">
          {sectionContent}
        </section>

        <aside className="order-first md:order-none md:sticky md:top-4">
          <div className="overflow-hidden rounded-3xl border border-border bg-card p-2.5">
            <div className="px-3 pb-3 pt-1 text-sm font-black text-accent">قائمة الإعدادات</div>
            <div className="space-y-1.5">
              {MENU_GROUPS.map((group) => {
                const isOpen = openMenu === group.key;
                const hasActive = group.sections.some((s) => s.key === activeSection?.key);
                return (
                  <div key={group.key} className={`overflow-hidden rounded-2xl border transition ${hasActive ? 'border-accent-line' : 'border-border'}`}>
                    <button type="button" onClick={() => setOpenMenu(isOpen ? '' : group.key)}
                            className={`flex w-full items-center gap-3 px-3 py-3 text-right text-sm font-black transition ${hasActive ? 'bg-accent text-on-accent' : 'bg-surface text-text hover:bg-accent-soft hover:text-accent'}`}>
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-black/10 text-base">{group.icon}</span>
                      <span className="min-w-0 flex-1">{group.label}</span>
                      <span className={`text-lg transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>‹</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border bg-card px-2 py-2">
                        {group.sections.map((section) => (
                          <button key={section.key} type="button" onClick={() => chooseSection(section, group.key)}
                                  className={`relative flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-right text-xs font-black transition ${activeSection?.key === section.key ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface hover:text-text'}`}>
                            <span className="text-sm">{section.icon}</span>
                            <span className="flex-1">{section.label}</span>
                            {section.key === 'reviews' && pendingReviews > 0 && (
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[9px] text-white num">{pendingReviews > 99 ? '99+' : pendingReviews}</span>
                            )}
                            <span className="text-muted">←</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
