-- ══════════════════════════════════════════════════════════════
--  المرحلة 1 — مفتاح ملكية حقيقي على devices
--
--  ليه؟ الملكية دلوقتي بتتقارن بـ `addedby` وهو `display_name`،
--  والاسم ده قابل للتعديل من واجهة المستخدمين. تعديل اسم موظف
--  بيخلّي كل أجهزته يتيمة ويفقد حق التعديل والحذف عليها.
--
--  ⚠️ آمنة بالكامل: بتضيف عمود وبتملاه. مفيش حذف ومفيش تغيير
--     في أي عمود موجود. `addedby` بيفضل زي ما هو (بيتعرض في
--     الواجهة وبيتستعمل في التقارير).
--
--  ⚠️ `default auth.uid()` مقصود — بيخلّي أي إدخال جديد يتملك
--     صح **من غير ما العميل يتغيّر**، فمفيش فجوة وقت النشر.
-- ══════════════════════════════════════════════════════════════

begin;

alter table public.devices
  add column if not exists owner_id uuid default auth.uid();

-- ملء البيانات القديمة من الاسم المعروض
-- (اتأكدنا قبلها: 78 جهاز، 0 من غير مالك، 0 مالك مش موجود،
--  10 مستخدمين بـ 10 أسماء معروضة مختلفة — يعني الربط واحد لواحد)
update public.devices d
   set owner_id = u.auth_id
  from public.ishop_users u
 where u.display_name = d.addedby
   and d.owner_id is null;

create index if not exists devices_owner_id_idx
  on public.devices (owner_id);

commit;

-- ══ التحقّق — لازم كله يطلع 0 ══
select
  count(*) filter (where owner_id is null)                as بدون_مالك,
  count(*) filter (where owner_id is not null
                     and not exists (select 1 from public.ishop_users u
                                      where u.auth_id = d.owner_id)) as مالك_مجهول,
  count(*) filter (where owner_id is not null
                     and (select u.display_name from public.ishop_users u
                           where u.auth_id = d.owner_id) is distinct from d.addedby)
                                                          as عدم_تطابق_مع_addedby
from public.devices d;
