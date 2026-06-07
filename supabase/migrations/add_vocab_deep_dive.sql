-- "Yaddaş Laboratoriyası" — Dərin Kodlaşdırma keş cədvəli
-- Bunu Supabase Dashboard → SQL Editor-da çalışdır.
-- Hər söz üçün mnemonika + etimologiya + vizual səhnə BİR AI çağırışında
-- generasiya olunur və bütün istifadəçilər üçün paylaşılır (kvota qənaəti).
-- QEYD: Bu, gündəlik plan / SRS axınına HEÇ BİR TƏSİR ETMİR — ayrıca,
-- könüllü "Yaddaş Laboratoriyası" funksiyası üçündür.

create table if not exists public.vocab_deep_dive (
  vocab_id     integer primary key,
  mnemonic_az  text not null default '',
  etymology_az text not null default '',
  visual_az    text not null default '',
  created_at   timestamptz default now()
);

alter table public.vocab_deep_dive enable row level security;

-- Hər kəs (daxil olmuş istifadəçilər) oxuya bilər — paylaşılan keşdir
drop policy if exists "vocab_deep_dive_select" on public.vocab_deep_dive;
create policy "vocab_deep_dive_select"
  on public.vocab_deep_dive for select
  to authenticated
  using (true);

-- Daxil olmuş istifadəçilər yeni qeyd əlavə edə bilər (ilk dəfə generasiya olunanda)
drop policy if exists "vocab_deep_dive_insert" on public.vocab_deep_dive;
create policy "vocab_deep_dive_insert"
  on public.vocab_deep_dive for insert
  to authenticated
  with check (true);
