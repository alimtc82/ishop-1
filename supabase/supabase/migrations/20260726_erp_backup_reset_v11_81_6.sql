-- V11.81.6 — guarded ERP reset
-- Run once in Supabase SQL Editor before using the Reset screen.
alter table public.roles add column if not exists can_erp_reset boolean not null default false;
create or replace function public.erp_reset_business_data(p_mode text, p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
  tx_tables text[] := array[
    'sales_return_items','sales_returns','sales_invoice_items','sales_invoices',
    'purchase_return_items','purchase_returns','purchase_invoice_items','purchase_invoices',
    'product_movements','financial_movements','expenses','dues','product_serials'
  ];
  master_tables text[] := array[
    'products','product_brands','product_categories','product_units','customers','suppliers'
  ];
begin
  if p_mode not in ('transactions','business') then raise exception 'Invalid reset mode'; end if;
  if (p_mode='transactions' and p_confirmation<>'RESET TRANSACTIONS')
     or (p_mode='business' and p_confirmation<>'RESET ERP') then raise exception 'Invalid confirmation'; end if;

  -- Only authenticated users whose role explicitly has can_erp_reset=true.
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.profiles p
    join public.roles r on r.id=p.role_id
    where p.id=auth.uid() and coalesce(r.can_erp_reset,false)=true
  ) then raise exception 'ERP reset permission required'; end if;

  foreach t in array tx_tables loop
    if to_regclass('public.'||t) is not null then execute format('delete from public.%I',t); end if;
  end loop;

  if p_mode='business' then
    foreach t in array master_tables loop
      if to_regclass('public.'||t) is not null then execute format('delete from public.%I',t); end if;
    end loop;
  end if;

  return jsonb_build_object('ok',true,'mode',p_mode,'message','ERP reset completed');
end;
$$;
revoke all on function public.erp_reset_business_data(text,text) from public;
grant execute on function public.erp_reset_business_data(text,text) to authenticated;
