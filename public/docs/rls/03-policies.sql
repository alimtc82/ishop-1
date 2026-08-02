-- ══════════════════════════════════════════════════════════════
--  المرحلة 3 — سياسات RLS على devices
--
--  الوضع الحالي: كل السياسات `using (true)` — يعني أي مستخدم
--  مسجّل يقدر يعدّل أو يمسح أي جهاز لو بعت الطلب مباشرة.
--  محرّك الصلاحيات كله بيخفي أزرار وبس.
--
--  ⚠️ نفّذ بعد 01 و 02.
--  ⚠️ جرّب بـ 04-test.sql الأول. سياسة غلط = 7 موظفين مقفولين.
-- ══════════════════════════════════════════════════════════════

begin;

-- ── دالة مساعدة: نسخة السيرفر من can() ──
-- بتعكس المحرّك بالحرف:
--   • غير النشط أو غير الموجود   → false
--   • الأدمن                      → true دايمًا
--   • `coalesce(col, true)`       = دلالة `!== false` (null = مسموح)
--   • مفتاح مش معروف              → false
create or replace function public.has_perm(p_key text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare u public.ishop_users%rowtype;
begin
  select * into u
    from public.ishop_users
   where auth_id = auth.uid() and is_active;

  if not found then return false; end if;
  if u.role = 'admin' then return true; end if;

  return case p_key
    when 'can_edit'    then coalesce(u.can_edit,    true)
    when 'can_delete'  then coalesce(u.can_delete,  true)
    when 'can_archive' then coalesce(u.can_archive, true)
    else false
  end;
end;
$$;

revoke all on function public.has_perm(text) from public, anon;
grant execute on function public.has_perm(text) to authenticated;

-- ── القراءة: زي ما هي، مفيش تغيير ──
--    الموظفين بيشوفوا كل الأجهزة، والزائر بيشوف غير المؤرشف بس.
--    (devices_read_auth و devices_read_guest مش هنلمسهم)

-- ── الإدخال ──
drop policy if exists devices_insert_auth on public.devices;
create policy devices_insert_own
  on public.devices for insert to authenticated
  with check (
    public.is_admin()
    or owner_id = auth.uid()
    or owner_id is null            -- الـdefault هيملاها بـ auth.uid()
  );

-- ── التعديل ──
-- ⚠️ قرار مقصود: السياسة دي **خشنة** (المالك أو الأدمن) وما بتفرّقش
--    بين can_edit و can_archive. السبب إن الأرشفة عند الداتابيز هي
--    UPDATE عادي على نفس الصف، ومفيش طريقة نضيفة لـPostgres يفرّق
--    بين «بيعدّل بيانات» و«بيأرشف» في سياسة واحدة.
--    تفصيل الأعلام بيفضل في العميل. اللي بنقفله هنا هو الأهم:
--    إنك تلمس جهاز مش بتاعك.
drop policy if exists devices_update_auth on public.devices;
create policy devices_update_own
  on public.devices for update to authenticated
  using      (public.is_admin() or owner_id = auth.uid())
  with check (public.is_admin() or owner_id = auth.uid());

-- ── الحذف ──
-- هنا التفصيل ممكن، فبنطبّق العَلَم كمان.
drop policy if exists devices_delete_auth on public.devices;
create policy devices_delete_own
  on public.devices for delete to authenticated
  using (
    public.is_admin()
    or (owner_id = auth.uid() and public.has_perm('can_delete'))
  );

commit;

-- ══ التحقّق ══
select policyname, cmd, coalesce(qual,'-') as using_expr, coalesce(with_check,'-') as check_expr
from pg_policies
where schemaname='public' and tablename='devices'
order by cmd, policyname;
