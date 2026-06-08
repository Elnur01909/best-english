-- ═══════════════════════════════════════════════════════════
-- DÜZƏLİŞ: friend_requests / battles / battle_answers — FK-ləri
-- auth.users yerinə public.user_profiles-a yönəlt.
--
-- SƏBƏB: Supabase (PostgREST) "join" embedding-i (məs. `sender:sender_id(email, ...)`)
-- yalnız FK əlaqəsi olan cədvəllər arasında avtomatik qura bilir.
-- sender_id/receiver_id/creator_id/opponent_id/user_id sütunları
-- auth.users(id)-ə bağlı idi, amma social.ts/battles.ts sorğuları
-- user_profiles-dan (email, display_name, level, toles_level, streak)
-- məlumat çəkməyə çalışırdı → sorğu səssizcə xəta verirdi və
-- "Sorğular" tabı/dostluq siyahısı boş görünürdü.
--
-- HƏLL: FK-ləri user_profiles(id)-ə yönəltmək (user_profiles.id artıq
-- auth.users(id)-ə bağlıdır və hər istifadəçi qeydiyyatda avtomatik
-- profil alır — handle_new_user trigger), beləliklə embedding işləyir.
-- ═══════════════════════════════════════════════════════════

-- ─── friend_requests ───────────────────────────────────────
alter table public.friend_requests drop constraint if exists friend_requests_sender_id_fkey;
alter table public.friend_requests drop constraint if exists friend_requests_receiver_id_fkey;

alter table public.friend_requests
  add constraint friend_requests_sender_id_fkey
    foreign key (sender_id) references public.user_profiles(id) on delete cascade;
alter table public.friend_requests
  add constraint friend_requests_receiver_id_fkey
    foreign key (receiver_id) references public.user_profiles(id) on delete cascade;

-- ─── battles ───────────────────────────────────────────────
alter table public.battles drop constraint if exists battles_creator_id_fkey;
alter table public.battles drop constraint if exists battles_opponent_id_fkey;

alter table public.battles
  add constraint battles_creator_id_fkey
    foreign key (creator_id) references public.user_profiles(id) on delete cascade;
alter table public.battles
  add constraint battles_opponent_id_fkey
    foreign key (opponent_id) references public.user_profiles(id) on delete cascade;

-- ─── battle_answers ────────────────────────────────────────
alter table public.battle_answers drop constraint if exists battle_answers_user_id_fkey;

alter table public.battle_answers
  add constraint battle_answers_user_id_fkey
    foreign key (user_id) references public.user_profiles(id) on delete cascade;

-- ─── PostgREST sxem keşini yenilə ki, yeni əlaqələri görsün ──
notify pgrst, 'reload schema';
