import { useEffect, useState } from 'react';
import { saveSetting } from '../lib/adminApi';
import { useToast } from '../context/ToastContext';
import { publicMediaUrl, uploadMedia } from '../lib/productMedia';
import {
  getPrintSettings, clearPrintCache, PRINT_DEFAULTS,
  printSalesInvoice, printUsedDeviceReceipt,
} from '../lib/printSettings';

// ══════════════════════════════════════════════════════════════
//  PrintSettingsAdmin — إعدادات الطباعة (V13.7.7)
//  لوجو + بيانات المحل + نوع الورق (A4/حراري) + فوتر لكل نوع
//  + معاينة تجريبية للفاتورة وإيصال الجهاز المستعمل.
// ══════════════════════════════════════════════════════════════

const input =
  'w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm text-text ' +
  'outline-none transition placeholder:text-muted min-h-[46px] ' +
  'focus:border-accent focus:ring-3 focus:ring-[var(--focus-ring)]';

const Card = ({ title, hint, children }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <h3 className="text-sm font-black">{title}</h3>
    {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    <div className="mt-3 space-y-3">{children}</div>
  </div>
);

const Row = ({ label, sub, children }) => (
  <div className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
    <div><div className="text-sm font-bold">{label}</div>{sub && <div className="text-[11px] text-muted">{sub}</div>}</div>
    {children}
  </div>
);

const Toggle = ({ on, onClick }) => (
  <button type="button" role="switch" aria-checked={on} onClick={onClick}
    className={`relative h-7 w-12 shrink-0 rounded-full border transition ${on ? 'border-accent-line bg-accent-soft' : 'border-border bg-surface'}`}>
    <span className={`absolute top-0.5 size-5 rounded-full transition-all ${on ? 'start-0.5 bg-accent' : 'end-0.5 bg-muted'}`} />
  </button>
);

export default function PrintSettingsAdmin() {
  const { show } = useToast();
  const [cfg, setCfg] = useState(PRINT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getPrintSettings(true).then((s) => { setCfg({ ...PRINT_DEFAULTS, ...s }); }).finally(() => setLoading(false));
  }, []);

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));

  async function onLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadMedia('product-images', file, 'branding');
      set({ logo_url: publicMediaUrl('product-images', path) });
      show('✅ تم رفع اللوجو — اضغط حفظ');
    } catch (err) {
      show('❌ ' + (err.message || 'فشل رفع اللوجو'), 'error');
    } finally { setUploading(false); e.target.value = ''; }
  }

  async function save() {
    setSaving(true);
    try {
      await saveSetting('print_settings', {
        ...cfg,
        font_scale: Number(cfg.font_scale) || 100,
      });
      clearPrintCache();
      show('✅ تم حفظ إعدادات الطباعة');
    } catch (err) {
      show('❌ ' + (err.message || 'فشل الحفظ'), 'error');
    } finally { setSaving(false); }
  }

  // معاينة ببيانات تجريبية
  function preview(kind, paper) {
    clearPrintCache();
    const apply = async () => {
      // نستخدم الإعداد الحالي على الشاشة (حتى لو لسه متحفظش)
      const tmp = { ...cfg };
      const orig = await getPrintSettings(true);
      Object.assign(orig, tmp);
      if (kind === 'invoice') {
        printSalesInvoice({
          invoice_number: 'POS-DEMO-001', invoice_date: new Date().toISOString().slice(0, 10),
          customer_name: 'عميل تجريبي', branch: 'الفرع الرئيسي',
          subtotal: 8500, discount: 300, total: 8200,
          items: [
            { products: { sku: '10001', name: 'REDMI 15C' }, quantity: 1, unit_price: 8500, discount: 300, line_total: 8200, serial_numbers: ['356789012345678'] },
          ],
        }, { paper });
      } else {
        printUsedDeviceReceipt({
          model: 'iPhone 13 Pro', storage: '256GB', color: 'أزرق', imei: '356789012345678',
          battery: '89%', condition: 'ممتازة', price: 23700,
          seller_name: 'عميل تجريبي', seller_phone: '01000000000',
        }, { paper });
      }
    };
    apply();
  }

  if (loading) return <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted">جاري التحميل…</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-black">🖨️ إعدادات الطباعة</h2>
        <p className="mt-1 text-xs text-muted">تنطبق على فواتير البيع وإيصال استلام جهاز مستعمل — للطباعة العادية (A4) والحرارية.</p>
      </div>

      {/* اللوجو وبيانات المحل */}
      <Card title="اللوجو وبيانات المحل" hint="بيظهر أعلى الفاتورة العادية والحرارية.">
        <div className="flex items-center gap-3">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-surface">
            {cfg.logo_url
              ? <img src={cfg.logo_url} alt="" className="size-full object-contain" />
              : <span className="text-[10px] text-muted">لا يوجد</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-xl border border-accent-line px-4 py-2 text-xs font-black text-accent">
              {uploading ? 'جاري الرفع…' : '📤 رفع لوجو'}
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} disabled={uploading} />
            </label>
            {cfg.logo_url && (
              <button type="button" onClick={() => set({ logo_url: '' })}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted">إزالة</button>
            )}
          </div>
        </div>

        <Row label="إظهار اللوجو" sub="إخفاؤه بدون حذفه">
          <Toggle on={!!cfg.show_logo} onClick={() => set({ show_logo: !cfg.show_logo })} />
        </Row>

        <input className={input} placeholder="اسم المحل" value={cfg.store_name} onChange={(e) => set({ store_name: e.target.value })} />
        <input className={input} placeholder="التليفون" value={cfg.store_phone} onChange={(e) => set({ store_phone: e.target.value })} />
        <input className={input} placeholder="العنوان" value={cfg.store_address} onChange={(e) => set({ store_address: e.target.value })} />
      </Card>

      {/* الإعدادات الأساسية */}
      <Card title="الإعدادات الأساسية">
        <Row label="نوع الورق الافتراضي" sub="اللي هيُستخدم عند الطباعة">
          <div className="flex overflow-hidden rounded-xl border border-border">
            {[['a4', 'A4 عادي'], ['thermal', 'حراري']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set({ paper: v })}
                className={`px-3 py-2 text-[12px] font-black ${cfg.paper === v ? 'bg-accent text-on-accent' : 'text-muted'}`}>{l}</button>
            ))}
          </div>
        </Row>

        <Row label="عرض الورق الحراري">
          <div className="flex overflow-hidden rounded-xl border border-border">
            {[['58', '58mm'], ['80', '80mm']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set({ thermal_width: v })}
                className={`px-3 py-2 text-[12px] font-black ${cfg.thermal_width === v ? 'bg-accent text-on-accent' : 'text-muted'}`}>{l}</button>
            ))}
          </div>
        </Row>

        <Row label="حجم الخط" sub={`${cfg.font_scale}%`}>
          <input type="range" min="60" max="160" step="5" value={cfg.font_scale}
            onChange={(e) => set({ font_scale: Number(e.target.value) })}
            className="w-40" style={{ accentColor: 'var(--accent)' }} />
        </Row>

        <Row label="فتح نافذة الطباعة تلقائيًا" sub="لو مقفول، هتضغط زر الطباعة بنفسك">
          <Toggle on={cfg.auto_print !== false} onClick={() => set({ auto_print: !(cfg.auto_print !== false) })} />
        </Row>
      </Card>

      {/* الفوتر */}
      <Card title="نص الفوتر" hint="بيظهر أسفل الطباعة — تقدر تكتب أكتر من سطر (شروط الضمان، شكرًا لتعاملكم…).">
        <Row label="إظهار الفوتر">
          <Toggle on={!!cfg.show_footer} onClick={() => set({ show_footer: !cfg.show_footer })} />
        </Row>
        <div>
          <label className="mb-1 block text-xs font-bold text-muted">فوتر الطباعة العادية (A4)</label>
          <textarea className={input} rows={3} value={cfg.footer_a4} onChange={(e) => set({ footer_a4: e.target.value })}
            placeholder="مثال: الضمان 6 شهور ضد عيوب الصناعة — لا يشمل الكسر أو المياه." />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-muted">فوتر الطباعة الحرارية</label>
          <textarea className={input} rows={2} value={cfg.footer_thermal} onChange={(e) => set({ footer_thermal: e.target.value })}
            placeholder="مثال: شكرًا لتعاملكم معنا" />
        </div>
      </Card>

      {/* المعاينة */}
      <Card title="معاينة تجريبية" hint="بيفتح نموذج ببيانات وهمية بالإعدادات الحالية (احفظ الأول عشان تُطبَّق في باقي النظام).">
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => preview('invoice', 'a4')} className="rounded-xl border border-accent-line px-3 py-2.5 text-xs font-black text-accent">🧾 فاتورة بيع — A4</button>
          <button type="button" onClick={() => preview('invoice', 'thermal')} className="rounded-xl border border-accent-line px-3 py-2.5 text-xs font-black text-accent">🧾 فاتورة بيع — حراري</button>
          <button type="button" onClick={() => preview('receipt', 'a4')} className="rounded-xl border border-accent-line px-3 py-2.5 text-xs font-black text-accent">📱 إيصال جهاز مستعمل — A4</button>
          <button type="button" onClick={() => preview('receipt', 'thermal')} className="rounded-xl border border-accent-line px-3 py-2.5 text-xs font-black text-accent">📱 إيصال جهاز مستعمل — حراري</button>
        </div>
      </Card>

      <button type="button" onClick={save} disabled={saving}
        className="w-full rounded-xl bg-accent py-3 text-sm font-black text-on-accent disabled:opacity-60">
        {saving ? 'جاري الحفظ…' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
}
