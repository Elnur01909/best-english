# Best English — TOLES + İngilis Dili Öyrənmə Platforması

## Layihə haqqında
İnteraktiv veb öyrənmə platforması. İstifadəçilər:
- İstənilən CEFR səviyyəsindən (A1→C2) başlaya bilər, istənilən vaxt dəyişə bilər
- TOLES sertifikat hazırlığı (Foundation / Higher / Advanced)
- SRS lüğət sistemi (SM-2 alqoritmi — Ebbinghaus unudulma əyrisinə əsasən)
- Testlər (Foundation 50q + Higher 50q + Advanced 50q)
- 10 mini-dərs (qrammatika + oxuma + məşqlər)
- 5 Case Study + 5 yazı məşqi
- Şəxsi hesab, irəliləyiş statistikaları, streak sistemi

## Tech Stack
- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Auth + PostgreSQL + Row Level Security)
- **Tailwind CSS** (stil)
- **Recharts** (statistika qrafiklər)
- **Vercel** (hosting — pulsuz)

## Qovluq Strukturu
```
src/
  app/
    (auth)/login/        ← Giriş səhifəsi
    (auth)/register/     ← Qeydiyyat
    dashboard/           ← Statistika ana səhifə
    vocabulary/          ← SRS flashcard sistemi
    quiz/                ← Test modulu
    lessons/             ← Dərs siyahısı
    lessons/[id]/        ← Dərs səhifəsi
  components/ui/         ← Button, Card, Badge və s.
  lib/
    supabase.ts          ← Supabase client
    srs.ts               ← SM-2 SRS alqoritmi
    utils.ts             ← Köməkçi funksiyalar
  data/
    vocab.json           ← 150 hüquqi termin
    quizzes.json         ← 150 test sualı
    lessons.json         ← 10 dərs
    cases.json           ← 5 case study
  types/
    index.ts             ← TypeScript tiplər
supabase/
  schema.sql             ← DB strukturu + RLS
```

## Verilənlər Bazası Cədvəlləri
```
auth.users               ← Supabase-in özü idarə edir
user_profiles            ← id, level, toles_level, streak, total_points, last_active
user_vocab_progress      ← user_id, vocab_id, next_review, interval, ease_factor, repetitions
user_quiz_results        ← user_id, quiz_id, correct, time_taken, answered_at
user_lesson_progress     ← user_id, lesson_id, completed, completed_at
```

## SRS Alqoritmi (src/lib/srs.ts)
SM-2 alqoritmi:
- quality: 0–5 (0=tamamilə unutdum, 3=çətinliklə, 5=mükəmməl)
- ease_factor başlanğıc: 2.5
- interval başlanğıc: 1 gün
- Hər uğurlu xatırlamada: interval = interval × ease_factor

## Dizayn Prinsipləri
- Anxiety-free: xəta = izah (cərimə yox), yaşıl rəng nailiyyət üçün
- Mobile-first responsive
- Hər yerdə progress görünən (streak, level, statistika)
- Dark/Light mode dəstəyi

## Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Mövcud Vəziyyət
- [x] Layihə strukturu yaradıldı
- [x] CLAUDE.md yazıldı
- [x] package.json hazırlandı
- [x] Supabase schema yazıldı
- [x] TypeScript tiplər yazıldı
- [x] SRS alqoritmi yazıldı
- [x] Supabase client yazıldı
- [x] vocab.json (150 termin) yazıldı
- [x] quizzes.json (150 sual) yazıldı
- [x] lessons.json (10 dərs) yazıldı
- [x] Auth səhifələri (login/register + change-level)
- [x] Dashboard (streak, stats, navigasiya)
- [x] Vocabulary (SRS) modulu
- [x] Quiz modulu
- [x] Lessons modulu
- [ ] Deploy (Vercel)

## Növbəti Sessiya Üçün
Hər sessiyada bu faylı oxu, sonra "Mövcud Vəziyyət"-i yenilə.
Claude Code sessiyasını belə başla: "CLAUDE.md-ə bax. Bu session: [tapşırıq]"
## ✅ TAMAMLANMIŞ — HZIR ISTIFADƏYƏ

**React Komponentləri:**
- ✅ Auth (login/register/change-level + Middleware)
- ✅ Onboarding (Identity Shift + Growth Mindset)
- ✅ Dashboard (stats, streak, navigasiya)
- ✅ Vocabulary (SRS SM-2 + Affective Filter + Audio)
- ✅ Quiz (150 sual, 3 səviyyə + Growth Mindset)
- ✅ Lessons (10 dərs + Audio + Yazma məşqi)
- ✅ Components: AudioPlayer, WritingExercise, OutputModal

**Psixologiya (Hissə 1) — ✅ TAMAMLANMIŞ:**
- Onboarding: "Nə üçün ingilis dilini öyrənirsiniz?" (Identity Shift)
- Affective Filter: Xəta → Growth Mindset toast ("🧠 Beyin güclənir!")
- Vocabulary & Quiz-ə feedback inteqrasiyası

**Neyrobiologiya (Hissə 2) — 3/4 Modal:**
- ✅ Görmə (Visual): Kart görmə
- ✅ Eşitmə (Auditory): AudioPlayer (Google TTS)
- ✅ Yazma (Motor): WritingExercise
- ✅ Danışma (Speaking): SpeakingPractice + Levenshtein/Soundex uyğunluq alqoritmi (lib/pronunciation.ts)

**Metodologiya (Hissə 3) — ✅ TAMAMLANMIŞ:**
- ✅ Output Mandatory: Hər 3 kartdan sonra yazma məcburidir
- ✅ Deliberate Practice: Quiz sonrası zəif nöqtə analizi
- ✅ Immersion Körpüsü: Hər dərs sonunda real YouTube/Podcast/Məqalə
- ⏳ İ+1 Adaptiv: Çətinlik otomatik ölçülsün (kompleks — optional)

**TOLES Xüsusi (Hissə 6) — ✅ TAMAMLANMIŞ:**
- ✅ TOLES Sertifikat Xəritəsi: Foundation → Higher → Advanced
- ✅ TOLES Kollokasiyaları: 12+ hüquqi çoxlu-sözlü ifadə
- ✅ Dərs Sonunda Kollokasiya Təkrarı

**Data:**
- ✅ vocab.json: 150 hüquqi termin
- ✅ quizzes.json: 150 sual
- ✅ lessons.json: 10 dərs + immersion links
- ✅ cases.json: 5 case study

**Günlük Proqram (Hissə 5) — ✅ TAMAMLANMIŞ:**
- ✅ DailySchedule: Səhər/Gündüz/Axşam/Gecə 4-sessiya
- ✅ FSI Hours Roadmap: Vaxt reallığı, "Sıfırdan C1-ə 2-3 il"
- ✅ Konsistensiya Vurğusu: 45 dəq gündə > 5h həftədə

---

## ✅ TAMAMLANMIŞ PLATFORM — Elmi Əsaslı, Produksiyaya Hazır

**Tamamlanan 6 Hissə:**
1. ✅ **Psixologiya**: Affective Filter, Growth Mindset, Identity Shift
2. ✅ **Neyrobiologiya**: SM-2, 4-Modal (3/4), Yuxu
3. ✅ **Metodologiya**: SRS, Output Mandatory, Deliberate Practice, Immersion
4. ✅ **Vaxt**: FSI Hours, Konsistensiya vs Intensivlik
5. ✅ **Günlük Program**: 4-Sessiya (40-55 dəq), 70/20/10 balansı
6. ✅ **TOLES Xüsusi**: Sertifikat yolu, Kollokasiyalar
7. ✅ **Mənbələr**: Krashen, Dweck, Ebbinghaus, vb.

**Komponenti Sayı:**
- 6 React Səhifə (Auth/Onboarding/Dashboard/Vocabulary/Quiz/Lessons)
- 7 Komponent (AudioPlayer, WritingExercise, OutputModal, DailySchedule, vb.)
- 4 Utility Library (srs.ts, psychology.ts, toles.ts, hours.ts, analysis.ts)

**Deploy Edən İçin:**
1. `.env.local` yaradın: Supabase keyləri
2. `npm install` → `npm run build` → `vercel deploy`
3. Supabase: schema.sql çalıştırın

**Optional Enhancements (Sonrakı):**
- İ+1 Adaptiv Çətinlik Engine
- Əvvəlcə Notification System (CronCreate)
- Mobile App (React Native)
