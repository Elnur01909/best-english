-- Faza 3: Mnemonika keş cədvəli
-- Bunu Supabase Dashboard → SQL Editor-da çalışdır.
-- Hər söz üçün mnemonika YALNIZ BİR DƏFƏ AI ilə generasiya olunur və
-- bütün istifadəçilər üçün paylaşılır (kvota qənaəti).

create table if not exists public.vocab_mnemonics (
  vocab_id    integer primary key,
  mnemonic_az text not null,
  created_at  timestamptz default now()
);

alter table public.vocab_mnemonics enable row level security;

-- Hər kəs (daxil olmuş istifadəçilər) oxuya bilər — paylaşılan keşdir
drop policy if exists "vocab_mnemonics_select" on public.vocab_mnemonics;
create policy "vocab_mnemonics_select"
  on public.vocab_mnemonics for select
  to authenticated
  using (true);

-- Daxil olmuş istifadəçilər yeni mnemonika əlavə edə bilər (ilk dəfə generasiya olunanda)
drop policy if exists "vocab_mnemonics_insert" on public.vocab_mnemonics;
create policy "vocab_mnemonics_insert"
  on public.vocab_mnemonics for insert
  to authenticated
  with check (true);
