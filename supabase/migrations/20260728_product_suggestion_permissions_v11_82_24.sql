-- V11.82.24 — independent visibility permissions for product search suggestions
alter table public.roles
  add column if not exists can_erp_suggestion_view_stock boolean not null default true,
  add column if not exists can_erp_suggestion_view_sale_price boolean not null default true;

update public.roles
set can_erp_suggestion_view_stock = true,
    can_erp_suggestion_view_sale_price = true
where key = 'admin';
