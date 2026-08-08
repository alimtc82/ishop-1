create extension if not exists pgcrypto;

alter table public.sales_invoices
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists sales_invoices_public_token_uidx
  on public.sales_invoices(public_token);
create index if not exists sales_returns_invoice_status_idx
  on public.sales_returns(sales_invoice_id, status);

insert into public.role_permissions(role_key, permission_key, allowed)
select r.key, p.permission_key,
  case p.permission_key
    when 'erp.sales.invoice.actions.edit' then coalesce(r.can_erp_sale_create, false)
    when 'erp.sales.invoice.actions.return' then coalesce(r.can_erp_sale_return, false)
    when 'erp.sales.invoice.actions.delete' then coalesce(r.can_erp_cancel, false)
    when 'erp.sales.invoice.actions.payments' then coalesce(r.can_erp_finance, false)
    else coalesce(r.can_erp_sales, false)
  end
from public.roles r
cross join (values
  ('erp.sales.invoice.actions'),
  ('erp.sales.invoice.actions.view'),
  ('erp.sales.invoice.actions.whatsapp'),
  ('erp.sales.invoice.actions.edit'),
  ('erp.sales.invoice.actions.return'),
  ('erp.sales.invoice.actions.delete'),
  ('erp.sales.invoice.actions.payments'),
  ('erp.sales.invoice.actions.share')
) p(permission_key)
on conflict (role_key, permission_key) do nothing;

create or replace function public.rotate_sales_invoice_public_token(p_invoice_id bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_inv public.sales_invoices%rowtype; v_token uuid;
begin
  if not public.role_perm('erp.sales.invoice.actions.share') then raise exception 'لا توجد صلاحية مشاركة رابط الفاتورة'; end if;
  select * into v_inv from public.sales_invoices where id=p_invoice_id for update;
  if not found then raise exception 'الفاتورة غير موجودة'; end if;
  if not public.can_access_branch(v_inv.branch) then raise exception 'ليس لديك صلاحية على هذا الفرع'; end if;
  v_token := gen_random_uuid();
  update public.sales_invoices set public_token=v_token where id=p_invoice_id;
  return v_token;
end $$;

revoke all on function public.rotate_sales_invoice_public_token(bigint) from public;
grant execute on function public.rotate_sales_invoice_public_token(bigint) to authenticated;

create or replace function public.get_public_sales_invoice(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'invoice', jsonb_build_object(
      'invoice_number', i.invoice_number, 'invoice_date', i.invoice_date,
      'customer_name', i.customer_name, 'branch', i.branch,
      'subtotal', i.subtotal, 'discount', i.discount, 'total', i.total,
      'payment_type', i.payment_type, 'status', i.status
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', p.name, 'sku', p.sku, 'images', p.images,
        'primary_image', p.primary_image, 'quantity', x.quantity,
        'unit_price', x.unit_price, 'discount', x.discount, 'line_total', x.line_total
      ) order by x.id)
      from public.sales_invoice_items x join public.products p on p.id=x.product_id
      where x.invoice_id=i.id
    ), '[]'::jsonb)
  )
  from public.sales_invoices i
  where i.public_token=p_token and i.status <> 'cancelled'
$$;

revoke all on function public.get_public_sales_invoice(uuid) from public;
grant execute on function public.get_public_sales_invoice(uuid) to anon, authenticated;

create or replace function public.hard_delete_sales_invoice_tx(p_invoice_id bigint, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.sales_invoices%rowtype;
  v_snapshot jsonb;
  v_return_ids bigint[];
  v_uid integer;
begin
  if not public.role_perm('erp.sales.invoice.actions.delete') then raise exception 'لا توجد صلاحية حذف الفاتورة'; end if;
  if nullif(btrim(p_reason),'') is null then raise exception 'سبب الحذف مطلوب'; end if;
  select * into v_inv from public.sales_invoices where id=p_invoice_id for update;
  if not found then raise exception 'الفاتورة غير موجودة'; end if;
  if not public.can_access_branch(v_inv.branch) then raise exception 'ليس لديك صلاحية على هذا الفرع'; end if;

  select coalesce(array_agg(id),'{}') into v_return_ids from public.sales_returns where sales_invoice_id=p_invoice_id;
  select jsonb_build_object(
    'invoice', to_jsonb(v_inv),
    'items', coalesce((select jsonb_agg(to_jsonb(x)) from public.sales_invoice_items x where x.invoice_id=p_invoice_id),'[]'::jsonb),
    'returns', coalesce((select jsonb_agg(to_jsonb(x)) from public.sales_returns x where x.sales_invoice_id=p_invoice_id),'[]'::jsonb),
    'return_items', coalesce((select jsonb_agg(to_jsonb(x)) from public.sales_return_items x where x.return_id=any(v_return_ids)),'[]'::jsonb),
    'inventory_movements', coalesce((select jsonb_agg(to_jsonb(x)) from public.product_movements x where (x.reference_type='sales_invoice' and x.reference_id=p_invoice_id::text) or (x.reference_type='sales_return' and x.reference_id=any(v_return_ids::text[]))),'[]'::jsonb),
    'financial_movements', coalesce((select jsonb_agg(to_jsonb(x)) from public.financial_movements x where (x.reference_type='sales_invoice' and x.reference_id=p_invoice_id::text) or (x.reference_type='sales_return' and x.reference_id=any(v_return_ids::text[]))),'[]'::jsonb),
    'dues', coalesce((select jsonb_agg(to_jsonb(x)) from public.dues x where (x.reference_type='sales_invoice' and x.reference_id=p_invoice_id::text) or (x.reference_type='sales_return' and x.reference_id=any(v_return_ids::text[]))),'[]'::jsonb),
    'reason', btrim(p_reason), 'deleted_at', now()
  ) into v_snapshot;

  update public.product_serials ps set status='available'
  where exists (
    select 1 from public.sales_invoice_items sii
    where sii.invoice_id=p_invoice_id and ps.product_id=sii.product_id and ps.serial_number=any(sii.serial_numbers)
  );
  delete from public.product_warranties where reference_type='sales_invoice' and reference_id=p_invoice_id::text;
  delete from public.dues where (reference_type='sales_invoice' and reference_id=p_invoice_id::text)
    or (reference_type='sales_return' and reference_id=any(v_return_ids::text[]));
  delete from public.financial_movements where (reference_type='sales_invoice' and reference_id=p_invoice_id::text)
    or (reference_type='sales_return' and reference_id=any(v_return_ids::text[]));
  delete from public.product_movements where (reference_type='sales_invoice' and reference_id=p_invoice_id::text)
    or (reference_type='sales_return' and reference_id=any(v_return_ids::text[]));
  delete from public.sales_returns where sales_invoice_id=p_invoice_id;
  delete from public.sales_invoices where id=p_invoice_id;

  select id into v_uid from public.ishop_users where auth_id=auth.uid() limit 1;
  insert into public.erp_audit_log(user_id,module,action,entity_type,entity_id,document_number,details)
  values(v_uid,'sales','hard_delete','sales_invoice',p_invoice_id::text,v_inv.invoice_number,v_snapshot);
  return jsonb_build_object('deleted',true,'id',p_invoice_id,'number',v_inv.invoice_number);
end $$;

revoke all on function public.hard_delete_sales_invoice_tx(bigint,text) from public;
grant execute on function public.hard_delete_sales_invoice_tx(bigint,text) to authenticated;

create or replace function public.replace_sales_invoice_tx(p_invoice_id bigint, p_header jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_inv public.sales_invoices%rowtype; v_result jsonb; v_old_number text;
begin
  if not public.role_perm('erp.sales.invoice.actions.edit') then raise exception 'لا توجد صلاحية تعديل الفاتورة'; end if;
  select * into v_inv from public.sales_invoices where id=p_invoice_id for update;
  if not found or v_inv.status<>'posted' then raise exception 'الفاتورة غير صالحة للتعديل'; end if;
  if not public.can_access_branch(v_inv.branch) then raise exception 'ليس لديك صلاحية على هذا الفرع'; end if;
  if exists(select 1 from public.sales_returns where sales_invoice_id=p_invoice_id and status='posted') then raise exception 'لا يمكن تعديل فاتورة لها مرتجع'; end if;
  v_old_number:=v_inv.invoice_number;
  perform public.cancel_sales_invoice_tx(p_invoice_id,'تعديل وإعادة ترحيل');
  update public.sales_invoices set invoice_number=v_old_number||'-EDIT-'||p_invoice_id where id=p_invoice_id;
  p_header:=jsonb_set(p_header,'{invoice_number}',to_jsonb(v_old_number));
  v_result:=public.post_sales_invoice_tx(p_header,p_items);
  return v_result || jsonb_build_object('replaced_invoice_id',p_invoice_id);
end $$;

revoke all on function public.replace_sales_invoice_tx(bigint,jsonb,jsonb) from public;
grant execute on function public.replace_sales_invoice_tx(bigint,jsonb,jsonb) to authenticated;
