alter table public.customers add column if not exists business_name text;
alter table public.customers add column if not exists opening_balance numeric(14,2) not null default 0 check (opening_balance >= 0);
alter table public.suppliers add column if not exists business_name text;
create unique index if not exists dues_opening_customer_unique on public.dues(party_id) where party_type='customer' and reference_type='opening_balance' and status <> 'cancelled';
create unique index if not exists dues_opening_supplier_unique on public.dues(party_id) where party_type='supplier' and reference_type='opening_balance' and status <> 'cancelled';
