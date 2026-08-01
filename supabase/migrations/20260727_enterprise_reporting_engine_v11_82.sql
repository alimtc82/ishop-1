
-- V11.82 Enterprise Reporting Engine (additive / backward-compatible)

-- 1) Historical cost snapshot. Existing rows are backfilled from current product purchase_price.
alter table if exists public.sales_invoice_items
  add column if not exists unit_cost_snapshot numeric(18,4);

update public.sales_invoice_items sii
set unit_cost_snapshot = coalesce(sii.unit_cost_snapshot, p.purchase_price, 0)
from public.products p
where p.id = sii.product_id and sii.unit_cost_snapshot is null;

-- Future posted sales should persist cost at posting time even if product cost changes later.
create or replace function public.erp_fill_sales_cost_snapshot()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.unit_cost_snapshot is null then
    select coalesce(p.purchase_price,0) into new.unit_cost_snapshot
    from public.products p where p.id=new.product_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_erp_sales_cost_snapshot on public.sales_invoice_items;
create trigger trg_erp_sales_cost_snapshot
before insert on public.sales_invoice_items
for each row execute function public.erp_fill_sales_cost_snapshot();

-- 2) Performance indexes for reporting filters/joins.
create index if not exists idx_sales_invoices_report on public.sales_invoices(status,invoice_date,branch,created_by);
create index if not exists idx_purchase_invoices_report on public.purchase_invoices(status,invoice_date,branch,created_by);
create index if not exists idx_sales_items_report on public.sales_invoice_items(invoice_id,product_id);
create index if not exists idx_purchase_items_report on public.purchase_invoice_items(invoice_id,product_id);
create index if not exists idx_expenses_report on public.expenses(status,expense_date,created_by);
create index if not exists idx_financial_movements_report on public.financial_movements(movement_date,movement_type,treasury_id);
create index if not exists idx_product_movements_report on public.product_movements(product_id,branch,movement_date);

-- 3) Common permission helper: reports never bypass branch access/RLS.
-- The RPC is invoker-security and therefore remains subject to existing RLS policies.
create or replace function public.erp_report_data(
  p_report text,
  p_from date default null,
  p_to date default null,
  p_branch text default null,
  p_user uuid default null,
  p_price_group bigint default null
) returns jsonb
language plpgsql
security invoker
set search_path=public
as $$
declare result jsonb;
begin
  if p_report='profit' then
    with s as (
      select si.id,si.total,coalesce(si.discount,0) invoice_discount
      from sales_invoices si
      where si.status='posted'
        and (p_from is null or si.invoice_date>=p_from) and (p_to is null or si.invoice_date<=p_to)
        and (p_branch is null or si.branch=p_branch) and (p_user is null or si.created_by=p_user)
    ), lines as (
      select coalesce(sum(sii.quantity*sii.unit_price),0) gross_sales,
             coalesce(sum(sii.quantity*coalesce(sii.unit_cost_snapshot,0)),0) cogs,
             coalesce(sum(coalesce(sii.discount,0)),0) line_discount
      from s join sales_invoice_items sii on sii.invoice_id=s.id
    ), h as (
      select coalesce(sum(invoice_discount),0) invoice_discount from s
    ), e as (
      select coalesce(sum(ex.amount),0) expenses
      from expenses ex left join treasuries t on t.id=ex.treasury_id
      where ex.status<>'cancelled'
        and (p_from is null or ex.expense_date>=p_from) and (p_to is null or ex.expense_date<=p_to)
        and (p_branch is null or t.branch=p_branch) and (p_user is null or ex.created_by=p_user)
    )
    select jsonb_build_object(
      'gross_sales',lines.gross_sales,'cogs',lines.cogs,
      'gross_profit',lines.gross_sales-lines.cogs,
      'invoice_discount',h.invoice_discount,'line_discount',lines.line_discount,
      'expenses',e.expenses,
      'net_profit',(lines.gross_sales-lines.cogs)-h.invoice_discount-lines.line_discount-e.expenses
    ) into result from lines,h,e;

  elsif p_report='sales_purchases' then
    select jsonb_build_object(
      'sales_cash',coalesce((select jsonb_build_object('count',count(*),'total',coalesce(sum(total),0)) from sales_invoices where status='posted' and payment_type='cash' and (p_from is null or invoice_date>=p_from) and (p_to is null or invoice_date<=p_to) and (p_branch is null or branch=p_branch) and (p_user is null or created_by=p_user)),'{}'::jsonb),
      'sales_credit',coalesce((select jsonb_build_object('count',count(*),'total',coalesce(sum(total),0)) from sales_invoices where status='posted' and payment_type='credit' and (p_from is null or invoice_date>=p_from) and (p_to is null or invoice_date<=p_to) and (p_branch is null or branch=p_branch) and (p_user is null or created_by=p_user)),'{}'::jsonb),
      'purchase_cash',coalesce((select jsonb_build_object('count',count(*),'total',coalesce(sum(total),0)) from purchase_invoices where status='posted' and payment_type='cash' and (p_from is null or invoice_date>=p_from) and (p_to is null or invoice_date<=p_to) and (p_branch is null or branch=p_branch) and (p_user is null or created_by=p_user)),'{}'::jsonb),
      'purchase_credit',coalesce((select jsonb_build_object('count',count(*),'total',coalesce(sum(total),0)) from purchase_invoices where status='posted' and payment_type='credit' and (p_from is null or invoice_date>=p_from) and (p_to is null or invoice_date<=p_to) and (p_branch is null or branch=p_branch) and (p_user is null or created_by=p_user)),'{}'::jsonb)
    ) into result;

  elsif p_report='top_products' then
    select coalesce(jsonb_agg(x order by (x->>'qty')::numeric desc),'[]'::jsonb) into result
    from (
      select jsonb_build_object('product_id',p.id,'sku',p.sku,'name',p.name,
        'qty',sum(i.quantity),'sales',sum(i.quantity*i.unit_price-coalesce(i.discount,0))) x
      from sales_invoices s join sales_invoice_items i on i.invoice_id=s.id join products p on p.id=i.product_id
      where s.status='posted' and (p_from is null or s.invoice_date>=p_from) and (p_to is null or s.invoice_date<=p_to)
        and (p_branch is null or s.branch=p_branch) and (p_user is null or s.created_by=p_user)
      group by p.id,p.sku,p.name
    ) q;

  elsif p_report='inventory' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'product_id',p.id,'sku',p.sku,'name',p.name,'qty',coalesce(st.qty,0),
      'purchase_price',coalesce(p.purchase_price,0),'base_price',coalesce(p.sale_price,0),
      'group_price',sp.sale_price
    ) order by p.name),'[]'::jsonb) into result
    from products p
    left join (
      select product_id,sum(case when movement_type in ('purchase','transfer_in','adjustment_in','sale_return') then quantity else -quantity end) qty
      from product_movements
      where (p_to is null or movement_date<=p_to) and (p_branch is null or branch=p_branch)
      group by product_id
    ) st on st.product_id=p.id
    left join product_sale_prices sp on sp.product_id=p.id and sp.price_group_id=p_price_group
    where coalesce(st.qty,0)<>0;

  elsif p_report='expenses' then
    select coalesce(jsonb_agg(to_jsonb(q) order by q.expense_date desc),'[]'::jsonb) into result
    from (
      select e.id,e.expense_date,t.branch,e.payee_name,e.amount,e.notes,e.created_by
      from expenses e left join treasuries t on t.id=e.treasury_id
      where e.status<>'cancelled' and (p_from is null or e.expense_date>=p_from) and (p_to is null or e.expense_date<=p_to)
        and (p_branch is null or t.branch=p_branch) and (p_user is null or e.created_by=p_user)
    ) q;

  elsif p_report='collections' then
    select coalesce(jsonb_agg(to_jsonb(q) order by q.movement_date desc),'[]'::jsonb) into result
    from (
      select f.id,f.movement_date,t.branch,f.party_name,f.amount,f.reference_type,f.reference_id
      from financial_movements f left join treasuries t on t.id=f.treasury_id
      where f.movement_type='receipt'
        and (p_from is null or f.movement_date>=p_from) and (p_to is null or f.movement_date<=p_to)
        and (p_branch is null or t.branch=p_branch)
    ) q;
  else
    raise exception 'Unsupported ERP report: %',p_report;
  end if;
  return coalesce(result,'{}'::jsonb);
end $$;

grant execute on function public.erp_report_data(text,date,date,text,uuid,bigint) to authenticated;
