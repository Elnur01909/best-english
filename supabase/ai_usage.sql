-- ============================================================
-- AI istifadə sayğacı — ortaq açarla gündəlik limit (hibrid sistem)
-- Supabase SQL Editor-də icra et
-- ============================================================

create table if not exists public.ai_usage (
  user_id uuid references auth.users(id) on delete cascade not null,
  day     date not null default current_date,
  count   integer not null default 0,
  primary key (user_id, day)
);

-- RLS aktiv, amma policy yox → yalnız service_role yaza/oxuya bilər
-- (API route service role ilə işləyir; userlər birbaşa dəyişə bilməz)
alter table public.ai_usage enable row level security;
