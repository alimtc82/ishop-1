-- V11.43 — صلاحية مستقلة لفتح قائمة الإعدادات
alter table public.roles
  add column if not exists can_settings boolean not null default true;

-- الأدمن كامل دائمًا
update public.roles set can_settings = true where key = 'admin';
