import { APP_VERSION } from '../lib/constants';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../context/PermissionContext';
import SuppliersAdmin from '../components/SuppliersAdmin';
import ProductsAdmin from '../components/ProductsAdmin';
import SalePriceGroupsAdmin from '../components/SalePriceGroupsAdmin';
import ProductLookupAdmin from '../components/ProductLookupAdmin';
import ProductMovementsAdmin from '../components/ProductMovementsAdmin';
import ProductSerialsAdmin from '../components/ProductSerialsAdmin';
import ProductWarrantiesAdmin from '../components/ProductWarrantiesAdmin';
import PurchaseInvoicesAdmin from '../components/PurchaseInvoicesAdmin';
import PurchaseOrdersAdmin from '../components/PurchaseOrdersAdmin';
import PurchaseReturnsAdmin from '../components/PurchaseReturnsAdmin';
import CustomersAdmin from '../components/CustomersAdmin';
import InventoryStockAdmin from '../components/InventoryStockAdmin';
import OpeningStockImportAdmin from '../components/OpeningStockImportAdmin';
import OffersAdmin from '../components/OffersAdmin';
import StorefrontLayoutAdmin from '../components/StorefrontLayoutAdmin';
import InventoryAdjustmentsAdmin from '../components/InventoryAdjustmentsAdmin';
import InventoryTransfersAdmin from '../components/InventoryTransfersAdmin';
import SalesInvoicesAdmin from '../components/SalesInvoicesAdmin';
import SalesReturnsAdmin from '../components/SalesReturnsAdmin';
import TreasuriesAdmin from '../components/TreasuriesAdmin';
import FinancialMovementsAdmin from '../components/FinancialMovementsAdmin';
import ExpensesAdmin from '../components/ExpensesAdmin';
import DuesAdmin from '../components/DuesAdmin';
import ERPReportsAdmin from '../components/ERPReportsAdmin';
import ReportsAdmin from '../components/ReportsAdmin';
import ERPDashboard from '../components/ERPDashboard';
import ERPAuditLog from '../components/ERPAuditLog';
import PartyStatementAdmin from '../components/PartyStatementAdmin';
import PartyPaymentsAdmin from '../components/PartyPaymentsAdmin';
import InventoryReviewAdmin from '../components/InventoryReviewAdmin';
import DocumentProtectionAdmin from '../components/DocumentProtectionAdmin';
import SystemBackupAdmin from '../components/SystemBackupAdmin';
import ERPResetAdmin from '../components/ERPResetAdmin';
import BusinessQAAdmin from '../components/BusinessQAAdmin';
import RuntimeQAAdmin from '../components/RuntimeQAAdmin';

const MODULES = [
  { key:'dashboard', perm:'can_erp', icon:'📊', label:'لوحة ERP', items:[['overview','نظرة عامة'],['audit-log','سجل العمليات']] },
  { key:'sales', perm:'can_erp_sales', icon:'🧾', label:'المبيعات', items:[['sales-all','كل المبيعات'],['sales-add','إضافة بيع'],['pos','نقطة البيع'],['sales-returns','مرتجع المبيعات'],['offers','العروض والخصومات']] },
  { key:'purchases', perm:'can_erp_purchases', icon:'🛒', label:'المشتريات', items:[['purchase-all','كل المشتريات'],['purchase-add','إضافة شراء'],['purchase-returns','مرتجع المشتريات'],['purchase-orders','طلبات الشراء'],['suppliers','الموردون']] },
  { key:'products', perm:'can_erp_products', icon:'🏷️', label:'المنتجات', items:[['products','المنتجات'],['product-add','إضافة منتج'],['sale-price-groups','مجموعات أسعار البيع'],['product-movements','حركة صنف'],['units','الوحدات'],['categories','الأقسام'],['brands','العلامات التجارية'],['serials','السريلات'],['warranties','الضمانات']] },
  { key:'inventory', perm:'can_erp_inventory', icon:'📦', label:'المخزون', items:[['stock','أرصدة المخزون'],['inventory-review','مراجعة المخزون'],['opening-stock','المخزون الافتتاحي'],['movements','حركات المخزون'],['transfers','التحويلات بين الفروع'],['adjustments','تسويات وجرد المخزون']] },
  { key:'finance', perm:'can_erp_finance', icon:'💰', label:'المالية', items:[['treasuries','الخزائن'],['customer-collections','تحصيل العملاء'],['supplier-payments','سداد الموردين'],['receipts','المقبوضات'],['payments','المدفوعات'],['treasury-transfers','تحويلات الخزائن'],['expenses','المصروفات'],['balances','أرصدة العملاء والموردين'],['customer-statement','كشف حساب عميل'],['supplier-statement','كشف حساب مورد']] },
  { key:'crm', perm:'can_erp_products', icon:'🤝', label:'العملاء والموردون', items:[['customers','العملاء'],['suppliers','الموردون']] },
  { key:'reports', perm:'can_erp_reports', icon:'📈', label:'تقارير ERP', items:[
    ['sales-reports','تقارير المبيعات'],['purchase-reports','تقارير المشتريات'],['inventory-reports','تقارير المخزون'],['finance-reports','التقارير المالية'],
    ['report-profit','الربح / الخسارة'],['report-sales-purchases','المشتريات والمبيعات'],['report-stagnant','المنتجات الراكدة'],
    ['report-user','تقرير المستخدم'],['report-shifts','الورديات'],['report-expenses','المصروفات'],['report-collections','التحصيلات النقدية'],
    ['report-top-products','المنتجات الأكثر مبيعًا']
  ] },
  { key:'storefront', perm:'can_erp', icon:'🏬', label:'المتجر الإلكتروني', items:[['storefront-layout','التحكم في عرض المتجر'],['offers','العروض والخصومات']] },
  { key:'control', perm:'can_erp', icon:'🛡️', label:'الرقابة والجاهزية', items:[['runtime-qa','Runtime QA'],['document-protection','حماية وعكس المستندات'],['system-backup','النسخ الاحتياطي'],['erp-reset','إعادة ضبط ERP'],['business-qa','Final Business QA']] },
];

export default function ERP({ standaloneKey = null, onExit = null }){
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [open, setOpen] = useState('sales');
  const [active, setActive] = useState(standaloneKey || 'overview');
  const visibleModules = useMemo(() => MODULES.filter(m => can(m.perm)).map(m => ({...m, items: m.items.filter(([k]) => k !== 'audit-log' || can('can_erp_audit')).filter(([k]) => k !== 'pos' || can('can_erp_pos')).filter(([k]) => k !== 'sale-price-groups' || can('can_erp_price_groups')).filter(([k]) => k !== 'system-backup' || can('can_erp_backup_export')).filter(([k]) => k !== 'erp-reset' || can('can_erp_reset'))})).filter(m => m.items.length), [can]);
  const allowed = useMemo(() => new Set(visibleModules.flatMap(m=>m.items.map(([k])=>k))), [visibleModules]);
  useEffect(() => { if (standaloneKey) { setActive(standaloneKey); return; } if (!allowed.has(active)) setActive(visibleModules[0]?.items[0]?.[0] || 'overview'); }, [allowed, active, visibleModules, standaloneKey]);
  const activeLabel = useMemo(() => visibleModules.flatMap(m=>m.items).find(([k])=>k===active)?.[1] || 'نظرة عامة', [active, visibleModules]);
  const activeModuleLabel = useMemo(() => visibleModules.find(m=>m.items.some(([k])=>k===active))?.label || 'ERP', [active, visibleModules]);
  const standaloneAllowed = !standaloneKey || allowed.has(standaloneKey);
  const goToItem = (k) => {
    if (k === 'pos') return navigate('/pos');
    if (k === 'purchase-add') return navigate('/purchases');
    if (k === 'sales-reports') return navigate('/reports');
    navigate(`/erp/${k}`);
  };
  if (!standaloneAllowed) return <div dir="rtl" className="flex min-h-[100dvh] items-center justify-center bg-bg p-4"><div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm"><div className="text-4xl">🔒</div><h1 className="mt-3 text-lg font-black text-text">غير مصرح بهذه الشاشة</h1><button onClick={() => navigate('/erp')} className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-black text-on-accent">العودة إلى ERP</button></div></div>;
  return <div dir="rtl" className={standaloneKey ? "min-h-[100dvh] w-full bg-bg px-3 py-4 sm:px-5" : "py-5"}>
    {standaloneKey && <div className="sticky top-0 z-30 -mx-3 -mt-4 mb-4 border-b border-border bg-card/95 px-3 py-3 shadow-sm backdrop-blur sm:-mx-5 sm:px-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="min-w-0"><div className="text-[11px] font-black text-accent">ERP · {APP_VERSION}</div><h1 className="truncate text-lg font-black text-text">{activeLabel}</h1></div>
        <button onClick={() => onExit ? onExit() : navigate('/erp')} className="shrink-0 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-black text-text">← رجوع إلى ERP</button>
      </div>
    </div>}
    {!standaloneKey && <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
      <div><div className="text-xs font-black text-accent">ERP · {APP_VERSION}</div><h1 className="mt-1 text-2xl font-black text-text">نظام إدارة الأعمال</h1><p className="mt-1 text-sm text-muted">لوحة مؤشرات ERP وسجل العمليات مع وحدات المبيعات والمشتريات والمخزون والمالية.</p></div>
      <span className="rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-xs font-black text-accent">FINAL QA · {APP_VERSION}</span>
    </div>}
    <div className={standaloneKey ? "mx-auto max-w-6xl" : "grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_260px]"}>
      <section className="min-w-0 min-h-[520px] rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5">
        <div className="mb-5 border-b border-border pb-4"><div className="text-xs font-bold text-muted">ERP ← {activeModuleLabel} ← {activeLabel}</div><h2 className="mt-1 text-xl font-black text-text">{activeLabel}</h2></div>
        {active === 'overview' ? <ERPDashboard /> : active === 'audit-log' ? <ERPAuditLog /> : active === 'suppliers' ? <SuppliersAdmin /> : active === 'products' ? <ProductsAdmin onNavigate={setActive} /> : active === 'product-add' ? <ProductsAdmin initialView="form" /> : active === 'sale-price-groups' ? <SalePriceGroupsAdmin /> : active === 'units' ? <ProductLookupAdmin table="product_units" title="الوحدة" symbol /> : active === 'categories' ? <ProductLookupAdmin table="product_categories" title="القسم" /> : active === 'brands' ? <ProductLookupAdmin table="product_brands" title="العلامة التجارية" /> : active === 'product-movements' ? <ProductMovementsAdmin /> : active === 'serials' ? <ProductSerialsAdmin /> : active === 'warranties' ? <ProductWarrantiesAdmin /> : active === 'purchase-all' ? <PurchaseInvoicesAdmin mode="list" /> : active === 'purchase-add' ? <PurchaseInvoicesAdmin mode="create" /> : active === 'purchase-orders' ? <PurchaseOrdersAdmin /> : active === 'purchase-returns' ? <PurchaseReturnsAdmin /> : active === 'stock' ? <InventoryStockAdmin /> : active === 'inventory-review' ? <InventoryReviewAdmin /> : active === 'opening-stock' ? <OpeningStockImportAdmin /> : active === 'movements' ? <ProductMovementsAdmin /> : active === 'adjustments' ? <InventoryAdjustmentsAdmin /> : active === 'transfers' ? <InventoryTransfersAdmin /> : active === 'sales-all' ? <SalesInvoicesAdmin mode="list" /> : active === 'sales-add' ? <SalesInvoicesAdmin mode="create" /> : active === 'sales-returns' ? <SalesReturnsAdmin /> : active === 'offers' ? <OffersAdmin /> : active === 'storefront-layout' ? <StorefrontLayoutAdmin /> : active === 'treasuries' ? <TreasuriesAdmin /> : active === 'customer-collections' ? <PartyPaymentsAdmin type="customer" /> : active === 'supplier-payments' ? <PartyPaymentsAdmin type="supplier" /> : active === 'receipts' ? <FinancialMovementsAdmin mode="receipt" /> : active === 'payments' ? <FinancialMovementsAdmin mode="payment" /> : active === 'treasury-transfers' ? <FinancialMovementsAdmin mode="transfer" /> : active === 'expenses' ? <ExpensesAdmin /> : active === 'balances' ? <DuesAdmin /> : active === 'customer-statement' ? <PartyStatementAdmin type="customer" /> : active === 'supplier-statement' ? <PartyStatementAdmin type="supplier" /> : active === 'customers' ? <CustomersAdmin /> : active === 'report-profit' ? <ReportsAdmin initialType="profit" standalone /> : active === 'report-sales-purchases' ? <ReportsAdmin initialType="sales-purchases" standalone /> : active === 'report-stagnant' ? <ReportsAdmin initialType="stagnant" standalone /> : active === 'report-user' ? <ReportsAdmin initialType="user" standalone /> : active === 'report-shifts' ? <ReportsAdmin initialType="shifts" standalone /> : active === 'report-expenses' ? <ReportsAdmin initialType="expenses" standalone /> : active === 'report-collections' ? <ReportsAdmin initialType="collections" standalone /> : active === 'report-top-products' ? <ReportsAdmin initialType="top-products" standalone /> : active === 'sales-reports' ? <ERPReportsAdmin type="sales" /> : active === 'purchase-reports' ? <ERPReportsAdmin type="purchases" /> : active === 'inventory-reports' ? <ERPReportsAdmin type="inventory" /> : active === 'finance-reports' ? <ERPReportsAdmin type="finance" /> : active === 'runtime-qa' ? <RuntimeQAAdmin /> : active === 'document-protection' ? <DocumentProtectionAdmin /> : active === 'system-backup' ? <SystemBackupAdmin /> : active === 'erp-reset' ? <ERPResetAdmin /> : active === 'business-qa' ? <BusinessQAAdmin /> : <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <div className="mb-3 text-5xl">🏗️</div><h3 className="text-lg font-black text-text">جاهز لمرحلته التنفيذية</h3>
          <p className="mt-2 max-w-md text-sm leading-7 text-muted">هذه الوحدة موجودة في الخطة وستُفعّل في إصدارها المخصص. تمت مراجعة الوحدات التنفيذية في {APP_VERSION}؛ لا تظهر في القائمة وحدات Placeholder غير منفذة.</p>
        </div>}
      </section>
      {!standaloneKey && <aside className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-4"><div className="text-base font-black text-accent">قائمة ERP</div><div className="mt-1 text-xs text-muted">اضغط على القسم لفتح القوائم التابعة</div></div>
        <div className="p-2">
          {visibleModules.map(m=> <div key={m.key} className="mb-1">
            <button onClick={()=>setOpen(open===m.key?'':m.key)} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-right text-sm font-black transition ${open===m.key?'bg-accent-soft text-accent':'text-text hover:bg-surface'}`}>
              <span className="flex items-center gap-2"><span>{m.icon}</span>{m.label}</span><span className={`text-xs transition-transform ${open===m.key?'rotate-180':''}`}>⌄</span>
            </button>
            {open===m.key && <div className="mr-5 mt-1 border-r border-border pr-2">{m.items.map(([k,l])=><button key={k} onClick={()=>goToItem(k)} className={`mb-1 block w-full rounded-lg px-3 py-2 text-right text-xs font-bold transition ${active===k?'bg-accent text-on-accent':'text-muted hover:bg-surface hover:text-text'}`}>{l}</button>)}</div>}
          </div>)}
        </div>
      </aside>}
    </div>
  </div>
}