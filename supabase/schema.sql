-- ============================================================
-- BEST ENGLISH — Supabase Database Schema
-- Supabase Dashboard > SQL Editor-də bu faylı icra et
-- ============================================================

-- ─── 1. İstifadəçi Profili ───────────────────────────────
create table if not exists public.user_profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  level         text not null default 'A1'
                  check (level in ('A1','A2','B1','B2','C1','C2')),
  toles_level   text not null default 'Foundation'
                  check (toles_level in ('Foundation','Higher','Advanced')),
  streak        integer not null default 0,
  total_points  integer not null default 0,
  last_active   timestamptz,
  created_at    timestamptz default now()
);

-- Yeni istifadəçi qeydiyyatda avtomatik profil yarat
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 2. SRS Lüğət İrəliləyişi ───────────────────────────
create table if not exists public.user_vocab_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  vocab_id      integer not null,
  next_review   timestamptz not null default now(),
  interval      integer not null default 0,
  ease_factor   float not null default 2.5,
  repetitions   integer not null default 0,
  consecutive_lapses integer not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, vocab_id)
);

-- ─── 3. Quiz Nəticələri ──────────────────────────────────
create table if not exists public.user_quiz_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  quiz_id     integer not null,
  correct     boolean not null,
  time_taken  integer default 0,
  answered_at timestamptz default now()
);

-- ─── 4. Dərs İrəliləyişi ────────────────────────────────
create table if not exists public.user_lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  lesson_id    integer not null,
  completed    boolean not null default false,
  completed_at timestamptz,
  unique(user_id, lesson_id)
);

-- ─── 4b. Mnemonika Keşi (paylaşılan, AI ilə generasiya) ──
-- Hər söz üçün YALNIZ BİR DƏFƏ generasiya olunur, bütün istifadəçilər
-- arasında paylaşılır (AI kvotasına qənaət). Bax: migrations/add_vocab_mnemonics.sql
create table if not exists public.vocab_mnemonics (
  vocab_id    integer primary key,
  mnemonic_az text not null,
  created_at  timestamptz default now()
);

-- ─── 5. Row Level Security (RLS) ────────────────────────
-- İstifadəçi yalnız öz məlumatlarını görə bilər

alter table public.user_profiles enable row level security;
alter table public.user_vocab_progress enable row level security;
alter table public.user_quiz_results enable row level security;
alter table public.user_lesson_progress enable row level security;

-- user_profiles
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- user_vocab_progress
create policy "Users can manage own vocab progress"
  on public.user_vocab_progress for all
  using (auth.uid() = user_id);

-- user_quiz_results
create policy "Users can manage own quiz results"
  on public.user_quiz_results for all
  using (auth.uid() = user_id);

-- user_lesson_progress
create policy "Users can manage own lesson progress"
  on public.user_lesson_progress for all
  using (auth.uid() = user_id);

-- ─── 6. Faydalı İndekslər ───────────────────────────────
create index if not exists idx_vocab_next_review
  on public.user_vocab_progress(user_id, next_review);

create index if not exists idx_quiz_results_user
  on public.user_quiz_results(user_id, answered_at desc);

create index if not exists idx_lesson_progress_user
  on public.user_lesson_progress(user_id);

-- ============================================================
-- QURAŞDIRMA TAMAMLANDI
-- Supabase Dashboard-da:
--   Authentication > Settings > Site URL: http://localhost:3000
--   Authentication > URL Configuration > Redirect URLs: http://localhost:3000/**
-- ============================================================
