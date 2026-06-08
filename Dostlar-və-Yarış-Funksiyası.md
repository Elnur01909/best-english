# ⚔️ Dostlar & Canlı Yarış Funksiyası

> Bu qeyd "Best English" platformasına əlavə olunan **Dostluq Sistemi + Real-vaxt TOLES Mini-Test Yarışı** funksiyasının tam izahıdır. Əlaqəli qeydlər: [[Layihə-Xəritəsi]] · [[Arxitektura]] · [[Qərarlar-Tarixçəsi]] · [[Bug-Jurnalı]]

## 🎯 Nə üçün yaradıldı?
İstifadəçilər tək başına öyrənməkdənsə, dostları ilə **rəqabət** edərək motivasiyalarını artıra bilsinlər deyə. İki əsas hissədən ibarətdir:
1. **Dostluq sistemi** — email vasitəsilə dost tapmaq, sorğu göndərmək/qəbul etmək
2. **Canlı (real-vaxt) yarış** — TOLES Mock Mini-Test, hər iki tərəfə eyni suallar, paralel həll, canlı bal müqayisəsi

## 🗂️ Yaradılan fayllar
| Fayl | Rolu |
|---|---|
| `supabase/migrations/add_friends_and_battles.sql` | DB cədvəlləri, RLS, Realtime publikasiya |
| `supabase/migrations/fix_friend_battle_user_profiles_fk.sql` | FK düzəlişi (aşağıda izah olunur — #bug) |
| `src/lib/social.ts` | Dostluq funksiyaları (axtarış, sorğu, qəbul/rədd, dost siyahısı) |
| `src/lib/battles.ts` | Yarış funksiyaları (yaratmaq, sual seçimi, cavab, realtime abunəlik) |
| `src/app/friends/page.tsx` | Dostlar UI (3 tab: Dostlar/Sorğular/Axtar) |
| `src/app/battles/[id]/page.tsx` | Canlı yarış otağı (sual-cavab, vaxt, nəticə) |
| `src/components/BattleChallengePopup.tsx` | Qlobal üzən bildiriş pəncərəsi |

## 🗃️ Verilənlər Bazası Modeli
```
user_profiles  (+email, +display_name)  ← email ilə axtarış üçün
friend_requests (sender_id, receiver_id, status: pending|accepted|declined)
battles         (creator_id, opponent_id, status, question_ids[], toles_level)
battle_answers  (battle_id, user_id, q_index, correct, time_taken_ms)
```
- `question_ids` — `quizzes.json`-dan TOLES səviyyəsinə uyğun 8 təsadüfi sual ID-si (jsonb massiv), **hər iki tərəf üçün eynidir**
- Realtime: `supabase_realtime` publikasiyasına `battles`, `battle_answers`, `friend_requests` əlavə olunub (`alter publication ... add table ...`)

## 🔄 İstifadəçi axını
1. `/friends` → "Axtar" tabında dostun emailini tam yazıb tapırsan
2. "+ Dostluq sorğusu" → qarşı tərəfin "Sorğular" tabında görünür → "Qəbul et"
3. Dostlar siyahısında "⚔️ Yarışa çağır" → 8 sual seçilir, `battles` cədvəlinə `pending` status ilə yazılır
4. Qarşı tərəfdə **dərhal**, saytın istənilən səhifəsində [[#Qlobal üzən bildiriş (BattleChallengePopup)|üzən bildiriş]] çıxır → "Qəbul et və başla"
5. Hər iki tərəf `/battles/[id]` otağına düşür, eyni 8 sualı paralel həll edir
6. Cavablar `battle_answers`-ə canlı yazılır, Postgres Realtime vasitəsilə qarşı tərəfin ekranında **anında** görünür (canlı tablo)
7. Hər iki tərəf bitirəndə `completeBattle()` yarışı `completed` statusuna keçirir → nəticə ekranı (Qazandın/Bərabərə/Uduzdun)

## ⏱️ 30 Saniyəlik Geri Sayım Timer
Hər sual üçün 30 saniyə vaxt verilir:
- Vizual: rəngli nişan (⏱️ `30s`), 10 saniyədən az qalanda **qırmızı + nəbz** effekti
- **Tez cavablandırma mükafatlandırılır** — cavab verən kimi (30 saniyəni gözləmədən) növbəti suala keçir, timer yenidən başlayır
- Vaxt bitərsə, cavablanmamış sual avtomatik **"cavabsız/yanlış"** kimi qeyd olunur (bal hesablamasının düzgün qalması üçün) və "⏰ Vaxt bitdi" mesajı göstərilir
- Texniki: `TIME_PER_QUESTION = 30`, `setInterval` ilə geri sayım, vahid `useEffect` ilə "cavab seçildi → 1.1s sonra keç" axını idarə olunur

## 🔔 Qlobal üzən bildiriş (BattleChallengePopup)
İlkin versiyada yarış dəvətləri yalnız `/friends` səhifəsində görünürdü (`subscribeToIncomingBattles`). İndi `BattleChallengePopup` komponenti **`RootLayout`**-a (bütün saytı əhatə edən `layout.tsx`) qoşulub:
- İstifadəçi saytın **istənilən səhifəsində** olsa belə, Postgres Realtime vasitəsilə dəvət gələn kimi ekranın küncündə üzən pəncərə açılır (Qəbul et/Rədd et)
- `/friends` və yarış otağı səhifələrində dublikat göstərilmir (pathname yoxlanışı ilə)

## 🐛 Tapılan və Düzəldilən Bug — FK Embedding Problemi
**Simptom:** Dostluq sorğusu göndərilirdi (uğur mesajı çıxırdı), amma qarşı tərəfin "Sorğular" tabında **görünmürdü**.

**Səbəb:** `friend_requests.sender_id`/`receiver_id` (eləcə də `battles`/`battle_answers`-dəki uyğun sütunlar) `auth.users(id)`-ə FK ilə bağlı idi. Amma `social.ts`/`battles.ts` sorğuları PostgREST-in **embedding** sintaksisi ilə (`sender:sender_id(email, display_name, ...)`) `user_profiles`-dan məlumat çəkməyə çalışırdı. PostgREST belə "join"ləri yalnız **birbaşa FK əlaqəsi** olduqda qura bilir — `user_profiles`-a FK olmadığı üçün sorğu **səssizcə boş** qayıdırdı (heç bir görünən xəta olmadan).

**Həll:** `fix_friend_battle_user_profiles_fk.sql` miqrasiyası ilə bütün uyğun FK-lər `auth.users(id)` yerinə `public.user_profiles(id)`-ə yönəldildi (hər user-in qeydiyyatda avtomatik profili olduğu üçün bu, eyni istifadəçini göstərir, sadəcə "join" üçün lazımi əlaqəni təmin edir).

→ Ətraflı: [[Bug-Jurnalı]]

## 🐛 Tapılan və Düzəldilən Bug — Realtime Kanal Toqquşması (səhifə tamamilə çökürdü)
**Simptom:** `BattleChallengePopup` əlavə edildikdən dərhal sonra, `/friends` səhifəsi açılan kimi **"Application error: a client-side exception has occurred"** xətası ilə tam çökürdü (boş ağ ekran).

**Kök səbəb (browser console-dan tapıldı):**
```
Error: cannot add `postgres_changes` callbacks for realtime:incoming-battles:<userId>
after `subscribe()`.
```
Həm qlobal `BattleChallengePopup` (bütün saytı əhatə edir), həm də `/friends` səhifəsi **eyni anda, eyni adlı** Supabase Realtime kanalına (`incoming-battles:${userId}`) abunə olmağa çalışırdı. Supabase-in client kitabxanası eyni adlı kanala ikinci dəfə abunə olunmasına icazə vermir → JS exception → React render tamamilə çökür.

**Həll:** `subscribeToIncomingBattles()` funksiyası (`src/lib/battles.ts`) hər çağırışda **təsadüfi unikal sufiks** əlavə edərək kanal yaradır: `incoming-battles:${userId}:${random}`. Beləliklə paralel abunəliklər (popup + səhifə) bir-birinə mane olmur.

> 💡 **Dərs:** Qlobal realtime abunəliklər əlavə edəndə, eyni resursa fərqli komponentlərdən abunə olma ehtimalını yoxla — kanal adları unikal olmalıdır, əks halda Supabase Realtime client səviyyəsində exception atır.

→ Ətraflı: [[Bug-Jurnalı]]

## 🔗 Bağlı qeydlər
[[Layihə-Xəritəsi]] · [[CLAUDE]] · [[english]] · [[Arxitektura]] · [[Qərarlar-Tarixçəsi]] · [[Bug-Jurnalı]]

#modul #db #realtime #bug
