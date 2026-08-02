-- ══════════════════════════════════════════════════════════════
--  V13.7.4 — شريط الأخبار المتحرك في اللاندينج
--
--  التخزين في site_settings تحت المفتاح news_ticker (JSON):
--    { enabled, text, speed, direction }
--  (نفس نمط warranty_hero — قراءة عامة للزوار، كتابة للأدمن.)
--
--  ده بيضيف بس صلاحية إدارة الشريط. جدول site_settings موجود أصلاً.
-- ══════════════════════════════════════════════════════════════

-- صلاحية إدارة الشريط (نفس نمط باقي أقسام الإعدادات)
alter table public.roles
  add column if not exists can_settings_ticker boolean not null default true;
update public.roles set can_settings_ticker = true where key = 'admin';

-- قيمة ابتدائية (معطّلة) لو مش موجودة
insert into public.site_settings (key, value)
values ('news_ticker', '{"enabled":false,"text":"","speed":5,"direction":"rtl"}'::jsonb)
on conflict (key) do nothing;
