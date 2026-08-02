-- V13.6.3 — align ERP Reset permission with production schema
alter table public.roles add column if not exists can_erp_reset boolean not null default false;
update public.roles set can_erp_reset=true where key='admin';
