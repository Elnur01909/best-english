-- ============================================================
-- DOSTLAR + TOLES MİNİ-TEST YARIŞI (real-vaxt)
-- Supabase Dashboard > SQL Editor-də icra et
-- ============================================================

-- ─── 1. user_profiles-a axtarış üçün email + görünən ad əlavə et ──
alter table public.user_profiles
  add column if not exists email text,
  add column if not exists display_name text;

-- Mövcud istifadəçilər üçün email-i auth.users-dan köçür (bir dəfəlik backfill)
update public.user_profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Yeni qeydiyyatda email avtomatik kopyalansın
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Email ilə tam-uyğunluq axtarışı üçün indeks (case-insensitive)
create index if not exists idx_user_profiles_email on public.user_profiles (lower(email));

-- ─── 2. Dostluq sorğuları ────────────────────────────────
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

create index if not exists idx_friend_requests_receiver on public.friend_requests(receiver_id, status);
create index if not exists idx_friend_requests_sender on public.friend_requests(sender_id, status);

-- ─── 3. TOLES Mini-Test Yarışı (real-vaxt) ───────────────
create table if not exists public.battles (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid references auth.users(id) on delete cascade not null,
  opponent_id   uuid references auth.users(id) on delete cascade not null,
  status        text not null default 'pending'
                  check (status in ('pending','active','completed','declined','cancelled')),
  question_ids  jsonb not null,             -- [12, 45, 78, ...] — quizzes.json id-ləri, hər iki tərəf üçün eyni
  toles_level   text not null default 'Foundation',
  created_at    timestamptz default now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  check (creator_id <> opponent_id)
);

create index if not exists idx_battles_creator on public.battles(creator_id, status);
create index if not exists idx_battles_opponent on public.battles(opponent_id, status);

-- ─── 4. Yarış Cavabları (hər tərəf öz cavablarını yazır) ──
create table if not exists public.battle_answers (
  id            uuid primary key default gen_random_uuid(),
  battle_id     uuid references public.battles(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  q_index       integer not null,           -- question_ids massivində mövqe (0-based)
  correct       boolean not null,
  time_taken_ms integer not null default 0,
  answered_at   timestamptz default now(),
  unique (battle_id, user_id, q_index)
);

create index if not exists idx_battle_answers_battle on public.battle_answers(battle_id);

-- ─── 5. Row Level Security ───────────────────────────────
alter table public.friend_requests enable row level security;
alter table public.battles enable row level security;
alter table public.battle_answers enable row level security;

-- friend_requests: yalnız göndərən/qəbul edən görə/dəyişə bilər
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

-- user_profiles: email ilə axtarış üçün — istənilən giriş etmiş istifadəçi
-- başqa profilləri görə bilsin (yalnız axtarış/dostluq üçün lazım olan sahələr)
create policy "Authenticated users can search profiles"
  on public.user_profiles for select
  using (auth.role() = 'authenticated');

-- battles: yalnız iştirakçılar görə/dəyişə bilər
create policy "Participants can view battles"
  on public.battles for select
  using (auth.uid() = creator_id or auth.uid() = opponent_id);

create policy "Creator can start a battle"
  on public.battles for insert
  with check (auth.uid() = creator_id);

create policy "Participants can update battle status"
  on public.battles for update
  using (auth.uid() = creator_id or auth.uid() = opponent_id);

-- battle_answers: yalnız iştirakçılar görə bilər, hər kəs öz cavabını yazır
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

-- ─── 6. Realtime — canlı yarış üçün lazımdır ─────────────
-- Supabase Dashboard > Database > Replication-da bu cədvəlləri aktivləşdirin,
-- ya da aşağıdakı sorğunu icra edin (artıq əlavə edilibsə xəta vermir):
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'battles'
  ) then
    alter publication supabase_realtime add table public.battles;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'battle_answers'
  ) then
    alter publication supabase_realtime add table public.battle_answers;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'friend_requests'
  ) then
    alter publication supabase_realtime add table public.friend_requests;
  end if;
end $$;

-- ============================================================
-- QURAŞDIRMA TAMAMLANDI
-- ============================================================
