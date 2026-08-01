-- ══════════════════════════════════════════════════════════════
--  المرحلة 2 — تنظيف الصلاحيات على مستوى الجدول
--
--  🔴 دي أهم خطوة في الملف كله، وأخطر من السياسات نفسها.
--
--  `authenticated` عنده دلوقتي TRUNCATE على devices.
--  **TRUNCATE مش خاضع لـ RLS إطلاقًا.** يعني أي موظف مسجّل يقدر
--  يمسح الـ78 جهاز كلهم بأمر واحد، ومهما كتبنا سياسات مش هتوقفه.
--
--  REFERENCES و TRIGGER كمان مش محتاجينهم العميل خالص.
--
--  ⚠️ نفّذ ده **قبل** السياسات. من غيره باقي الشغل بيبقى شكلي.
-- ══════════════════════════════════════════════════════════════

begin;

revoke truncate, references, trigger on public.devices from authenticated;

commit;

-- ══ التحقّق — المفروض يفضل SELECT/INSERT/UPDATE/DELETE بس ══
select privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name   = 'devices'
  and grantee      = 'authenticated'
order by privilege_type;

-- ══ افحص باقي الجداول بنفس المنطق قبل ما تقفل الموضوع ══
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as ممنوح
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee      = 'authenticated'
  and privilege_type in ('TRUNCATE','REFERENCES','TRIGGER')
group by table_name
order by table_name;
