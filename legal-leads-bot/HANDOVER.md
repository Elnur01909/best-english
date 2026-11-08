# HANDOVER — Hüquqi lidlər layihəsi (Legal Leads Bot)

> **Yeni sessiyanı belə başladın:**
> `claude/legal-aid-azerbaijan-research-3roqlx branch-ına keç, legal-leads-bot/HANDOVER.md faylını oxu və botu davam et. Bu sessiya: [tapşırıq]`
>
> Son yenilənmə: 2026-11-08. Hər sessiyanın sonunda "Cari vəziyyət" və "Növbəti addımlar" bölmələrini yeniləyin.

## 1. Məqsəd

İstifadəçi Azərbaycan hüququ üzrə **ingilis dilində hüquqi xidmət** göstərmək istəyir. Müştərilər Azərbaycanda hüquqi problemi olan xarici şirkətlər və xarici fiziki şəxslərdir. Layihənin iki hissəsi var:

1. **Araşdırma:** dünya üzrə potensial müştərilərin siyahısı, linklərlə.
2. **Telegram botu:** yeni lidləri, hüquqşünas vakansiyalarını və hüquqi konsultant tenderlərini avtomatik tapıb istifadəçiyə göndərir.

İstifadəçi həm müştəri lidlərini, həm də vakansiyaları görmək istəyir. Vakansiya mənbələrini söndürməyin.

## 2. Harada nə var

| Yer | Nə |
|---|---|
| `reports/Azərbaycanda hüquqi yardım potensial müştərilər.md` | Yekun hesabat: TOP 10 lid, 24 ehtiyat lid, beynəlxalq təşkilatlar, monitorinq kanalları |
| `research_notes/Azərbaycanda hüquqi yardım potensial müştərilər/` | 6 xam araşdırma qeydi |
| `legal-leads-bot/` | Bot. Python, asılılıqlar minimaldır, baza SQLite-dır |
| `.github/workflows/legal-leads-bot.yml` | Serversiz rejim: hər 30 dəqiqədən bir işləyir. Yalnız `master`-də işləyir, branch hələ birləşdirilməyib |

Repo: `Elnur01909/best-english`, açıqdır. Branch: `claude/legal-aid-azerbaijan-research-3roqlx`. Reponun əsas layihəsi AZEN saytıdır (Next.js). **AZEN fayllarına toxunmayın**, yəni `src/`, `public/`, `supabase/` və `package.json`.

## 3. Bot necə qurulub

```
mənbələr (config/sources.yaml) → sources.py oxuyur
  → filters.py açar söz filtri (keywords.yaml: geo, kateqoriyalar, exclude, weak)
  → storage.py SQLite (data/leads.sqlite): təkrar yoxlaması, statuslar, Claude balları, xülasə növbəsi
  → ai.py Claude balı (istəyə bağlı)
  → runner.py çatdırma: dərhal və ya səhər xülasəsi
  → bot.py Telegram əmrləri və düymələri
```

| Fayl | Rolu |
|---|---|
| `leadsbot/sources.py` | `gnews`, `rss`, `html_links`, `tg_channel` (t.me/s), `reliefweb_jobs`. Eyni hosta 3 saniyə fasilə qoyur, 429-da bir dəfə təkrarlayır |
| `leadsbot/filters.py` | Söz sərhədli uyğunluq. `categories` mənbə üzrə məhdudiyyətdir. `weak` sözlər tək başına lid sayılmır |
| `leadsbot/storage.py` | Baza miqrasiyası köhnə versiyadan avtomatik işləyir. `title_key` ilə mənbələr arası təkrar yoxlanılır |
| `leadsbot/ai.py` | Claude: 20-lik toplu qiymətləndirmə, `output_config.format` JSON sxemi, `effort: low`. Opus/Sonnet modellərində `fallbacks: "default"` aktivdir. Məktub layihəsi də buradadır. Şablon ehtiyatı var |
| `leadsbot/runner.py` | `run_cycle`, `maybe_send_digest`, `check_sources`. İlk oxunuşda başlanğıc nöqtəsi qoyulur: köhnə elementlər göndərilmir |
| `leadsbot/bot.py` | Əmrlər: `/last`, `/l123`, `/pipeline`, `/draft`, `/addtg`, `/deltg`, `/digest`, `/minscore`, `/ai`, `/update`, `/version`, `/restart` və başqaları. Düymələr: Maraqlıdır, Əlaqə saxladım, Uyğun deyil, Məktub |
| `leadsbot/updater.py` | `/update` GitHub-dan zip endirir və yalnız `legal-leads-bot/**` fayllarını yazır. `.env`, `data` və `.venv` qorunur. Sonra 42 kodu ilə çıxır |
| `leadsbot/setup_wizard.py` | `setup.bat`: token, `/start` gözləmə, çat ID, istəyə bağlı Claude açarı |
| `leadsbot/lock.py` | Tək nüsxə kilidi. İki bot eyni anda Telegram-da 409 xətası verir |
| `start.bat` | `cmd /k` ilə özünü yenidən açır ki, pəncərə bağlanmasın. Kod 42 olanda botu yenidən başladan `:run` döngüsü var. Bütün məntiq bir blokdadır, çünki `.bat` faylı işləyərkən dəyişsə cmd qarışır |
| `deploy/install-linux.sh` | Linux serverdə systemd xidməti qurur. `Restart=always` 42 kodunda da botu yenidən başladır |

## 4. İş qaydası (vacib)

- **Kod yalnız GitHub branch-ında dəyişdirilir.** Testlər keçir, sonra commit və push edilir. İstifadəçi Telegram-da `/update` yazır. İstifadəçinin bot qovluğunda birbaşa dəyişiklik etməyin: `/update` onu üzərinə yazacaq.
- **Testlər:** `cd legal-leads-bot && python -m pytest -q`. Hazırda 94 test var, hamısı keçməlidir.
- **`.bat` faylları:** sətir sonu CRLF olmalıdır (`.gitattributes`). Mətn yalnız ASCII olmalıdır. Pəncərə üçün `cmd /k` yenidən açılma bloku saxlanılmalıdır. `chcp 65001` istifadə etməyin: bəzi Windows versiyalarında bat faylını səssizcə dayandırır.
- **Sirlər:** `.env` heç vaxt commit edilmir və oxunmur.
- **Bulud sessiyasının məhdudiyyəti:** sandbox-da xəbər, iş və forum saytları bloklanır (proxy 403). `codeload.github.com` və `api.github.com` isə açıqdır. Real mənbə yoxlaması yalnız istifadəçinin kompüterində olur: `check.bat`.
- **Vercel:** bu branch-a push Vercel-də sınaq quruluşu yaradırdı və xəta məktubları gəlirdi. İstifadəçi Vercel-də "Ignored Build Step = Only build production" ayarını qoyub, artıq məktub gəlmir.
- **İstifadəçi ilə ünsiyyət:** Azərbaycan dilində, qısa, addım-addım. İstifadəçi texniki deyil, Windows işlədir. Zip göndərmək və əl ilə fayl köçürtmək istəmir.

## 5. Cari vəziyyət (2026-11-08)

- **Bot işləyir:** istifadəçinin kompüterində Windows-da, `@ALLLEGALBOT`, bir çat. İlk dövrə başlanğıc nöqtəsini qoyub.
- **Sonuncu zip göndərilib.** Bu versiyada `/update`, Claude, düymələr və səhər xülasəsi var. İstifadəçi onu quraşdırmalıdır: faylları köçürmək, Replace seçmək, `setup.bat`, sonra `start.bat`. Quraşdırıldığı təsdiqlənməyib.
- **Claude açarı:** istifadəçinin açar daxil edib-etmədiyi bilinmir. Defolt model `claude-opus-5-5`, təxminən 20 $/ay. Alternativ `claude-haiku-5-5`, 1 $/aydan az.
- **İstifadəçinin `check.bat` nəticəsi, 21 mənbə:**
  - ✅ **İşləyir:** Google News-un 6 sorğusu, `trend_rss`, `azernews_rss`, `expat_az_forum`, `undp_notices`, `hellojob_az` (60 element), `busy_az` (5 element), Reddit (12.11-dək).
  - ⛔ **Söndürülüb:** `tripadvisor` (403), `reliefweb_api_az` (təsdiqlənmiş appname yoxdur), `boss_az_legal` (404), `hh_az_legal` (ConnectionError), `jobsearch_az` (JS).
  - ❔ **Yoxlamadan sonra dəyişdirilib, hələ sınanmayıb:** `reliefweb_jobs_az` (ölkə səhifəsi), `smartjob_az` (`/vacancies`), `glorri_jobs` (yeni).
- **Səs-küy:** IT və sığorta tenderləri, borc statistikası tək ümumi sözə görə keçirdi. `weak` qaydası ilə düzəldilib və testlərdə real nümunələrlə yoxlanılıb.
- **Reddit** RSS-i 13.11.2026-da bağlanır. Reddit mənbələrində `disable_after: 2026-11-12` var.

## 6. Növbəti addımlar

1. **Quraşdırmanı təsdiqləmək:** istifadəçidən Telegram-da `/version` və `/ping` cavabını, həmçinin `check.bat` ekran şəklini istəyin. ❔ işarəli mənbələri nəticəyə görə düzəldin və ya söndürün.
2. **Telegram kanalları:** istifadəçi iş saytlarının Telegram linklərini `/addtg <link> job` ilə əlavə etməlidir. Kanal adları internetdə təsdiqlənmədi.
3. **Claude:** açar yoxdursa, xatırladın (`setup.bat`). Varsa, ilk günün ballarına baxıb `AI_MIN_SCORE` dəyərini tənzimləyin.
4. **Səhər xülasəsi:** istifadəçi istəsə, `/digest 09:00`.
5. **24 saat işləmə:** hazırda bot yalnız kompüter açıq olanda işləyir (`autostart.bat`). Növbəti variant Oracle Cloud Always Free + `deploy/install-linux.sh`. GitHub Actions üçün branch-ı `master`-ə birləşdirmək və secret-ləri əlavə etmək lazımdır, amma o rejimdə düymələr işləmir.
6. **Yeni mənbə ideyaları:** Dünya Bankı procurement API (Azərbaycan filtri yoxlanmalıdır), UNGM və EBRD e-poçt xəbərdarlıqları (açıq lent yoxdur), Azərbaycan dövlət satınalmaları portalı etender.gov.az (açıq API tapılmadı).
7. **Hesabatdakı TOP 10 lidlə iş:** Vulcan, Wonderful, GUGLER, ENNA, Sunsync, UFlex, Popeyes, TripAdvisor və Expat.com sorğuları. Onları bota "manual lid" kimi əlavə etmək ideyası hələ edilməyib.

## 7. Qərarlar tarixçəsi

- Telegram kanalları kodda sabit yazılmayıb, çünki adları təsdiqlənmədi. Onlar `/addtg` ilə istifadəçi tərəfindən əlavə olunur.
- LinkedIn və Facebook daxil edilməyib, çünki şərtləri avtomatik oxumağı qadağan edir.
- Bot heç kimə özü yazmır. Məktub layihələrini istifadəçi yoxlayıb özü göndərir.
- Claude defolt modeli `claude-opus-5-5`-dir. Ucuzlaşdırma istifadəçinin qərarıdır (`AI_MODEL`).
- Remote Control ilə qovluq paylaşma sınandı, amma qovluq siyahısı boş qayıtdı. Ona görə `/update` yolu seçildi.
