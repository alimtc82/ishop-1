// مفاتيح صلاحيات ERP الديناميكية. المفاتيح الجديدة تورّث الحالة الحالية
// من الصلاحية القديمة إلى أن يضبطها المدير صراحةً من شاشة الأدوار.
export const ERP_DYNAMIC_PERMISSIONS = [
  { key: 'erp.products.categories', label: 'شاشة الأقسام', fallback: 'can_erp_products' },
  { key: 'erp.products.categories.create', label: 'إضافة قسم', fallback: 'can_erp_product_create', parent: 'erp.products.categories' },
  { key: 'erp.products.categories.image', label: 'إضافة صورة للقسم', fallback: 'can_erp_product_create', parent: 'erp.products.categories.create' },
  { key: 'erp.products.categories.edit', label: 'تعديل قسم', fallback: 'can_erp_product_edit', parent: 'erp.products.categories' },
  { key: 'erp.products.categories.delete', label: 'حذف قسم', fallback: 'can_erp_product_edit', parent: 'erp.products.categories' },
  { key: 'erp.products.categories.import', label: 'استيراد الأقسام', fallback: 'can_erp_product_import', parent: 'erp.products.categories' },
  { key: 'erp.products.categories.export', label: 'تصدير الأقسام', fallback: 'can_erp_product_export', parent: 'erp.products.categories' },
];

export const ERP_PERMISSION_KEYS = ERP_DYNAMIC_PERMISSIONS.map((item) => item.key);
export const ERP_PERMISSION_FALLBACK = Object.fromEntries(
  ERP_DYNAMIC_PERMISSIONS.map((item) => [item.key, item.fallback])
);
export const ERP_PERMISSION_PARENT = Object.fromEntries(
  ERP_DYNAMIC_PERMISSIONS.filter((item) => item.parent).map((item) => [item.key, item.parent])
);

export function rolePermissionValue(role, key) {
  if (role?.is_admin || role?.key === 'admin') return true;
  const overrides = role?.permission_overrides || {};
  if (Object.prototype.hasOwnProperty.call(overrides, key)) return overrides[key] === true;
  const fallback = ERP_PERMISSION_FALLBACK[key];
  return fallback ? role?.[fallback] !== false : role?.[key] !== false;
}
