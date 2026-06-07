-- ============================================================
-- Tələffüz qiymətləndirməsi sayğacı — ortaq Azure açarı ilə aylıq limit
-- (ai_usage.sql ilə eyni hibrid məntiq, sadəcə GÜNDƏLİK yox AYLIQ)
-- Supabase SQL Editor-də icra et
-- ============================================================

create table if not exists public.pronunciation_usage (
  user_id uuid references auth.users(id) on delete cascade not null,
  month   text not null default to_char(current_date, 'YYYY-MM'),
  count   integer not null default 0,
  primary key (user_id, month)
);

-- RLS aktiv, amma policy yox → yalnız service_role yaza/oxuya bilər
-- (API route service role ilə işləyir; userlər birbaşa dəyişə bilməz)
alter table public.pronunciation_usage enable row level security;
