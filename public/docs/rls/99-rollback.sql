-- ══════════════════════════════════════════════════════════════
--  التراجع — رجوع كامل لحالة V11.16
--
--  خلّي الملف ده مفتوح في تبويب تاني وأنت بتنفّذ. لو أي موظف
--  اشتكى إنه مش قادر يعدّل أو يمسح، نفّذه فورًا واتناقش بعدين.
-- ══════════════════════════════════════════════════════════════

begin;

drop policy if exists devices_insert_own on public.devices;
drop policy if exists devices_update_own on public.devices;
drop policy if exists devices_delete_own on public.devices;

create policy devices_insert_auth on public.devices
  for insert to authenticated with check (true);
create policy devices_update_auth on public.devices
  for update to authenticated using (true) with check (true);
create policy devices_delete_auth on public.devices
  for delete to authenticated using (true);

drop function if exists public.has_perm(text);

commit;

-- ملاحظات:
--  • عمود owner_id بيفضل مكانه — مش بيأذي، وشيله بيضيّع البيانات.
--    لو مصرّ:  alter table public.devices drop column owner_id;
--  • TRUNCATE مش برجّعه هنا عن قصد. مفيش سبب مشروع إن العميل
--    يمسح الجدول كله. لو محتاجه لسبب ما:
--      grant truncate on public.devices to authenticated;
