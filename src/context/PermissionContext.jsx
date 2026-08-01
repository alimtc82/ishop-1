import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import * as svc from '../lib/permissionService';

/**
 * ══ PermissionContext ═════════════════════════════════════════
 * بيغلّف PermissionService ويوصّله لأي كومبوننت.
 *
 * ⚠️ ما بيجيبش أي داتا وما بيلمسش الجلسة — بيقرا صف المستخدم من
 *    AuthContext وخلاص. مفيش نداء شبكة هنا ولا تغيير في الدخول.
 *
 * الاستعمال:
 *    const { can, isAdmin } = usePermissions();
 *    if (can('can_delete')) { ... }
 * ══════════════════════════════════════════════════════════════
 */
const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { userRow, isGuest } = useAuth();

  const value = useMemo(() => ({
    /** المستخدم عنده الصلاحية دي؟ الأدمن بياخد الكل تلقائيًا. */
    can: (key) => svc.can(userRow, key),

    /** النظام هيطلب خطوة إضافية (سر حذف/أرشفة)؟ من غير تخطّي للأدمن. */
    requires: (key) => svc.requires(userRow, key),

    /** أدمن؟ */
    isAdmin: () => svc.isAdmin(userRow),

    // ── فحوصات على مستوى السجل ──
    canEdit: (record) => svc.canEditRecord(record, userRow),
    canDelete: (record) => svc.canDeleteRecord(record, userRow),
    canArchive: (record) => svc.canArchiveRecord(record, userRow),
    canTouch: (record) => svc.canTouchRecord(record, userRow),

    // ── معلومات مساعدة ──
    isGuest,
    role: svc.roleOf(userRow),
    display: svc.displayOf(userRow),
    avatarUrl: userRow?.avatar_url || '',
    userId: userRow?.id ?? null,
    primaryBranch: userRow?.branch || '',
  }), [userRow, isGuest]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions لازم يتنادى جوّه PermissionProvider');
  return ctx;
}
