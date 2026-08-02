-- Public storefront aggregate stock only; raw movement rows remain protected by RLS.
create or replace view public.storefront_positive_stock as
select product_id,
       sum(case
         when movement_type in ('purchase','transfer_in','adjustment_in','sale_return','opening','opening_stock','opening_balance') then abs(quantity)
         when movement_type in ('sale','transfer_out','adjustment_out','purchase_return') then -abs(quantity)
         else quantity
       end) as available_stock
from public.product_movements
group by product_id
having sum(case
         when movement_type in ('purchase','transfer_in','adjustment_in','sale_return','opening','opening_stock','opening_balance') then abs(quantity)
         when movement_type in ('sale','transfer_out','adjustment_out','purchase_return') then -abs(quantity)
         else quantity
       end) > 0;

grant select on public.storefront_positive_stock to anon, authenticated;
