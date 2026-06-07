-- Faza 2: Leech (zəli söz) sistemi üçün miqrasiya
-- Bunu Supabase Dashboard → SQL Editor-da çalışdır.
-- Mövcud sətirlərə təsir etmir (DEFAULT 0 ilə geriyə uyğundur).

alter table public.user_vocab_progress
  add column if not exists consecutive_lapses integer not null default 0;
