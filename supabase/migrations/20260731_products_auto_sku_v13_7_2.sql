-- ══════════════════════════════════════════════════════════════
--  V13.7.2 — توليد SKU تلقائي (كود المصنع) يبدأ من 10001
--
--  SKU بقى هو كود المصنع/الباركود. لو اتساب فاضي عند الإضافة،
--  النظام يولّد رقمًا تسلسليًا يبدأ من 10001 — على مستوى قاعدة
--  البيانات، فيشتغل مهما كانت شاشة الإضافة (منتجات / فاتورة شراء /
--  استيراد) من غير تكرار ولا تعارض.
-- ══════════════════════════════════════════════════════════════

-- 1) سيكوينس يبدأ من 10001 بالظبط (مش بيلاحق الباركودات المخزّنة في sku).
--    التعارض النادر مع أي باركود قصير رقمه 10001+ بيتفادى في التريجر
--    عن طريق حلقة تتخطّى أي قيمة موجودة.
create sequence if not exists public.products_sku_seq start with 10001;
grant usage, select on sequence public.products_sku_seq to authenticated, anon;

-- 2) دالة تعبئة SKU تلقائيًا لو فاضي (مع ضمان عدم التكرار)
create or replace function public.products_autofill_sku()
returns trigger
language plpgsql
as $$
declare v text;
begin
  if NEW.sku is null or btrim(NEW.sku) = '' then
    loop
      v := nextval('public.products_sku_seq')::text;
      exit when not exists (select 1 from public.products where sku = v);
    end loop;
    NEW.sku := v;
  else
    NEW.sku := btrim(NEW.sku);
  end if;
  return NEW;
end $$;

-- 3) تريجر قبل الإدخال
drop trigger if exists trg_products_autofill_sku on public.products;
create trigger trg_products_autofill_sku
  before insert on public.products
  for each row execute function public.products_autofill_sku();
