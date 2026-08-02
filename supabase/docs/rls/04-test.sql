-- ══════════════════════════════════════════════════════════════
--  الاختبار — بيطبّق الهجرة والسياسات جوّه transaction وبيرجّعها
--
--  ⚠️ الملف ده **ما بيغيّرش أي حاجة**. Postgres بيدعم DDL جوّه
--     transaction، فالأعمدة والدوال والسياسات كلها بتترسم وتتجرّب
--     وترجع زي ما كانت مع ROLLBACK في الآخر.
--
--  شغّله الأول. لو كل السطور طلعت ✅ عدّي على 01 → 02 → 03.
--  لو أي سطر ❌ اوقف واتناقش.
-- ══════════════════════════════════════════════════════════════

begin;

-- ══ 1) طبّق كل حاجة ══
alter table public.devices add column if not exists owner_id uuid default auth.uid();

update public.devices d set owner_id = u.auth_id
  from public.ishop_users u
 where u.display_name = d.addedby and d.owner_id is null;

revoke truncate, references, trigger on public.devices from authenticated;

create or replace function public.has_perm(p_key text)
returns boolean language plpgsql stable security definer set search_path to 'public' as $$
declare u public.ishop_users%rowtype;
begin
  select * into u from public.ishop_users where auth_id = auth.uid() and is_active;
  if not found then return false; end if;
  if u.role = 'admin' then return true; end if;
  return case p_key
    when 'can_edit'    then coalesce(u.can_edit,    true)
    when 'can_delete'  then coalesce(u.can_delete,  true)
    when 'can_archive' then coalesce(u.can_archive, true)
    else false end;
end; $$;
grant execute on function public.has_perm(text) to authenticated;

drop policy if exists devices_insert_auth on public.devices;
drop policy if exists devices_update_auth on public.devices;
drop policy if exists devices_delete_auth on public.devices;

create policy devices_insert_own on public.devices for insert to authenticated
  with check (public.is_admin() or owner_id = auth.uid() or owner_id is null);
create policy devices_update_own on public.devices for update to authenticated
  using      (public.is_admin() or owner_id = auth.uid())
  with check (public.is_admin() or owner_id = auth.uid());
create policy devices_delete_own on public.devices for delete to authenticated
  using (public.is_admin() or (owner_id = auth.uid() and public.has_perm('can_delete')));

-- ══ 2) جرّب ══
create temp table _r (البند text, النتيجة boolean, المتوقع boolean) on commit drop;

do $$
declare
  v_admin uuid; v_entry uuid;
  d_mine bigint; d_theirs bigint;
  n int;
begin
  select auth_id into v_admin from public.ishop_users where role='admin'  and is_active limit 1;
  select auth_id into v_entry from public.ishop_users where role='entry'  and is_active
     and exists (select 1 from public.devices d where d.owner_id = ishop_users.auth_id) limit 1;

  if v_admin is null or v_entry is null then
    insert into _r values ('مفيش مستخدمين كفاية للاختبار', false, true); return;
  end if;

  select id into d_mine   from public.devices where owner_id  = v_entry limit 1;
  select id into d_theirs from public.devices where owner_id is distinct from v_entry limit 1;

  -- ── موظف إدخال: جهازه هو ──
  set local role authenticated;
  execute format('set local request.jwt.claims = %L', json_build_object('sub', v_entry)::text);
  update public.devices set notes = notes where id = d_mine;  get diagnostics n = row_count;
  reset role;
  insert into _r values ('إدخال: يعدّل جهازه', n = 1, true);

  -- ── موظف إدخال: جهاز غيره ──
  set local role authenticated;
  execute format('set local request.jwt.claims = %L', json_build_object('sub', v_entry)::text);
  update public.devices set notes = notes where id = d_theirs; get diagnostics n = row_count;
  reset role;
  insert into _r values ('إدخال: يعدّل جهاز غيره (لازم يتمنع)', n = 0, true);

  -- ── موظف إدخال: يمسح جهاز غيره ──
  set local role authenticated;
  execute format('set local request.jwt.claims = %L', json_build_object('sub', v_entry)::text);
  delete from public.devices where id = d_theirs; get diagnostics n = row_count;
  reset role;
  insert into _r values ('إدخال: يمسح جهاز غيره (لازم يتمنع)', n = 0, true);

  -- ── أدمن: يعدّل أي جهاز ──
  set local role authenticated;
  execute format('set local request.jwt.claims = %L', json_build_object('sub', v_admin)::text);
  update public.devices set notes = notes where id = d_theirs; get diagnostics n = row_count;
  reset role;
  insert into _r values ('أدمن: يعدّل أي جهاز', n = 1, true);

  -- ── أدمن: يمسح أي جهاز ──
  set local role authenticated;
  execute format('set local request.jwt.claims = %L', json_build_object('sub', v_admin)::text);
  delete from public.devices where id = d_theirs; get diagnostics n = row_count;
  reset role;
  insert into _r values ('أدمن: يمسح أي جهاز', n = 1, true);

  -- ── إدخال: يضيف جهاز جديد (الـdefault بيملّي المالك) ──
  set local role authenticated;
  execute format('set local request.jwt.claims = %L', json_build_object('sub', v_entry)::text);
  begin
    insert into public.devices (model, storage, addedby, archived)
    values ('__TEST__', '__TEST__', 'x', false);
    n := 1;
  exception when others then n := 0;
  end;
  reset role;
  insert into _r values ('إدخال: يضيف جهاز جديد', n = 1, true);

  -- ── TRUNCATE لازم يترفض ──
  set local role authenticated;
  execute format('set local request.jwt.claims = %L', json_build_object('sub', v_entry)::text);
  begin
    execute 'truncate public.devices'; n := 1;
  exception when others then n := 0;
  end;
  reset role;
  insert into _r values ('إدخال: TRUNCATE (لازم يترفض)', n = 0, true);
end $$;

-- ══ 3) النتيجة ══
select case when النتيجة = المتوقع then '✅' else '❌' end as "",
       البند
from _r;

select case when bool_and(النتيجة = المتوقع) then '✅ كله تمام — عدّي على 01'
            else '❌ فيه فشل — اوقف' end as الخلاصة
from _r;

rollback;   -- ⚠️ مهم: مفيش أي حاجة اتغيّرت
