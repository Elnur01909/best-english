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
  email         text,             -- Dost axtarışı üçün (auth.users-dan kopyalanır)
  display_name  text,
  created_at    timestamptz default now()
);

create index if not exists idx_user_profiles_email on public.user_profiles (lower(email));

-- Yeni istifadəçi qeydiyyatda avtomatik profil yarat (email də kopyalanır)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
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

-- ─── 4c. Dərin Kodlaşdırma Keşi ("Yaddaş Laboratoriyası", paylaşılan) ──
-- Mnemonika + etimologiya + vizual səhnə BİR AI çağırışında generasiya olunur.
-- Gündəlik plana / SRS axınına TƏSİR ETMİR — ayrıca, könüllü funksiyadır.
-- Bax: migrations/add_vocab_deep_dive.sql
create table if not exists public.vocab_deep_dive (
  vocab_id     integer primary key,
  mnemonic_az  text not null default '',
  etymology_az text not null default '',
  visual_az    text not null default '',
  created_at   timestamptz default now()
);

-- ─── 4d. Dostluq Sorğuları ──────────────────────────────
-- Bax: migrations/add_friends_and_battles.sql
create table if not exists public.friend_requests (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid references auth.users(id) on delete cascade not null,
  receiver_id  uuid references auth.users(id) on delete cascade not null,
  status       text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at   timestamptz default now(),
  responded_at timestamptz,
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

-- ─── 4e. TOLES Mini-Test Yarışı (real-vaxt) ─────────────
create table if not exists public.battles (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid references auth.users(id) on delete cascade not null,
  opponent_id   uuid references auth.users(id) on delete cascade not null,
  status        text not null default 'pending'
                  check (status in ('pending','active','completed','declined','cancelled')),
  question_ids  jsonb not null,
  toles_level   text not null default 'Foundation',
  created_at    timestamptz default now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  check (creator_id <> opponent_id)
);

create table if not exists public.battle_answers (
  id            uuid primary key default gen_random_uuid(),
  battle_id     uuid references public.battles(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  q_index       integer not null,
  correct       boolean not null,
  time_taken_ms integer not null default 0,
  answered_at   timestamptz default now(),
  unique (battle_id, user_id, q_index)
);

-- ─── 5. Row Level Security (RLS) ────────────────────────
-- İstifadəçi yalnız öz məlumatlarını görə bilər

alter table public.user_profiles enable row level security;
alter table public.user_vocab_progress enable row level security;
alter table public.user_quiz_results enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.friend_requests enable row level security;
alter table public.battles enable row level security;
alter table public.battle_answers enable row level security;

-- user_profiles
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Dost axtarışı üçün — giriş etmiş istifadəçilər bir-birinin (məhdud) profilini görə bilsin
create policy "Authenticated users can search profiles"
  on public.user_profiles for select
  using (auth.role() = 'authenticated');

-- friend_requests
create policy "Users can view own friend requests"
  on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send friend requests"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

create policy "Receiver can respond to friend requests"
  on public.friend_requests for update
  using (auth.uid() = receiver_id or auth.uid() = sender_id);

create policy "Sender can cancel pending requests"
  on public.friend_requests for delete
  using (auth.uid() = sender_id and status = 'pending');

-- battles
create policy "Participants can view battles"
  on public.battles for select
  using (auth.uid() = creator_id or auth.uid() = opponent_id);

create policy "Creator can start a battle"
  on public.battles for insert
  with check (auth.uid() = creator_id);

create policy "Participants can update battle status"
  on public.battles for update
  using (auth.uid() = creator_id or auth.uid() = opponent_id);

-- battle_answers
create policy "Participants can view battle answers"
  on public.battle_answers for select
  using (
    exists (
      select 1 from public.battles b
      where b.id = battle_id
        and (b.creator_id = auth.uid() or b.opponent_id = auth.uid())
    )
  );

create policy "Users can submit own answers"
  on public.battle_answers for insert
  with check (auth.uid() = user_id);

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

create index if not exists idx_friend_requests_receiver
  on public.friend_requests(receiver_id, status);

create index if not exists idx_friend_requests_sender
  on public.friend_requests(sender_id, status);

create index if not exists idx_battles_creator on public.battles(creator_id, status);
create index if not exists idx_battles_opponent on public.battles(opponent_id, status);
create index if not exists idx_battle_answers_battle on public.battle_answers(battle_id);

-- ─── 7. Realtime — canlı TOLES yarışı üçün lazımdır ─────
-- Supabase Dashboard > Database > Replication-da bu cədvəlləri aktivləşdirin
-- (və ya bu sorğunu icra edin — artıq aktivdirsə xəta vermir):
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'battles') then
    alter publication supabase_realtime add table public.battles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'battle_answers') then
    alter publication supabase_realtime add table public.battle_answers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'friend_requests') then
    alter publication supabase_realtime add table public.friend_requests;
  end if;
end $$;

-- ============================================================
-- QURAŞDIRMA TAMAMLANDI
-- Supabase Dashboard-da:
--   Authentication > Settings > Site URL: http://localhost:3000
--   Authentication > URL Configuration > Redirect URLs: http://localhost:3000/**
-- ============================================================
