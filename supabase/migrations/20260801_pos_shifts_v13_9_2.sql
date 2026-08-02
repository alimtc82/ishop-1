-- ═══════════════════════════════════════════════════════════════
--  V13.9.2 — نظام الورديات (POS Shifts)
--  جدول pos_shifts: يسجل كل وردية بفتحها وإغلاقها
-- ═══════════════════════════════════════════════════════════════

-- ── جدول الورديات ──────────────────────────────────────────────
create table if not exists public.pos_shifts (
  id                  bigserial primary key,
  shift_number        text not null unique,          -- رقم الوردية (SHIFT-YYYYMMDD-XXXX)
  user_id             uuid not null references auth.users(id) on delete restrict,
  user_name           text not null,                 -- اسم المستخدم (مخزّن للتقارير)
  branch              text not null,                 -- الفرع
  treasury_id         bigint not null references public.treasuries(id) on delete restrict,
  treasury_name       text not null,                 -- اسم الخزينة (مخزّن للتقارير)
  opening_balance     numeric(14,2) not null default 0,  -- رصيد أول المدة (يُدخله المستخدم)
  closing_balance     numeric(14,2),                 -- رصيد آخر المدة (يُحسب عند الإغلاق)
  status              text not null default 'open'   -- open | closed
                        check (status in ('open','closed')),
  opened_at           timestamptz not null default now(),
  closed_at           timestamptz,
  notes               text,
  created_at          timestamptz not null default now()
);

-- فهرس للبحث السريع بالمستخدم والفرع والحالة
create index if not exists pos_shifts_user_id_idx    on public.pos_shifts(user_id);
create index if not exists pos_shifts_branch_idx     on public.pos_shifts(branch);
create index if not exists pos_shifts_status_idx     on public.pos_shifts(status);
create index if not exists pos_shifts_opened_at_idx  on public.pos_shifts(opened_at desc);

-- RLS
alter table public.pos_shifts enable row level security;
create policy "authenticated can manage pos_shifts"
  on public.pos_shifts for all to authenticated using (true) with check (true);
grant select,insert,update,delete on public.pos_shifts to authenticated;
grant usage, select on sequence public.pos_shifts_id_seq to authenticated;

-- ── صلاحيات الورديات ────────────────────────────────────────────
-- إضافة أعمدة الصلاحيات الجديدة لجدول roles
alter table public.roles
  add column if not exists can_pos_shift_open    boolean not null default true,
  add column if not exists can_pos_shift_close   boolean not null default true,
  add column if not exists can_pos_shift_report  boolean not null default true,
  add column if not exists can_pos_shift_view_all boolean not null default false;

-- الأدمن يملك كل الصلاحيات
update public.roles set
  can_pos_shift_open    = true,
  can_pos_shift_close   = true,
  can_pos_shift_report  = true,
  can_pos_shift_view_all = true
where key = 'admin';

-- دور الإدخال: يفتح ويغلق ويرى تقريره فقط
update public.roles set
  can_pos_shift_open    = true,
  can_pos_shift_close   = true,
  can_pos_shift_report  = true,
  can_pos_shift_view_all = false
where key = 'entry';

-- دور المستخدم: يفتح ويغلق ويرى تقريره فقط
update public.roles set
  can_pos_shift_open    = true,
  can_pos_shift_close   = true,
  can_pos_shift_report  = true,
  can_pos_shift_view_all = false
where key = 'user';
