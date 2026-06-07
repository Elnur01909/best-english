# Best English — Layihə Analizi

> Bu sənəd layihənin texniki audit/analiz xülasəsidir. Yeni sessiyada işə başlamazdan əvvəl bunu oxumaq layihənin tam mənzərəsini verir.

🔗 Bağlı qeydlər: [[Layihə-Xəritəsi]] · [[CLAUDE]] · [[Qərarlar-Tarixçəsi]] · [[Bug-Jurnalı]]

## 1. Layihə nədir?

**Best English** — TOLES (hüquqi ingilis dili sertifikatı) hazırlığı və ümumi ingilis dili öyrənməsi üçün interaktiv veb platformadır. Elmi əsaslı (kognitiv psixologiya, SM-2 SRS, Growth Mindset, Affective Filter) bir öyrənmə sistemi qurulub və tam produksiyaya hazır vəziyyətdədir.

- **Stack**: Next.js 14 (App Router, TypeScript) + Supabase (Auth/Postgres/RLS) + Tailwind CSS + Recharts, Vercel-də host olunur.
- **Dil**: UI tam Azərbaycan dilində, məzmun (lüğət/oxu/testlər) ingilis hüquqi terminologiyasına əsaslanır.
- **Auth axını**: `(auth)/login`, `(auth)/register` → `onboarding` (Identity Shift sualları) → `placement` (səviyyə testi) → `dashboard`.

## 2. Qovluq strukturu (faktiki)

```
src/
  app/
    (auth)/login, (auth)/register   ← Auth səhifələri
    onboarding/                     ← "Niyə öyrənirsən?" Identity Shift
    placement/                      ← Səviyyə ölçmə testi (18 sual, A1–C2)
    dashboard/                      ← Statistika, streak, naviqasiya mərkəzi
    vocabulary/                     ← SRS flashcard sistemi (SM-2)
    drill/                          ← Sürətli lüğət məşqi (audio + variant seçimi)
    quiz/                           ← Test modulu (Foundation/Higher/Advanced)
    mock-test/                      ← Tam simulyasiya testi (collocation və s.)
    reading/                        ← Oxu modulu (3 mərhələli: oxu → sual → kollokasiya)
    lessons/, lessons/[id]/         ← Dərslər siyahısı və dərs səhifəsi
    memory-lab/                     ← "Yaddaş Laboratoriyası" — 4 mərhələli dərin kodlaşdırma
    output/                         ← Yazma çıxışı (Output Mandatory metodologiyası)
    change-level/                   ← Səviyyəni əl ilə dəyişmək
    api/ai/route.ts                 ← Gemini AI proxy (BYOK + paylaşılan limit)
    api/pronunciation/route.ts      ← Azure Pronunciation Assessment proxy
  components/
    AudioPlayer, ProfessorWidget/Avatar, AITutorChat, AIKeySetup, AzureKeySetup,
    SpeakingPractice, WritingExercise, OutputModal, DailySchedule, WeakPoints, ui/
  lib/
    supabase.ts    ← Supabase client + bütün DB sorğuları
    srs.ts         ← SM-2 alqoritmi
    ai.ts          ← Gemini inteqrasiyası (BYOK + paylaşılan key, limitlər)
    azureSpeech.ts ← Azure tələffüz qiymətləndirməsi (fonem-səviyyəli, VAD)
    pronunciation.ts ← Sadə (Web Speech API) tələffüz müqayisəsi
    psychology.ts  ← Growth Mindset / Affective Filter mesaj bankı
    analysis.ts    ← Zəif nöqtə analizi (Deliberate Practice)
    curriculum.ts  ← Gündəlik tədris planı mühərriki
    toles.ts, hours.ts, sessionScore.ts, translate.ts, utils.ts
  data/
    vocab.json (150+ termin), quizzes.json (~150 sual), lessons.json (10 dərs),
    cases.json (5 case-study), reading.json, placement.json + placement2.json,
    curriculum.json
  types/index.ts   ← Bütün TS tipləri (CEFRLevel, VocabItem, QuizQuestion və s.)
supabase/schema.sql ← DB strukturu + RLS siyasətləri
```

## 3. Verilənlər bazası (Supabase/Postgres)

`supabase/schema.sql`-da yaradılan cədvəllər:

| Cədvəl | Təyinat |
|---|---|
| `user_profiles` | İstifadəçi profili: səviyyə, TOLES səviyyəsi, streak, xal, son aktivlik |
| `user_vocab_progress` | SRS irəliləyişi: `next_review`, `interval`, `ease_factor`, `repetitions`, `consecutive_lapses` (leech aşkarlama) |
| `user_quiz_results` | Test nəticələri tarixçəsi (zəif nöqtə analizi üçün) |
| `user_lesson_progress` | Dərs tamamlama statusu |
| `vocab_mnemonics` | AI tərəfindən yaradılmış mnemonika keşi (paylaşılan, hər söz üçün 1 dəfə) |
| `vocab_deep_dive` | "Yaddaş Laboratoriyası" üçün dərin kodlaşdırma keşi (mnemonika + etimologiya — vizual səhnə son sessiyada silindi) |

Bütün cədvəllərdə RLS (Row Level Security) aktivdir — istifadəçi yalnız öz datasına çata bilir, paylaşılan keş cədvəlləri (`vocab_mnemonics`, `vocab_deep_dive`) hamı üçün oxunur.

## 4. Əsas funksional modullar

### 4.1 SRS (Spaced Repetition System) — `vocabulary/`
- SM-2 alqoritmi (`lib/srs.ts`): `quality` 0–5, başlanğıc `ease_factor=2.5`, `interval` artımı `interval × ease_factor`.
- "Leech" aşkarlama: 4+ ardıcıl unutma → söz xüsusi diqqətə alınır.
- Gündəlik kurikulum avtomatik irəliləyir, kartların sırası qarışdırılır (təkrar-eyni-sıra problemi aradan qaldırılıb).

### 4.2 Test/Quiz sistemi — `quiz/`, `mock-test/`, `placement/`, `reading/`
- 3 TOLES səviyyəsi üzrə test bankı (Foundation/Higher/Advanced).
- Bütün cavab variantları **hər dəfə təsadüfi qarışdırılır** (`useMemo` + `shuffle()`, sual ID-sinə bağlı key ilə — sabit emal, təzə görünüş).
- Cavab variantlarının yanında **audio düyməsi sağ tərəfdə** standartlaşdırılıb (bütün səhifələrdə eyni: drill/mock-test/quiz/output/reading/placement — `AudioPlayer variant="icon"`).
- Hər sual/tapşırıq səhifəsində **ProfessorWidget** var (mood: happy/disappointed/thinking/neutral, Growth Mindset mesajları ilə).
- Placement testi: 18 sual (hər səviyyədən 3), nəticəyə görə avtomatik CEFR səviyyə təyini və profilə yazılması.

### 4.3 Tələffüz təcrübəsi — `SpeakingPractice.tsx`
İki rejim:
1. **Sadə (default)**: Web Speech API + Levenshtein/Soundex oxşarlıq (`lib/pronunciation.ts`).
2. **Dəqiq (BYOK/paylaşılan)**: Azure Pronunciation Assessment — fonem-səviyyəli qiymətləndirmə (`lib/azureSpeech.ts`):
   - `effectivePronScore()` — Azure-un həddən artıq yumşaq xal verməsini fonem-səviyyəli datadan düzəldir (zəif fonem ≤60 olduqda yaşıl/yüksək nəticə qeyri-mümkündür).
   - **VAD (Voice Activity Detection)**: `AnalyserNode` + RMS səviyyə monitorinqi ilə danışıq bitəndə avtomatik dayanma (~650ms səssizlikdən sonra) — əl ilə "Dayan" düyməsinə ehtiyac yoxdur.
   - Azure-un çaşdırıcı alt-xal göstəriciləri (Dəqiqlik/Axıcılıq/Tamlıq) UI-dan silinib.

### 4.4 Yazma — `WritingExercise.tsx`, `OutputModal.tsx`
- **Output Mandatory metodologiyası**: hər neçə kartdan sonra yazı tələb olunur (Krashen-in i+1 prinsipinə əsaslanan "məcburi çıxış").
- `OutputModal`: istifadəçi sözdən cümlə qurur. İki real seçim var:
  - **🎓 AI yoxla** → Gemini AI-ya göndərilir, qrammatik rəy qaytarılır (`checkWriting()`).
  - **Skip** → heç nə baş vermir, sadəcə keçilir.
  - *(Qeyd: əvvəllər "Təqdim" düyməsi də var idi — funksionallıqca Skip-dən fərqlənmirdi (heç hara getmirdi, heç kim yoxlamırdı), istifadəçi qarışıqlıq yaratdığını bildirdi və düymə silindi.)*

### 4.5 Yaddaş Laboratoriyası — `memory-lab/`
4 mərhələli dərin kodlaşdırma axını (elmi yaddaş üsullarına əsaslanır):
1. **Recall** — özün xatırla (açmadan əvvəl)
2. **Context** — cümlədə gör, ucadan tələffüz et
3. **Encode** — açar söz (mnemonika) + kök (etimologiya) ilə yaddaşa "yapışdır"
   - *(Qeyd: əvvəllər 3-cü komponent "İkili Kodlaşdırma — Vizual Səhnə" idi, istifadəçi bunun çaşdırıcı/lazımsız olduğunu bildirdi, AI generasiyası və UI-dan tamamilə silindi — yalnız mnemonika + etimologiya qaldı.)*
4. **Generate** — generasiya effekti: ÖZ cümləni yarat (`OutputModal` bura inteqrasiya olunub)

ProfessorWidget bura da əlavə olunub — lakin "düşünür/sevinir/məyus olur" düzgün-yanlış məntiqi YOXDUR, sadəcə mərhələ-uyğun bələdçi mesajları göstərir (qeyri-mühakimə edici rejim).

### 4.6 AI inteqrasiyası — `lib/ai.ts`, `api/ai/route.ts`
- **Google Gemini** (BYOK — istifadəçi öz açarını əlavə edə bilər, `AIKeySetup.tsx`) + paylaşılan pulsuz limit (gündə 15 sorğu).
- Funksiyalar: `checkWriting` (yazı yoxlama), `explainQuizError` (səhv izahı), `tutorChat` (AI repetitor söhbəti), `generateMnemonic`, `generateDeepEncoding` (mnemonika + etimologiya).
- Xəta idarəetməsi: `SHARED_LIMIT`, `NO_KEY`, `BAD_KEY`, `RATE_LIMIT`, `NO_AUTH` halları üçün AZ mesajlar.

### 4.7 Psixologiya/Motivasiya qatı — `lib/psychology.ts`
- **Growth Mindset mesajları**: 'success' | 'wrong_answer' | 'vocabulary_hard' | 'streak_break' kateqoriyaları üzrə təsadüfi mesajlar.
- **Affective Filter**: xəta = cəza yox, izah/dəstək (Krashen nəzəriyyəsi).
- **Identity Shift**: onboarding-də "Niyə öyrənirsən?" sualı ilə şəxsiyyət-əsaslı motivasiya.
- **Streak/Dopamine sistemi**: ardıcıllıq mərhələləri üçün xüsusi mesajlar.

### 4.8 ProfessorWidget — interaktiv personaj
- 4 əhval: `happy | disappointed | thinking | neutral`.
- Sual-cavab səhifələrində (mock-test, quiz, reading, placement) — düzgün/yanlış cavaba reaksiya verir.
- Qeyri-mühakimə rejimi (lessons, memory-lab) — "düşünmək/məyus olmaq" yoxdur, sadəcə mərhələ bələdçisi.
- Köpük (bubble) yalnız `mood !== 'neutral'` və ya mesaj ötürüləndə görünür.

## 5. Son sessiyalarda həll olunmuş əsas problemlər (xronoloji)

1. Tələffüz qiymətləndirməsi həddən artıq yumşaq idi → fonem-səviyyəli düzəliş (`effectivePronScore`) tətbiq olundu, bandlar sıxlaşdırıldı (zəif fonem <60 → yaşıl/yüksək bal mümkün deyil).
2. Çaşdırıcı Azure alt-xal göstəriciləri (Dəqiqlik/Axıcılıq/Tamlıq) UI-dan silindi.
3. Avtomatik VAD-əsaslı yazma dayandırma əlavə olundu (əl ilə "Dayan" lazım deyil).
4. FORCE MAJEURE tərcüməsi düzəldildi — uydurma sözlər (fəlakət/müharibə/epidemiya) çıxarıldı, Azərbaycan Mülki Məcəlləsinin rəsmi terminologiyasına ("fövqəladə və qarşısıalınmaz hallar") uyğunlaşdırıldı.
5. Mock-test-də collocation suallarına audio düyməsi əlavə olundu, sağ tərəfə yerləşdirildi və bütün sayt üzrə (drill/quiz/output/reading/placement) eyni patterna gətirildi.
6. Mock-test cavab variantlarının sırası hər dəfə təkrar-qarışdırılması təmin edildi (`useMemo` + `shuffle`).
7. ProfessorWidget bütün sual/tapşırıq səhifələrinə (+ lessons, memory-lab) əlavə olundu.
8. `OutputModal`-da lüzumsuz "Təqdim" düyməsi silindi (Skip ilə eyni iş görürdü, istifadəçidə "haraya göndərilir?" sualı yaradırdı).
9. `memory-lab`-dan "İkili Kodlaşdırma — Vizual Səhnə" funksiyası tam silindi (UI + AI generasiyası + DB keş sahəsi).

## 6. Davam edən / arxa fonda olan işlər
- **`task_3f44833e`** (ayrıca background sessiya): `reading/page.tsx`-də collocation seçimlərinin hər render-də yenidən qarışması (inline `shuffle()` çağırışı) — `useMemo`-ya keçirilməsi planlaşdırılıb.

## 7. Standart iş qaydaları (bu layihə üçün)
- **Avtomatik commit + push**: istifadəçi hər dəfə "məndən soruşmadan dayima push et" tələbini vermişdir — bütün dəyişikliklər təsdiqsiz commit + push olunur.
- **Layihə bitəndə**: istifadəçi "layihə bitti, Elnur" desə, `.claude/settings.local.json`-da `defaultMode` `"bypassPermissions"`-dan `"default"`-a qaytarılmalıdır.
- Bütün UI mətnləri Azərbaycan dilində, kommunikasiya da Azərbaycan dilində aparılır.

## 8. Güclü tərəflər
- Elmi əsaslı dizayn (SM-2, Growth Mindset, Krashen-in Affective Filter/i+1, Output Mandatory, Deliberate Practice).
- Tam BYOK dəstəyi (Gemini + Azure) + paylaşılan pulsuz limitlər — istifadəçi öz açarı ilə limitsiz işləyə bilər.
- Sayt-boyu vizual/funksional ardıcıllıq (audio düymələri, ProfessorWidget, shuffle məntiqi standartlaşdırılıb).
- TOLES-ə xüsusi hazırlıq (kollokasiyalar, sertifikat xəritəsi, hüquqi terminologiya — mənbələrlə (Mülki Məcəllə) yoxlanılıb).

## 9. Diqqət ediləcək sahələr / təklif olunan növbəti addımlar
- `task_3f44833e` (reading collocation reshuffle) tamamlanmalıdır.
- `lib/translate.ts` və köhnə debug-yönümlü kod qalıqları (əgər varsa) təmizlənə bilər.
- "İ+1 Adaptiv Çətinlik Engine" hələ optional/bitməmiş elementdir (CLAUDE.md-də qeyd olunub).
- Mobil tətbiq (React Native) — gələcək üçün düşünülən, hələ başlanmayıb.
