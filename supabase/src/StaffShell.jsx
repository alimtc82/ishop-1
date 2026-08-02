import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { usePermissions } from './context/PermissionContext';
import PermissionGuard from './components/PermissionGuard';
import { fetchPendingReviewsCount } from './lib/api';
import { ThemeToggle } from './components/ThemePanel';
import Button from './components/ui/Button';
import Devices from './pages/Devices';
import DevicePage from './pages/DevicePage';
import Placeholder from './pages/Placeholder';
import Entry from './pages/Entry';
import Archive from './pages/Archive';
import Admin from './pages/Admin';
import ERP from './pages/ERP';
import { APP_VERSION } from './lib/constants';
import { Smartphone, Archive as ArchiveIcon, Settings, Building2, PackagePlus, LogOut } from 'lucide-react';

/**
 * كل واجهة الموظفين في chunk منفصل — ما بيتحمّلش غير بعد الدخول.
 * يعني الـ bundle اللي بيوصل للزائر مافيهوش ولا كلمة عن الأدمن أو
 * الخروج أو الصلاحيات. الزائر عمره ما هيحمّل الملف ده أصلاً.
 */
export default function StaffShell() {
  const { logout } = useAuth();
  const { isAdmin, can, display, avatarUrl } = usePermissions();
  const admin = isAdmin();

  const [pending, setPending] = useState(0);
  useEffect(() => {
    if (!admin) return undefined;
    let alive = true;
    fetchPendingReviewsCount().then((n) => alive && setPending(n)).catch(() => {});
    return () => { alive = false; };
  }, [admin]);

  const link = ({ isActive }) =>
    `group flex min-w-[92px] flex-col items-center justify-center gap-1 rounded-2xl border px-4 py-2.5 text-xs font-black transition ${
      isActive ? 'border-accent/60 bg-accent-soft text-accent shadow-sm' : 'border-transparent text-muted hover:border-border hover:bg-surface hover:text-text'
    }`;

  const initial = display?.charAt(0)?.toUpperCase() ?? '؟';

  return (
    <>
      <header className="relative z-10 border-b border-border bg-card/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="size-10 overflow-hidden rounded-full border border-border bg-surface shadow-sm">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center font-black text-accent">{initial}</span>}
            </div>
            <div className="min-w-0"><div className="truncate text-sm font-black text-text">{display}</div><div className="num text-[10px] font-bold text-accent">{APP_VERSION}</div></div>
          </div>
          <div className="flex items-center gap-1"><ThemeToggle /><Button variant="plain" className="px-2.5 py-2" onClick={logout}><LogOut size={16}/><span className="sr-only">خروج</span></Button></div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLink to="/devices" className={link}><Smartphone size={20}/><span>الأجهزة</span></NavLink>
          <PermissionGuard can="can_create"><NavLink to="/entry" className={link}><PackagePlus size={20}/><span>إدخال جهاز</span></NavLink></PermissionGuard>
          <NavLink to="/archive" className={link}><ArchiveIcon size={20}/><span>الأرشيف</span></NavLink>
          <PermissionGuard can="can_erp"><NavLink to="/erp" className={link}><Building2 size={20}/><span>ERP</span></NavLink></PermissionGuard>
          <PermissionGuard can="can_settings"><NavLink to="/admin" className={link}><span className="relative"><Settings size={20}/>{pending > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] text-white">{pending > 99 ? '99+' : pending}</span>}</span><span>الإعدادات</span></NavLink></PermissionGuard>
        </nav>
      </header>

      <main className="relative z-1 mx-auto max-w-5xl px-4">
        <Routes>
          <Route path="/" element={<Navigate to="/devices" replace />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/d/:code" element={<DevicePage />} />
          <Route path="/entry" element={<Entry />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/erp" element={can('can_erp') ? <ERP /> : <Navigate to="/devices" replace />} />
          <Route
            path="/admin"
            element={
              can('can_settings')
                ? <Admin />
                : <Navigate to="/devices" replace />
            }
          />
          <Route path="*" element={<Navigate to="/devices" replace />} />
        </Routes>
      </main>

    </>
  );
}
