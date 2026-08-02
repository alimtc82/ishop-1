import { supabase } from './supabase';

// ══════════════════════════════════════════════════════════════
//  printSettings — إعدادات الطباعة الموحّدة (V13.9.2)
//
//  بتتخزّن في site_settings تحت المفتاح print_settings:
//  {
//    logo_url, show_logo, store_name, store_phone, store_address,
//    paper: 'a4' | 'thermal', thermal_width: '58'|'80',
//    footer_a4, footer_thermal, show_footer,
//    font_scale, auto_print,
//    branches: {
//      "اسم الفرع": { store_name, store_phone, store_address, logo_url, footer_a4, footer_thermal }
//    }
//  }
//
//  منطق الأولوية:
//    إعدادات الفرع (لو موجودة) تتغلب على الإعدادات العامة.
//    الحقول الناقصة في الفرع ترث من الإعدادات العامة تلقائياً.
//    الإعدادات التقنية (paper, thermal_width, font_scale, auto_print)
//    دايماً عامة ومشتركة بين كل الفروع.
//
//  الفوتر القديم (sales_invoice_footer) بيتقرا كقيمة احتياطية
//  عشان مايضيعش أي إعداد قديم.
// ══════════════════════════════════════════════════════════════

export const PRINT_DEFAULTS = {
  logo_url: '',
  show_logo: true,
  store_name: '',
  store_phone: '',
  store_address: '',
  paper: 'a4',
  thermal_width: '80',
  footer_a4: '',
  footer_thermal: 'شكرًا لتعاملكم معنا',
  show_footer: true,
  font_scale: 100,
  auto_print: true,
  branches: {},
};

// الحقول الخاصة بكل فرع (يمكن تخصيصها لكل فرع على حدة)
export const BRANCH_OVERRIDABLE_KEYS = [
  'store_name', 'store_phone', 'store_address', 'logo_url',
  'show_logo', 'footer_a4', 'footer_thermal', 'show_footer',
];

let _cache = null;

/** قراءة الإعدادات الكاملة من قاعدة البيانات (مع كاش) */
async function _loadRaw(force = false) {
  if (_cache && !force) return _cache;
  const out = { ...PRINT_DEFAULTS };
  try {
    const { data } = await supabase
      .from('site_settings').select('key,value')
      .in('key', ['print_settings', 'sales_invoice_footer']);
    for (const r of data || []) {
      if (r.key === 'print_settings') {
        const v = typeof r.value === 'string' ? safeParse(r.value) : r.value;
        Object.assign(out, v || {});
        // تأكد إن branches دايماً object
        if (!out.branches || typeof out.branches !== 'object') out.branches = {};
      }
    }
    // توافق: الفوتر القديم لو مفيش فوتر A4 جديد
    if (!out.footer_a4) {
      const legacy = (data || []).find((r) => r.key === 'sales_invoice_footer');
      const lv = legacy && (typeof legacy.value === 'string' ? legacy.value : legacy.value?.text);
      if (lv) out.footer_a4 = String(lv);
    }
  } catch { /* الافتراضي كفاية */ }
  _cache = out;
  return out;
}

/**
 * قراءة إعدادات الطباعة — مع دعم الفروع.
 * @param {string|null} branch - اسم الفرع (اختياري). لو موجود، تُدمج إعداداته فوق الإعدادات العامة.
 * @param {boolean} force - تجاهل الكاش وإعادة القراءة من قاعدة البيانات.
 */
export async function getPrintSettings(branch = null, force = false) {
  const raw = await _loadRaw(force);

  // لو مفيش فرع أو الفرع مش عنده إعدادات خاصة → رجّع الإعدادات العامة
  if (!branch || !raw.branches?.[branch]) return raw;

  // دمج إعدادات الفرع فوق الإعدادات العامة (فقط الحقول القابلة للتخصيص)
  const branchOverrides = raw.branches[branch] || {};
  const merged = { ...raw };
  for (const key of BRANCH_OVERRIDABLE_KEYS) {
    // نستخدم قيمة الفرع فقط لو هي مش فاضية (مش '' أو null أو undefined)
    const val = branchOverrides[key];
    if (val !== undefined && val !== null && val !== '') {
      merged[key] = val;
    }
  }
  return merged;
}

export function clearPrintCache() { _cache = null; }

export const esc = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const money = (n) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ترويسة موحّدة (لوجو + بيانات المحل) */
export function headerHtml(s, title, sub = '') {
  const logo = s.show_logo && s.logo_url
    ? `<img class="logo" src="${esc(s.logo_url)}" alt="">` : '';
  const info = [s.store_phone, s.store_address].filter(Boolean).map(esc).join(' · ');
  return `<div class="head">${logo}
    ${s.store_name ? `<div class="store">${esc(s.store_name)}</div>` : ''}
    ${info ? `<div class="info">${info}</div>` : ''}
    <div class="title">${esc(title)}</div>
    ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>`;
}

/** فوتر حسب نوع الورق */
export function footerHtml(s, thermal) {
  if (!s.show_footer) return '';
  const t = thermal ? s.footer_thermal : s.footer_a4;
  if (!String(t || '').trim()) return '';
  return `<div class="foot">${esc(t).replace(/\n/g, '<br>')}</div>`;
}

/** ستايل مشترك — بيراعي عرض الحراري ومقياس الخط */
export function baseCss(s, thermal) {
  const scale = Math.max(60, Math.min(160, Number(s.font_scale) || 100)) / 100;
  const w = s.thermal_width === '58' ? 58 : 80;
  return thermal ? `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',Arial,sans-serif;color:#000;background:#fff;
       width:${w}mm;padding:3mm 2mm;font-size:${11 * scale}px;line-height:1.55}
  .head{text-align:center;border-bottom:1px dashed #000;padding-bottom:6px;margin-bottom:6px}
  .logo{max-width:${w - 20}mm;max-height:18mm;object-fit:contain;margin-bottom:4px}
  .store{font-size:${14 * scale}px;font-weight:900}
  .info{font-size:${9 * scale}px}
  .title{font-size:${12 * scale}px;font-weight:800;margin-top:4px}
  .sub{font-size:${9 * scale}px}
  .row{display:flex;justify-content:space-between;gap:6px;font-size:${10 * scale}px}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{text-align:right;padding:2px 1px;font-size:${10 * scale}px}
  thead th{border-top:1px dashed #000;border-bottom:1px dashed #000}
  .tot{border-top:1px dashed #000;margin-top:6px;padding-top:4px}
  .tot .row{font-size:${11 * scale}px}
  .tot .grand{font-size:${13 * scale}px;font-weight:900}
  .foot{text-align:center;border-top:1px dashed #000;margin-top:8px;padding-top:6px;font-size:${9 * scale}px;white-space:pre-line}
  .no-print{margin:6px 0;text-align:center}
  @page{size:${w}mm auto;margin:0}
  @media print{.no-print{display:none!important}}
  ` : `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',Arial,sans-serif;color:#111;background:#fff;padding:14mm 10mm;font-size:${13 * scale}px}
  .head{text-align:center;border-bottom:2px solid #222;padding-bottom:10px;margin-bottom:14px}
  .logo{max-height:26mm;max-width:70mm;object-fit:contain;margin-bottom:6px}
  .store{font-size:${20 * scale}px;font-weight:900}
  .info{font-size:${11 * scale}px;color:#555}
  .title{font-size:${15 * scale}px;font-weight:800;margin-top:6px}
  .sub{font-size:${11 * scale}px;color:#555}
  .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}
  .box{border:1px solid #bbb;border-radius:8px;padding:8px;font-size:${11 * scale}px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{border:1px solid #bbb;padding:7px;text-align:right;font-size:${12 * scale}px}
  th{background:#f2f2f2}
  .tot{margin-top:14px;border:2px solid #222;padding:10px}
  .grand{font-size:${15 * scale}px;font-weight:900}
  .foot{margin-top:22px;padding-top:12px;border-top:2px solid #222;font-size:${11 * scale}px;line-height:1.8;white-space:pre-line}
  .no-print{margin-bottom:12px}
  @page{size:A4 portrait;margin:0}
  @media print{.no-print{display:none!important}}
  `;
}

/** يفتح نافذة ويطبع */
export function openAndPrint(html, s, thermal) {
  const w = window.open('', '_blank', thermal ? 'width=420,height=760' : 'width=900,height=900');
  if (!w) { alert('اسمح بالنوافذ المنبثقة عشان الطباعة تشتغل'); return; }
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap" rel="stylesheet">
<style>${baseCss(s, thermal)}</style></head><body>
<div class="no-print"><button onclick="window.print()">🖨️ طباعة</button></div>
${html}</body></html>`);
  w.document.close();
  if (s.auto_print !== false) setTimeout(() => { w.focus(); w.print(); }, 350);
}

// ── فاتورة بيع ────────────────────────────────────────────────
// branch: اسم الفرع (من row.branch) — يُستخدم لتحديد إعدادات الطباعة الصحيحة
export async function printSalesInvoice(row, opts = {}) {
  const s = await getPrintSettings(row.branch || null);
  const thermal = (opts.paper || s.paper) === 'thermal';
  const items = row.items || [];
  const title = 'فاتورة مبيعات';
  const sub = `رقم: ${row.invoice_number || ''}`;

  const body = thermal
    ? `${headerHtml(s, title, sub)}
       <div class="row"><span>التاريخ</span><span>${esc(row.invoice_date || '')}</span></div>
       <div class="row"><span>العميل</span><span>${esc(row.customer_name || 'عميل نقدي')}</span></div>
       <div class="row"><span>الفرع</span><span>${esc(row.branch || '—')}</span></div>
       <table><thead><tr><th>الصنف</th><th>كمية</th><th>سعر</th><th>إجمالي</th></tr></thead><tbody>
       ${items.map((x) => `<tr><td>${esc(x.products?.name || '')}</td><td>${esc(x.quantity)}</td><td>${money(x.unit_price ?? x.unit_cost)}</td><td>${money(x.line_total ?? (Number(x.quantity || 0) * Number(x.unit_price ?? x.unit_cost ?? 0) - Number(x.discount || 0)))}</td></tr>`).join('')}
       </tbody></table>
       <div class="tot">
         <div class="row"><span>الإجمالي</span><span>${money(row.subtotal)}</span></div>
         <div class="row"><span>الخصم</span><span>${money(row.discount)}</span></div>
         <div class="row grand"><span>الصافي</span><span>${money(row.total)}</span></div>
       </div>${footerHtml(s, true)}`
    : `${headerHtml(s, title, sub)}
       <div class="meta">
         <div class="box">التاريخ<br><b>${esc(row.invoice_date || '')}</b></div>
         <div class="box">العميل<br><b>${esc(row.customer_name || 'عميل نقدي')}</b></div>
         <div class="box">الفرع<br><b>${esc(row.branch || '—')}</b></div>
       </div>
       <table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الإجمالي</th><th>السيريال / IMEI</th></tr></thead><tbody>
       ${items.map((x) => `<tr><td>${esc(x.products?.sku || '')} · ${esc(x.products?.name || '')}</td><td>${esc(x.quantity)}</td><td>${money(x.unit_price ?? x.unit_cost)}</td><td>${money(x.discount)}</td><td>${money(x.line_total ?? (Number(x.quantity || 0) * Number(x.unit_price ?? x.unit_cost ?? 0) - Number(x.discount || 0)))}</td><td>${esc((x.serial_numbers || []).join(' / ') || '—')}</td></tr>`).join('')}
       </tbody></table>
       <div class="tot">
         <div>الإجمالي قبل الخصم: <b>${money(row.subtotal)}</b></div>
         <div>الخصم: <b>${money(row.discount)}</b></div>
         <div class="grand">صافي الفاتورة: ${money(row.total)}</div>
       </div>${footerHtml(s, false)}`;

  openAndPrint(body, s, thermal);
}

// ── إيصال استلام جهاز مستعمل ──────────────────────────────────
// branch: اسم الفرع (من d.branch) — يُستخدم لتحديد إعدادات الطباعة الصحيحة
export async function printUsedDeviceReceipt(d, opts = {}) {
  const s = await getPrintSettings(d.branch || null);
  const thermal = (opts.paper || s.paper) === 'thermal';
  const date = d.date || new Date().toLocaleDateString('ar-EG');
  const title = 'إيصال استلام جهاز مستعمل';

  const rows = [
    ['الموديل', d.model], ['الذاكرة', d.storage], ['اللون', d.color],
    ['IMEI', d.imei], ['البطارية', d.battery], ['الحالة', d.condition],
    ['المبلغ', d.price != null ? money(d.price) : ''],
    ['اسم العميل', d.seller_name], ['التليفون', d.seller_phone],
  ].filter(([, v]) => String(v ?? '').trim() !== '');

  const body = thermal
    ? `${headerHtml(s, title, date)}
       ${rows.map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}
       <div class="tot"><div class="row"><span>التوقيع</span><span>____________</span></div></div>
       ${footerHtml(s, true)}`
    : `${headerHtml(s, title, date)}
       <table><tbody>
       ${rows.map(([k, v]) => `<tr><th style="width:32%">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
       </tbody></table>
       <div class="tot">أقرّ باستلام المبلغ المذكور وتسليم الجهاز بحالته الموضحة أعلاه.</div>
       <div class="meta" style="margin-top:26px">
         <div class="box">توقيع البائع<br><br><br></div>
         <div class="box">توقيع الموظف<br><br><br></div>
         <div class="box">التاريخ<br><b>${esc(date)}</b></div>
       </div>${footerHtml(s, false)}`;

  openAndPrint(body, s, thermal);
}

function safeParse(x) { try { return JSON.parse(x); } catch { return null; } }
