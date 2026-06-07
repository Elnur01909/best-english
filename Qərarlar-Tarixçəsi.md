# 📜 Qərarlar Tarixçəsi

> Niyə müəyyən şəkildə etdik? Gələcəkdə eyni sualı yenidən soruşmamaq üçün qərarların **səbəbini** qeyd edirik.

Bağlı: [[Layihə-Xəritəsi]] · [[Bug-Jurnalı]] · [[english]]

## 🎙️ Tələffüz qiymətləndirməsi
- **Qərar**: Azure-un xam `pronScore`-una etibar etmədik, fonem-səviyyəli `effectivePronScore()` yaratdıq.
- **Səbəb**: Azure zəif tələffüzlərə belə yüksək (yaşıl) bal verirdi — istifadəçi "AÇÇEPTANS" sözünü səhv tələffüz etsə də 82/100 "Çox yaxın!" görürdü.
- **Qayda**: zəif fonem balı <60 olarsa, ümumi nəticə "yaşıl/yüksək" tier-ə çata bilməz.
- Ətraflı: [[Funksional-Modullar#Tələffüz]]

## ⚖️ Hüquqi tərcümə standartı (FORCE MAJEURE nümunəsi)
- **Qərar**: tərcümələr İngiliscə tərifə **sadiq** olmalı (uydurma söz əlavə etmək olmaz) VƏ mümkün olduqda Azərbaycan qanunvericiliyinin rəsmi terminologiyasına uyğunlaşdırılmalıdır.
- **Nümunə**: "fəlakət, müharibə, epidemiya" kimi mənbədə olmayan sözlər çıxarıldı, bunun əvəzinə Mülki Məcəllənin rəsmi termini — **"fövqəladə və qarşısıalınmaz hallar"** — istifadə olundu (mənbə: aziplawfirm.com + MM maddə 379.1.1, 588.2, 813, 831.3, 1108.1).
- **Qayda**: hüquqi terminlər tərcümə edilərkən, mümkünsə Azərbaycan Mülki/Əmək Məcəlləsindəki ekvivalent rəsmi ifadə axtarılsın.

## 🎨 UI ardıcıllığı (audio düymələri, shuffle, Professor)
- **Qərar**: bütün sual/seçim səhifələrində (drill, mock-test, quiz, output, reading, placement) **eyni pattern**:
  - Audio düyməsi seçim qutusunun **sağında**, kənarında (`AudioPlayer variant="icon"`)
  - Cavab variantları **hər dəfə** təzədən qarışdırılır (`useMemo` + `shuffle`, sual ID-si ilə key-lənir)
  - `ProfessorWidget` hər sualın yanında, mood + Growth Mindset mesajı ilə
- **Səbəb**: istifadəçi bir hissədə fərqli div-lər/yerləşmə görəndə "bütün sayt eyni formada olmalıdır" tələbini bildirdi — uyğunsuzluq UX-i pozur.

## ✂️ Lüzumsuz/çaşdırıcı funksiyaların silinməsi
- **Azure alt-xal göstəriciləri (Dəqiqlik/Axıcılıq/Tamlıq)** → silindi: rəqəmlər real performansla uyğun gəlmirdi, çaşqınlıq yaradırdı.
- **OutputModal "Təqdim" düyməsi** → silindi: funksional olaraq "Skip"dən fərqlənmirdi (heç hara getmir, heç kim yoxlamır), amma adı istifadəçidə "haraya göndərilir?" sualı yaradırdı.
- **Memory Lab "İkili Kodlaşdırma — Vizual Səhnə"** → tam silindi (UI + AI + DB sahəsi): istifadəçi bunu lazımsız/çaşdırıcı saydı.
- **Qayda**: əgər bir funksiya istifadəçidə **"bu nəyə lazımdır?"** sualı yaradırsa və real fayda vermirsə — onu saxlamaqdansa silmək doğru seçimdir.

## 🤖 ProfessorWidget-in ikili rejimi
- **Qərar**: Q&A səhifələrində (mock-test, quiz, reading, placement) Professor **mühakimə edici** rejimdə (happy/disappointed/thinking), amma "öyrənmə" səhifələrində (lessons, memory-lab) **YOX** — orda düz/səhv anlayışı olmadığı üçün yalnız **bələdçi** mesajları göstərir (neutral/thinking/happy — mərhələ-uyğun).
- **Səbəb**: istifadəçi "burda düşünmək, üzülmək, sevinmək yoxdur, necə olacaq?" sualını verdi — Professor-un məqsədi kontekstə uyğunlaşdırılmalı idi, hər yerdə eyni məntiqlə işləməməlidir.
