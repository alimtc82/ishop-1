-- V13.7.7 — إعدادات الطباعة (لوجو + بيانات المحل + نماذج A4/حراري + فوتر)
-- التخزين في site_settings تحت المفتاح print_settings (JSON).

alter table public.roles
  add column if not exists can_settings_printing boolean not null default true;
update public.roles set can_settings_printing = true where key = 'admin';

insert into public.site_settings (key, value)
values ('print_settings', '{"logo_url":"","show_logo":true,"store_name":"","store_phone":"","store_address":"","paper":"a4","thermal_width":"80","footer_a4":"","footer_thermal":"شكرًا لتعاملكم معنا","show_footer":true,"font_scale":100,"auto_print":true}'::jsonb)
on conflict (key) do nothing;
