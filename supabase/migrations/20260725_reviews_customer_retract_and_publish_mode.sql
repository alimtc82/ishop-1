-- V11.41 — review moderation switch + customer self-retraction.
-- Applied to production Supabase on 2026-07-25.
insert into public.site_settings (key, value, updated_at)
values ('reviews_require_approval', 'true'::jsonb, now())
on conflict (key) do nothing;

drop policy if exists rv_insert_anonymous_pending on public.reviews;
create policy rv_insert_anonymous_publish_mode on public.reviews for insert to anon
with check (
  customer_id is null and avatar_url is null
  and approved = not coalesce((select case when jsonb_typeof(s.value)='boolean' then (s.value #>> '{}')::boolean else true end from public.site_settings s where s.key='reviews_require_approval'), true)
);

drop policy if exists rv_insert_authenticated_customer on public.reviews;
create policy rv_insert_authenticated_customer_publish_mode on public.reviews for insert to authenticated
with check (
  customer_id is not null
  and exists (select 1 from public.customers c where c.id=reviews.customer_id and c.auth_user_id=(select auth.uid()))
  and approved = not coalesce((select case when jsonb_typeof(s.value)='boolean' then (s.value #>> '{}')::boolean else true end from public.site_settings s where s.key='reviews_require_approval'), true)
);

create policy rv_read_own_customer on public.reviews for select to authenticated
using (exists (select 1 from public.customers c where c.id=reviews.customer_id and c.auth_user_id=(select auth.uid())));

create policy rv_delete_own_customer on public.reviews for delete to authenticated
using (exists (select 1 from public.customers c where c.id=reviews.customer_id and c.auth_user_id=(select auth.uid())));
