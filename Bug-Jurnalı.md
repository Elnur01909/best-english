# 🐞 Bug Jurnalı

> Tapılan problem → kök səbəb → düzəliş. Eyni xəta təkrarlanmasın deyə qeyd edirik.

Bağlı: [[Layihə-Xəritəsi]] · [[Qərarlar-Tarixçəsi]] · [[english]]

| Problem | Kök səbəb | Düzəliş |
|---|---|---|
| Tələffüz testi səhv tələffüzə yüksək bal verirdi (məs. 82/100 yaşıl) | Azure-un `pronScore`-u sözün ümumi balını real fonem keyfiyyətindən asılı olmadan hesablayır | `effectivePronScore()` — zəif fonem balına görə tavan qoyuldu (`<60` → yaşıl ola bilməz) |
| "75 dəqiqlik, 100 axıcılıq, 100 tamlıq" — rəqəmlər inandırıcı deyildi | Azure-un alt-xal sistemi istifadəçi üçün izah olunmadan göstərilirdi, etibarsız görünürdü | Bu 3 göstərici tamamilə UI-dan silindi |
| Yazma məşqində səsi əl ilə dayandırmaq lazım gəlirdi — naturalsızlıq | Recording mexanizmi yalnız manual stop dəstəkləyirdi | VAD (Voice Activity Detection): `AnalyserNode` + RMS monitorinqlə avtomatik dayanma (~650ms səssizlik) |
| FORCE MAJEURE tərcüməsində mənbədə olmayan sözlər var idi ("fəlakət, müharibə, epidemiya") | İlkin tərcümə zamanı izahedici nümunələr əlavə edilmiş, amma orijinal tərifdə yox idi | Sadiq tərcüməyə keçid, sonra Azərbaycan Mülki Məcəlləsinin rəsmi terminologiyasına ("fövqəladə və qarşısıalınmaz hallar") uyğunlaşdırma |
| Mock-test-də collocation sualları səssiz idi | Audio inteqrasiyası unudulmuşdu | `AudioPlayer variant="icon"` əlavə olundu |
| Audio düyməsi bəzi səhifələrdə solda, bəzilərində sağda idi | Komponentlər ayrı-ayrı vaxtlarda, fərqli pattern ilə yazılmışdı | Bütün sayt üzrə audit aparıldı, hamısı sağ tərəfə standartlaşdırıldı |
| Eyni mock-test sualı təkrar gələndə cavab variantlarının sırası dəyişmirdi | `shuffle()` yalnız ilk yüklənmədə çağırılırdı, state-də saxlanılmırdı | `useMemo(() => shuffle(...), [qIdx, current?.id])` — hər sual görünüşündə təzə qarışdırma |
| ProfessorWidget bəzi sual səhifələrində yox idi | Komponent tədricən əlavə edilirdi, hamısına paralel köçürülməmişdi | Bütün Q&A səhifələri (mock-test, reading×3, placement) üçün audit + inteqrasiya |
| OutputModal-da "Təqdim" düyməsi nə üçün olduğu aydın deyildi | Düymə həqiqətən heç nə etmirdi — sadəcə `onComplete()` çağırırdı, Skip ilə eynilik təşkil edirdi | Düymə silindi, yalnız "🎓 AI yoxla" (real qiymətləndirmə) və "Skip" qaldı, "Davam →" yalnız AI yoxlamasından sonra görünür |
| Memory Lab-da "İkili Kodlaşdırma — Vizual Səhnə" çaşqınlıq yaradırdı | Funksiya konseptual cəhətdən aydın izah olunmamışdı, istifadəçiyə artıq yük kimi görünürdü | UI bloku, AI generasiya promptu (`generateDeepEncoding`), DB sahəsi (`visual_az`) tam silindi |
| Dostluq sorğusu göndərilirdi, amma qarşı tərəfdə "Sorğular" tabında görünmürdü | `friend_requests`/`battles`/`battle_answers` sütunları `auth.users(id)`-ə FK bağlı idi, amma sorğular PostgREST embedding (`sender:sender_id(email,...)`) ilə `user_profiles`-dan məlumat çəkirdi — FK əlaqəsi olmadığı üçün sorğu səssizcə boş qayıdırdı | `fix_friend_battle_user_profiles_fk.sql` — bütün uyğun FK-lər `public.user_profiles(id)`-ə yönəldildi → [[Dostlar-və-Yarış-Funksiyası]] |

## ⏳ Açıq qalan (hələ düzəldilməyib)
- **Reading collocation reshuffle bug** (`task_3f44833e`): seçim variantları hər render-də (o cümlədən cavab seçiləndə) yenidən qarışır, vizual "tullanma" yaradır → `useMemo`-ya keçirilməli (ayrıca background sessiyada işlənir)
