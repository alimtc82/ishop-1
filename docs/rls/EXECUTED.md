# اتنفّذ فعلًا — 22 يوليو 2026

## الهجرات المطبّقة

| # | الاسم | المحتوى |
|---|---|---|
| 1 | `devices_add_owner_id` | عمود `owner_id uuid default auth.uid()` + ملء 78/78 + index |
| 2 | `devices_revoke_truncate_grants` | سحب TRUNCATE/REFERENCES/TRIGGER من `devices` |
| 3 | `revoke_truncate_all_public_tables` | نفس السحب على **كل** جداول `public` لـ`anon` و`authenticated` |
| 4 | `devices_owner_based_rls` | دالة `has_perm()` + 3 سياسات |

## السياسات الحالية على `devices`

| العملية | الشرط |
|---|---|
| SELECT (موظف) | `true` — بدون تغيير |
| SELECT (زائر) | `archived is not true` — بدون تغيير |
| INSERT | `is_admin() or owner_id = auth.uid() or owner_id is null` |
| UPDATE | `is_admin() or owner_id = auth.uid()` |
| DELETE | `is_admin() or (owner_id = auth.uid() and has_perm('can_delete'))` |

## التحقّق (على الوضع المطبّق، جوّه transaction اترجعت)

✅ موظف يعدّل جهازه · ✅ يأرشف جهازه · ✅ يضيف جهاز جديد
✅ يعدّل جهاز غيره → **يتمنع** · ✅ يمسح جهاز غيره → **يتمنع**
✅ أدمن يمسح أي جهاز · ✅ TRUNCATE → **يتمنع**

**حالة البيانات بعد كل حاجة:** 78 جهاز · 0 بدون مالك · 0 صفوف اختبار · 59 مؤرشف · 10 مستخدمين.

## 🔴 اللي اتكشف أثناء التنفيذ

`anon` كان عنده **TRUNCATE على 11 جدول**: `roles` · `catalog_types` ·
`catalog_models` · `catalog_colors` · `catalog_model_colors` ·
`device_prices` · `pricing_policies` · `site_settings` · `reviews` ·
`contact_channels` · `badge_illustrations`.

مفتاح `anon` موجود جوّه ملفات الواجهة وأي حد يقدر يقراه من المتصفح،
و**TRUNCATE مش خاضع لـ RLS**. يعني كان ممكن أي حد على الإنترنت يمسح
الجداول دي بالكامل. اتقفلت.

## اتفحص وطلع سليم

`anon` عنده كمان INSERT/UPDATE/DELETE على نفس الـ11 جدول — بس دي
**خاضعة لـ RLS**، وكل السياسات مربوطة بـ`is_admin()`. مفيش مشكلة.
(`reviews` بتسمح للزائر يضيف تقييم `approved = false` — تصميم مقصود.)

## المتبقّي

- **جرّب بنفسك على الموقع:** إدخال · تعديل · أرشفة · حذف — من حساب موظف وحساب أدمن
- **النسخ الاحتياطي** لسه ما اتأكدش منه (Dashboard → Database → Backups)
- `can_write_device_price()` ما اتفحصتش
- Storage buckets ما اتفحصتش
- العميل (V11.16) ما بيبعتش `owner_id` صراحةً — الـdefault بيتكفّل بيها،
  لكن إضافتها في `insertDevice` أوضح

## لو حصل أي مشكلة

`99-rollback.sql` بيرجّع السياسات لحالة V11.16 فورًا.
عمود `owner_id` بيفضل مكانه (مش بيأذي)، و TRUNCATE مش برجّعه.
