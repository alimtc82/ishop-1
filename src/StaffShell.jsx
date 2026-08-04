import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { usePermissions } from './context/PermissionContext';
import { useLiveSync } from './context/LiveSyncContext';
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
import ERPReportsHub from './components/ERPReportsHub';
import PointOfSale from './components/PointOfSale';
import PurchasePointOfSale from './components/PurchasePointOfSale';
import ShiftGate from './components/ShiftGate';
import ShiftReport from './components/ShiftReport';
import { APP_VERSION } from './lib/constants';
import { Smartphone, Archive as ArchiveIcon, Settings, Building2, PackagePlus, LogOut } from 'lucide-react';

/**
 * PosWithShift — يلف PointOfSale ببوابة الوردية.
 * يعرض ShiftGate أولاً، وبعد فتح الوردية يعرض PointOfSale.
 * زر تقرير الوردية موجود في شريط نقطة البيع.
 */
function PosWithShift({ onExit }) {
  const [activeShift, setActiveShift] = useState(null);
  const [showReport, setShowReport] = useState(false);

  function handleShiftClosed() {
    setShowReport(false);
    setActiveShift(null);
  }

  if (!activeShift) {
    return <ShiftGate onShiftReady={(shift) => setActiveShift(shift)} />;
  }

  return (
    <>
      <PointOfSale
        onExit={onExit}
        activeShift={activeShift}
        onOpenShiftReport={() => setShowReport(true)}
      />
      {showReport && (
        <ShiftReport
          shift={activeShift}
          onClose={() => setShowReport(false)}
          onShiftClosed={handleShiftClosed}
        />
      )}
    </>
  );
}

/**
 * كل واجهة الموظفين في chunk منفصل — ما بيتحمّلش غير بعد الدخول.
 * يعني الـ bundle اللي بيوصل للزائر مافيهوش ولا كلمة عن الأدمن أو
 * الخروج أو الصلاحيات. الزائر عمره ما هيحمّل الملف ده أصلاً.
 */
export default function StaffShell() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, can, display, avatarUrl } = usePermissions();
  const { revision } = useLiveSync();
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

  // ERP work screens are dedicated application routes: no staff header/nav/footer.
  // /erp remains the launcher; every work item opens in its own full-screen route.
  const erpSectionMatch = location.pathname.match(/^\/erp\/([^/]+)$/);
  if (erpSectionMatch) {
    return can('can_erp')
      ? <ERP key={`erp-${revision}`} standaloneKey={decodeURIComponent(erpSectionMatch[1])} onExit={() => navigate('/erp')} />
      : <Navigate to="/devices" replace />;
  }

  if (location.pathname === '/reports') {
    return can('can_erp') && can('can_erp_reports')
      ? <ERPReportsHub key={`reports-${revision}`} onExit={() => navigate('/erp')} />
      : <Navigate to="/erp" replace />;
  }

  // /pos is a dedicated application route: no staff header, nav, ERP shell, or footer.
  if (location.pathname === '/purchases') {
    return can('can_erp') && can('can_erp_purchases') && can('can_erp_purchase_create')
      ? <PurchasePointOfSale key={`purchases-${revision}`} onExit={() => navigate('/erp')} />
      : <Navigate to="/erp" replace />;
  }

  if (location.pathname === '/pos') {
    if (!can('can_erp') || !can('can_erp_pos')) return <Navigate to="/erp" replace />;
    return <PosWithShift key={`pos-${revision}`} onExit={() => navigate('/erp')} />;
  }

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
        <Routes key={`live-${revision}`}>
          <Route path="/" element={<Navigate to="/devices" replace />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/d/:code" element={<DevicePage />} />
          <Route path="/entry" element={<Entry />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/erp" element={can('can_erp') ? <ERP /> : <Navigate to="/devices" replace />} />
          <Route path="/pos" element={can('can_erp') && can('can_erp_pos') ? <PointOfSale onExit={() => navigate('/erp')} /> : <Navigate to="/erp" replace />} />
          <Route path="/purchases" element={can('can_erp') && can('can_erp_purchases') && can('can_erp_purchase_create') ? <PurchasePointOfSale onExit={() => navigate('/erp')} /> : <Navigate to="/erp" replace />} />
          <Route path="/reports" element={can('can_erp') && can('can_erp_reports') ? <ERPReportsHub onExit={() => navigate('/erp')} /> : <Navigate to="/erp" replace />} />
          <Route path="/erp/:section" element={can('can_erp') ? <ERP /> : <Navigate to="/devices" replace />} />
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
