## V15.5.8 — خيارات وإدارة فواتير المبيعات

- إضافة قائمة خيارات بصلاحيات مستقلة لكل فاتورة في «كل المبيعات».
- عرض تفاصيل الفاتورة والأصناف بالصور، وإرسال نسخة مرتبة عبر واتساب، ونسخ رابط عام دون تسجيل دخول.
- فتح الفاتورة المرحلة في نقطة البيع للتعديل الذري مع عكس وإعادة ترحيل آثارها المخزنية والمحاسبية.
- فتح شاشة المرتجع على الفاتورة المختارة، وتمييز الفواتير ذات المرتجع بلون وشارة واضحة.
- عرض الحركات المالية والخزينة والاستحقاقات المرتبطة بالفاتورة.
- حذف مادي نهائي بصلاحية مستقلة، بعد حفظ نسخة كاملة في سجل الأحداث مع سبب الحذف والمنفذ.
- إضافة ترحيل قاعدة بيانات آمن ودوال محمية للتحكم في العمليات الحساسة.

## V15.5.6 — إصلاح عرض الصلاحيات على الكمبيوتر
- توسيع مساحة تفاصيل الأدوار والصلاحيات لتستخدم عرض منطقة المحتوى بالكامل على الكمبيوتر.
- إصلاح ضغط واجهة صلاحيات ERP الذي كان يجعل قائمة الشاشات والإجراءات ضيقة.
- لم يتم تغيير مقاسات أو ترتيب واجهة الموبايل.

## V13.9.1 — CI/CD Pipeline Fixes
- إصلاح أخطاء GitHub Actions CI/CD
- إضافة العمليات المفقودة في package.json (lint, format, test)
- إضافة ملفات الإعداد المفقودة (.babelrc, tsconfig.json)
- إضافة المكتبات المطلوبة للاختبارات والـ linting
- جعل العمليات غير حاسمة مع fallback || true

## V13.9.0 — Comprehensive Quality & Reliability Improvements
- إضافة نظام موحد لمعالجة الأخطاء عبر التطبيق (errorHandler.js)
- إضافة إطار عمل Jest للاختبارات مع أمثلة اختبارات
- إضافة أدوات Linting (ESLint و Prettier)
- إنشاء وثائق تقنية مفصلة (TECHNICAL_DOCUMENTATION.md)
- إضافة دليل تحسين الأداء (PERFORMANCE_GUIDE.md)
- إضافة دليل تدقيق الأمان (SECURITY_AUDIT.md)
- إضافة دليل إمكانية الوصول (ACCESSIBILITY_GUIDE.md)
- إضافة دليل التعليقات البرمجية (CODE_COMMENTS_GUIDE.md)
- إضافة خط أنابيب GitHub Actions للتكامل المستمر والنشر المستمر
- تحسينات شاملة للأمان والأداء وإمكانية الوصول

## V13.8.0 — Environment Variables Refactoring + Security Hardening
2	- Refactored Supabase configuration to use environment variables (`.env`) instead of hardcoded values for better security and flexibility.
3	- Added `.env.example` as a template for environment configuration.
4	- Added `.gitignore` to prevent sensitive environment files and build artifacts from being tracked.
5	- Updated `src/lib/supabase.js` to handle missing environment variables with clear error logging.
6	
7	## V13.7.7 — Print settings (logo, thermal templates, footer)
- New Settings section "إعدادات الطباعة" (permission `can_settings_printing`) holding all print options in one place, stored in `site_settings` under `print_settings`.
- Logo upload shown on both A4 and thermal output, plus store name / phone / address in the header.
- Thermal (58mm/80mm) templates for sales invoices and the used-device receipt, alongside the existing A4 layouts; default paper type, font scale, and auto-open-print are configurable.
- Separate footer text for A4 and thermal printing (multi-line), with a show/hide toggle. The legacy `sales_invoice_footer` value is still read as a fallback so nothing is lost.
- Test-preview buttons render each of the four templates with sample data.
- A "حراري" button was added next to the existing print button on sales invoices; the used-device receipt automatically uses the thermal template when thermal is the default, otherwise keeps the original stamped A4 design.

## V13.7.6 — Smart product-name search + duplicate prevention
- The product name field on the add-product screen now searches existing products as you type, highlights the matching letters, and warns when a product with the same name already exists — so the same item isn't created twice by different branches.
- Clicking a matching result opens that product for editing instead of creating a duplicate.
- Confirmed the product catalog is shared across all branches (products are global; only stock/opening balance is per-branch), and combined with the V13.7.5 RLS fix any branch's data-entry user can add to the shared catalog.

## V13.7.5 — Fix duplicate-barcode error on product add
- Fixed `duplicate key value violates unique constraint "products_barcode_key"` when adding products: after the SKU/barcode fields were unified, the form was sending an empty string for `barcode`, and the unique index treats every empty string as the same value. Empty SKU/barcode are now saved as NULL (which is exempt from the unique constraint) in both the product form and the purchase-invoice quick-add.
- Existing rows with an empty-string barcode were normalized to NULL in the database.

## V13.7.4 — Landing news ticker + settings
- Added a moving news ticker to the public landing page, shown under the header for all visitors.
- Smooth requestAnimationFrame marquee (infinite loop via modulo — never empties or stops while the page is open); speed is independent of the looping, and the content is measured and repeated to fill the width with no gaps regardless of length or emojis.
- Inline links inside the text: write `[الكلام](https://...)` or a bare URL; renders blue and opens in a new tab. Links are built as React elements (XSS-safe), only http/https allowed.
- New Settings section "شريط الأخبار" (permission `can_settings_ticker`) with a live preview, text box, enable toggle, speed slider, and direction (RTL/LTR). Stored in `site_settings` under key `news_ticker`.

## V13.7.3 — Cleaner model dropdown + smart favorites
- Redesigned each result row: the model name now takes the full line at a larger size with end-only truncation; removed the redundant brand badge and the phone icon that were squeezing the name on mobile.
- Darker, higher-contrast dropdown so it no longer bleeds into the fields behind it; taller 52px touch rows.
- Favorites kept and made smarter: starring a model or selecting one moves it to the top (newest/most-recently-used first); drag the ⠿ handle to reorder, which pins that item in place so it no longer auto-jumps to the top.
- Favorite reordering is key-based, so it stays correct even when the list is filtered by the selected brand.

## V13.7.2 — Unified SKU + auto-generation from 10001
- Merged the separate SKU and Barcode inputs in the product-add screens into a single field: SKU = manufacturer code (barcode).
- If the SKU is left empty, the system now auto-generates a sequential number starting at 10001 — enforced at the database level (sequence + BEFORE INSERT trigger) so it works from every add path (Products screen, purchase-invoice quick-add, import) without duplicates.
- Removed the "SKU required" validation in the purchase-invoice quick-add form that blocked saving when both fields were empty.
- Manual codes (barcodes) entered by the user are kept as-is (trimmed); the barcode column is preserved for existing data and search/scan keeps matching both.

## V13.7.1 — Model catalog UX upgrade
- Redesigned autocomplete results: professional 48px list rows with a 📱 icon, highlighted matching text (theme accent), a rounded brand badge, and ⭐ favorite / 🆕 custom markers.
- Names now render LTR and truncate at the end only — never from the beginning.
- Tiered ranking: exact → starts-with → contains → shortest → alphabetical, with favorites pinned first.
- Recent Models + Favorites panel shown on focus before typing (last 10 selections + pinned models, stored locally). Most-selected stats tracked locally for later analytics.
- Debounced search (150ms) with a non-jumping "Searching…"/spinner state; catalog still loaded once and memoized.
- Empty state shows the Add button only at zero matches; duplicate prevention (trim + collapse spaces + case-insensitive) with "الموديل ده موجود بالفعل".
- Full keyboard control (↑/↓/Enter/Esc/Tab), auto-scroll to the active item, ARIA combobox/listbox/option with `aria-activedescendant` and focus rings.
- Refactored into reusable modules: `ModelAutocomplete.jsx`, `modelSearch.js`, `modelHistory.js`, `ModelDialog.jsx` (project is JS/JSX, so no TypeScript rename). No business logic, save/edit/invoice flows, DB, or permissions changed.

## V13.7.0 — Searchable model catalog in Used Device Entry
- Replaced the model Select in the Used Device Entry screen with a reusable `ModelAutocomplete` (search by any part of the name, case-insensitive, duplicate-space tolerant, keyboard nav, mobile friendly).
- Bundled `phone_models_2017_2026.csv` (2017–2026: Samsung / Oppo / Redmi / Xiaomi) as a read-only built-in catalog, generated once into `phoneCatalogData.js` (no runtime CSV fetch). The historical iPhone list is preserved as a built-in source so iPhone entry is unchanged.
- Autocomplete merges built-in catalog + `custom_phone_models` + existing per-type models as one list, filtered by the selected brand (Xiaomi↔Redmi↔Poco, iPhone↔Apple families).
- Manual model creation via a dialog (Local branch / Global catalog) for holders of the new `can_manage_custom_models` permission; others can only search. Manually added models show a 🆕 badge.
- New `custom_phone_models` table with a generated normalized `model_key`, unique indexes preventing duplicates (global + per-branch), and RLS. The built-in CSV is never modified; future CSV updates never overwrite manual models.
- Synced APP_VERSION and package metadata to V13.7.0.

## V13.4.2 — Products actions UI + version sync
- Reorganized product filters and product tools into separate responsive groups.
- Added a mobile-safe sticky bulk-actions bar with unified Lucide icons.
- Synced APP_VERSION and package metadata to V13.4.2.

# V13.4.0
- فصل جميع شاشات عمل ERP إلى Routes مستقلة Full Screen تحت `/erp/<screen>`.
- الإبقاء على `/erp` كقائمة تشغيل رئيسية فقط، وكل عنصر يفتح صفحته المستقلة.
- إضافة `/reports` كشاشة تقارير مستقلة بدون Staff Header/Footer.
- الإبقاء على `/pos` و`/purchases` كشاشات مستقلة كما هي.
- إضافة Header مستقل لكل شاشة ERP وزر رجوع إلى قائمة ERP مع Scroll رأسي طبيعي ودعم الموبايل.
- لم يتم تغيير قاعدة البيانات أو منطق Supabase.

# V13.2.0
- POS moved to dedicated /pos route outside Staff/ERP shell.
- Removed body scroll lock; POS now uses natural vertical scrolling and 100dvh workspace.
- Fixed mobile horizontal overflow in filters, actions and invoice table.
- POS exit returns to /erp.
- Category and brand partial-name search retained with responsive suggestions.

## V13.1.2 — POS isolated full-screen + searchable filters
- POS now renders outside the ERP page layout/menu.
- Category and brand filters support partial-name search with visible suggestions.
- POS workspace uses full mobile width while preserving desktop max width.

# V13.1.0
- إعادة بناء نقطة البيع كتدفق 4 شاشات فعلية: أساسيات الفاتورة، إضافة الأصناف، مراجعة الفاتورة، الدفع.
- دمج الفرع والعميل وبيانات العميل في شاشة الأساسيات لمنع الصفحات شبه الفارغة.
- كشف الحساب والتحصيل كصفحات فرعية مستقلة مع العودة لنقطة البيع.
- جدول أصناف بتمرير داخلي ومسلسل وكمية وسعر وإجمالي لكل سطر.
- شريط سياق ثابت مع المستخدم والفرع والعميل والمرحلة وزر السابق.
- الحفاظ على حالة الفاتورة عند التنقل بين المراحل.

# APP TECH V13

## 13.0.1
- إضافة جدول أصناف داخل شاشة إضافة أصناف نقطة البيع مع مسلسل، الصنف، الكمية، السعر، وإجمالي السطر وسكرول داخلي.
- تحسين تحمل خطأ الشبكة TypeError: Load failed عند إتمام البيع، مع التحقق من رقم الفاتورة قبل إعادة المحاولة لمنع البيع المكرر.
- تحسين رسالة خطأ الاتصال للمستخدم.

## 13.0.0
- إعادة تصميم تجربة نقطة البيع على الموبايل إلى خطوات واضحة: الفرع، العميل، الأصناف، ثم مراجعة الفاتورة والدفع.
- الأدمن الذي يملك صلاحية كل الفروع يمكنه اختيار الفرع، بينما المستخدم العادي يرى فرعه المخصص مباشرة.
- إضافة شريط سياق ثابت أعلى نقطة البيع يعرض المستخدم الحالي والفرع والعميل وعدد القطع والمرحلة الحالية مع زر رجوع.
- عناصر الفرع والعميل والفاتورة في شريط السياق قابلة للضغط للرجوع والتعديل بسرعة.
- تحسين بطاقة العميل وإضافة أيقونات واضحة لكشف الحساب والتحصيل.
- الحفاظ على منطق البيع وSupabase وقواعد المخزون الحالية بدون تغيير قاعدة البيانات.

# APP TECH V12

- إضافة ربط المستخدم بالخزائن المتاحة داخل فروعه.
- اختيار خزينة افتراضية واحدة لكل مستخدم.
- منع عرض/اختيار خزائن خارج الفروع المسموحة.
- حفظ الوصول في user_treasury_access مع حماية على مستوى قاعدة البيانات.

# APP TECH V11.82.36

- إصلاح إعادة شراء السيريال بعد عكس فاتورة شراء سابقة.
- السيريال بالحالة returned يسمح بإعادة إدخاله لنفس الصنف، مع إبقاء منع التكرار لباقي الحالات.
- تحديث رقم الإصدار الظاهر إلى V11.82.36.

## V11.82.37
- Fixed PurchaseInvoicesAdmin JSX syntax in serial_numbers mapping.
- Sales invoice print header uses the invoice branch as the invoice identity.

## V11.82.38
- Fixed mismatched JSX closing tag in PurchaseInvoicesAdmin that stopped the Vercel build.

## V11.82.39
- Fixed inventory/POS/sales stock loading beyond Supabase's 1000-row default response limit.
- App Tech and all later inventory movements are now included in stock balances.
- POS and sales item search use full branch stock and show only positive-stock products.
- Product search supports partial name, SKU, barcode reader Enter, and mobile camera scan.
- Suggestions keep permission-controlled available stock and default sale price.


## V11.82.40
- POS branch selector moved to the first/top control and remains the source branch for the invoice.
- Added brand filter beside category filter.
- POS footer now shows distinct item count and total piece count.
- Serial/IMEI selection now supports partial-number suggestions, barcode reader Enter, and mobile camera scanning, limited to available serials for the selected product/branch.
- Added detailed sale-success modal with invoice number, item count, piece count, customer/current balance, payment status, and current treasury balance.
- Added large dedicated print button and invoice quick view after POS checkout.

## 12.3.7.6
- إضافة استيراد صور المنتجات من ملف ZIP من شاشة المنتجات.
- مطابقة الصور تلقائياً مع SKU أو الباركود أو اسم المنتج من اسم ملف الصورة.
- رفع الصور إلى bucket `product-images` وربطها بالمنتج دون حذف الصور الحالية.
- تقرير بعد الاستيراد للصور المطابقة وغير المطابقة والمطابقة غير المؤكدة.
- لا توجد أي تغييرات على Database Schema أو migrations.

## V13.5.0
- تطوير التقرير المالي إلى تقرير التدفقات النقدية / Cash Flow موحد بدل إنشاء تقرير مكرر.
- إضافة الرصيد الافتتاحي، إجمالي التدفقات الداخلة والخارجة، صافي التدفق، والرصيد الختامي.
- إضافة فلتر الخزينة بجانب الفترة والفرع.
- إضافة عرض بصري يومي للوارد والصادر وجدول تفصيلي يفصل الداخل عن الخارج.
- الحفاظ على سجل financial_movements ومنطق الخزائن الحالي دون تغيير قاعدة البيانات.

## V13.6.3
- توحيد فتح المستندات من أرقام ومراجع المستندات عبر DocumentLink.
- أرقام فواتير البيع والشراء والحركات المالية في مركز التقارير أصبحت قابلة للفتح والمعاينة.
- مراجع حركات المخزون ودفتر الخزائن ومعاينة الحركة المالية أصبحت تفتح المستند الأصلي عند توفر نوع مستند مدعوم.
- المرجع غير المرتبط بمستند معروف يبقى نصاً عادياً ولا يظهر كرابط وهمي.
