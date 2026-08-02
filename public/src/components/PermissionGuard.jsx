import { usePermissions } from '../context/PermissionContext';

/**
 * بيعرض `children` لو الشرط اتحقّق، وإلا بيعرض `fallback`.
 *
 *   <PermissionGuard can="can_delete">        <DeleteButton /></PermissionGuard>
 *   <PermissionGuard admin>                   <AdminPanel /></PermissionGuard>
 *   <PermissionGuard canEdit={device}>        <EditButton /></PermissionGuard>
 *   <PermissionGuard can="can_edit" fallback={<Locked />}>…</PermissionGuard>
 *
 * ⚠️ حماية عرض بس. الحماية الحقيقية عايشة في RLS وسياسات السيرفر —
 *    إخفاء زرار مش بيمنع حد يبعت الطلب.
 *
 * @param {string}  can       مفتاح صلاحية (can_edit …)
 * @param {boolean} admin     يتطلب أدمن
 * @param {object}  canEdit   سجل — يتطلب حق تعديله
 * @param {object}  canDelete سجل — يتطلب حق حذفه
 * @param {object}  canArchive سجل — يتطلب حق أرشفته
 * @param {Node}    fallback
 */
export default function PermissionGuard({
  can,
  admin = false,
  canEdit,
  canDelete,
  canArchive,
  fallback = null,
  children,
}) {
  const p = usePermissions();

  const checks = [
    admin && (() => p.isAdmin()),
    can && (() => p.can(can)),
    canEdit && (() => p.canEdit(canEdit)),
    canDelete && (() => p.canDelete(canDelete)),
    canArchive && (() => p.canArchive(canArchive)),
  ].filter(Boolean);

  // من غير أي شرط → ما نعرضش حاجة، أأمن من إننا نعرض كل حاجة
  if (!checks.length) return fallback;

  return checks.every((fn) => fn()) ? children : fallback;
}
