# HANDOVER — Hüquqi lidlər layihəsi (Legal Leads Bot)

> **Yeni sessiyanı belə başladın:**
> `claude/legal-aid-azerbaijan-research-3roqlx branch-ına keç, legal-leads-bot/HANDOVER.md faylını oxu və botu davam et. Bu sessiya: [tapşırıq]`
>
> Son yenilənmə: 2026-11-09. Hər sessiyanın sonunda "Cari vəziyyət" və "Növbəti addımlar" bölmələrini yeniləyin.

## 1. Məqsəd

İstifadəçi Azərbaycan Vəkillər Kollegiyasının üzvüdür, cinayət işi görmür və müştərini xaricdən axtarır: Azərbaycanla bağlı vəkil axtaran, istənilən növ hüquqi yardım axtaran və ya orada şirkət qurmaq istəyən xarici şirkətlər, sahibkarlar və əcnəbilər. Xaricdə yaşayan azərbaycanlılar da hədəfdir. Azərbaycanda yaşayan vətəndaşlar və yerli şirkətlər hədəf deyil. Dillər: ingilis, rus, türk, Azərbaycan. Şirkət xəbərləri (məs. "X şirkəti Azərbaycanda birgə müəssisə qurur") müraciət sayılmır, yalnız səhər siqnalı kimi gəlir. Layihənin iki hissəsi var:

1. **Araşdırma:** dünya üzrə potensial müştərilərin siyahısı, linklərlə.
2. **Telegram botu:** yeni lidləri və hüquqi konsultant tenderlərini avtomatik tapıb istifadəçiyə göndərir.

Vakansiyalar 2026-11-09-da istifadəçinin istəyi ilə söndürülüb (`/types individual tender company job` ilə qayıdır).

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
| `leadsbot/filters.py` | Söz sərhədli uyğunluq. `*` ilə bitən söz şəkilçiləri də tutur (`адвокат*`). Xüsusi hərflər fərq etmir (`vəkil` = `vekil`). `categories` mənbə üzrə məhdudiyyətdir. `weak` sözlər tək başına lid sayılmır |
| `leadsbot/storage.py` | Baza miqrasiyası köhnə versiyadan avtomatik işləyir. `title_key` ilə mənbələr arası təkrar yoxlanılır |
| `leadsbot/ai.py` | Claude: 20-lik toplu qiymətləndirmə, `output_config.format` JSON sxemi, `effort: low`. Opus/Sonnet modellərində `fallbacks: "default"` aktivdir. Məktub layihəsi də buradadır. Şablon ehtiyatı var |
| `leadsbot/runner.py` | `run_cycle`, `maybe_send_digest`, `check_sources`. İlk uğurlu oxunuşda başlanğıc nöqtəsi qoyulur: köhnə elementlər göndərilmir. `every_hours` ağır mənbələri seyrək oxuyur. Mənbə 3 dəfə ardıcıl xəta verəndə və ya 7 gün boş qalanda bir dəfə Telegram mesajı gəlir (`expect_empty` istisnadır) |
| `leadsbot/bot.py` | Əmrlər: `/last`, `/l123`, `/pipeline`, `/draft`, `/addtg`, `/deltg`, `/addrss`, `/delrss`, `/health`, `/digest`, `/minscore`, `/ai`, `/update`, `/version`, `/restart` və başqaları. Dövrə gedərkən mənbələr arasında əmrlərə cavab verir. Düymələr: Maraqlıdır, Əlaqə saxladım, Uyğun deyil, Məktub |
| `leadsbot/updater.py` | `/update` GitHub-dan zip endirir və yalnız `legal-leads-bot/**` fayllarını yazır. `.env`, `data` və `.venv` qorunur. Sonra 42 kodu ilə çıxır |
| `leadsbot/setup_wizard.py` | `setup.bat`: token, `/start` gözləmə, çat ID, istəyə bağlı Claude açarı |
| `leadsbot/lock.py` | Tək nüsxə kilidi. İki bot eyni anda Telegram-da 409 xətası verir |
| `start.bat` | `cmd /k` ilə özünü yenidən açır ki, pəncərə bağlanmasın. Kod 42 olanda botu yenidən başladan `:run` döngüsü var. Bütün məntiq bir blokdadır, çünki `.bat` faylı işləyərkən dəyişsə cmd qarışır |
| `deploy/install-linux.sh` | Linux serverdə systemd xidməti qurur. `Restart=always` 42 kodunda da botu yenidən başladır |

## 4. İş qaydası (vacib)

- **Kod yalnız GitHub branch-ında dəyişdirilir.** Testlər keçir, sonra commit və push edilir. İstifadəçi Telegram-da `/update` yazır. İstifadəçinin bot qovluğunda birbaşa dəyişiklik etməyin: `/update` onu üzərinə yazacaq.
- **Testlər:** `cd legal-leads-bot && python -m pytest -q`. Hazırda 145 test var, hamısı keçməlidir.
- **`.bat` faylları:** sətir sonu CRLF olmalıdır (`.gitattributes`). Mətn yalnız ASCII olmalıdır. Pəncərə üçün `cmd /k` yenidən açılma bloku saxlanılmalıdır. `chcp 65001` istifadə etməyin: bəzi Windows versiyalarında bat faylını səssizcə dayandırır.
- **Sirlər:** `.env` heç vaxt commit edilmir və oxunmur.
- **Bulud sessiyasının məhdudiyyəti:** sandbox-da xəbər, iş və forum saytları bloklanır (proxy 403). `codeload.github.com` və `api.github.com` isə açıqdır. Real mənbə yoxlaması yalnız istifadəçinin kompüterində olur: `check.bat`.
- **Vercel:** bu branch-a push Vercel-də sınaq quruluşu yaradırdı və xəta məktubları gəlirdi. İstifadəçi Vercel-də "Ignored Build Step = Only build production" ayarını qoyub, artıq məktub gəlmir.
- **İstifadəçi ilə ünsiyyət:** Azərbaycan dilində, qısa, addım-addım. İstifadəçi texniki deyil, Windows işlədir. Zip göndərmək və əl ilə fayl köçürtmək istəmir.

## 5. Cari vəziyyət (2026-11-09)

- **Bot işləyir:** istifadəçinin kompüterində Windows-da, `@ALLLEGALBOT`, bir çat. Qovluq `Masaüstü\legal-leads-bot\legal-leads-bot`, git reposu deyil.
- **Son versiya quraşdırılıb və `/update` real sınanıb.** `a6ffee6` yeniləməsində bot faylları yazdı və özünü yenidən başlatdı (kod 42), `.env` və baza qorundu.
- **GitHub-a yazma:** istifadəçinin kompüterində `git` var, `gh` yoxdur. Bot qovluğu git reposu deyil, ona görə repo ayrıca klonlanmalıdır. `Elnur01909` girişi Git Credential Manager-də saxlanıb. Orada başqa hesablar da var (`elnurmirzey-crypto`, köhnə `x-access-token`), ona görə remote URL-də hesab adı olmalıdır: `https://Elnur01909@github.com/Elnur01909/best-english.git`. Hesab adı olmadan push rədd edildi.
- **Claude açarı:** 2026-11-09-da istifadəçi özü `setup.bat` ilə yazıb, bot `claude-opus-5-5` ilə işləyir. Konsolda $3.86 balans var, auto-reload açılmayıb. Ölçülən xərc: 10 nümunəlik sorğu təxminən $0.04. Ucuz alternativ `claude-haiku-5-5`, keçid istifadəçinin qərarıdır.
- **Plan:** tam inkişaf planı istifadəçinin Masaüstündədir (`reports/Hüquqi lidlər botunun inkişaf planı.md`, repo açıq olduğu üçün GitHub-a göndərilməyib). 1-ci faza kodda hazırdır.
- **Mənbələr (2026-11-09, 98 sətir, 92 aktiv, standart olaraq 35-i oxunur):** kömək axtaranlar: `huquqlar_rss`, 5 `pravoved_*` sorğusu (hər ikisində `legal_forum: true`), `expat_az_forum_all`, Reddit (12.11-dək). Vakansiyalar: iş saytları, boss.az kateqoriyaları, 5 Telegram kanalı. Tenderlər: UNDP (2 qayda), EBRD (4131 sətir, 6 saatda bir), ADB, ReliefWeb, unjobs, Impactpool.
  - **Şirkət siqnalları:** `categories: [company, dispute]` olan 57 xəbər mənbəyi (Google News, rus/Azərbaycan/türk xəbər lentləri, ICSID, GAR, AFEZ və s.) yenidən oxunur. Şirkət xəbəri yalnız Claude 9+ bal verəndə və yalnız səhər xülasəsində gəlir (`SIGNAL_MIN_SCORE`, 09:00). Claude olmadan gəlmir. `/types individual job tender` ilə söndürülür, onda bu mənbələr oxunmur.
  - **Məhdudiyyət:** pravoved.ru axtarışı tarixə görə sıralanmır və kartda tarix yoxdur. Yeni sual yalnız ilk 15 nəticəyə düşəndə görünür, köhnə sual da "yeni" kimi gələ bilər.
  - ⛔ **Söndürülüb:** `huquqlar_rss` (yerli forum, hədəf xarici şirkətlərdir), `tripadvisor` (403), `reliefweb_api_az` (təsdiqlənmiş appname yoxdur), `boss_az_legal` (404), `hh_az_legal` (ConnectionError), `jobsearch_az_legal` (JS), `azertac_economy_rss` (işləyir, amma açar sözlə səs-küy verir; Claude açılanda `/unmute`).
  - **Çıxarılıb:** `bing_az_vekil` (siyasi məhkəmə xəbərləri), `bing_en_residence` (qayda xəbərləri): hər ikisində kömək axtaran yoxdur.
  - ⚠️ **Bəzən xəta verir:** `reddit_search_lawyer` (429), `taxes_news_az` (ConnectionError). Artıq 3 ardıcıl xətada bot özü yazır.
- **Canlı sınaq (2026-11-09):** standart 35 mənbə təxminən 70 saniyəyə oxunur. Botun bazasının surətində `/update`-dən sonrakı ilk dövrə 0 mesaj verdi (yeni mənbələr başlanğıc nöqtəsi alır). Gündə neçə real sual gələcəyi hələ ölçülməyib.
- **Claude ilə süzgəc:** `ai_screen: true` olan mənbələrdə (7 forum sətri və bütün Google Alerts lentləri) açar söz olmayan yeni yazını da Claude oxuyur, çünki insanlar çox vaxt sadəcə problemini yazır. Belə yazıların `hits` sahəsi boşdur və onlar heç vaxt balsız göndərilmir: Claude işləməsə 2 gün gözləyir, sonra gizlənir. Açar sözlü lidlər Claude xətasında balsız gedir. 3 ardıcıl uğursuz dövrədə bot bir dəfə Telegram-a yazır. Claude-un növü (`ai_category`) açar söz növünü üstələyir, ona görə şirkət xəbəri `/types`-da söndürülübsə gəlmir.
- **Səs-küy:** açar sözdən keçən hər şey Claude-dan keçir (minimum bal 6). Tarixi 30 gündən köhnə elementlər göndərilmir (`MAX_AGE_DAYS`). Tender üçün hüquqla bağlı güclü söz şərtdir (`need_strong`). Ümumi fərdi sözlər (`miras`, `долг`) `weak` siyahısındadır və yalnız `legal_forum` mənbələrində tək başına kifayətdir. r/azerbaijan-da iki ümumi söz olan postlar hələ keçir, amma Reddit 12.11-də sönür.
- **Reddit** RSS-i 13.11.2026-da bağlanır. Reddit mənbələrində `disable_after: 2026-11-12` var.

## 6. Növbəti addımlar

1. **Nəticələrə baxmaq:** 2026-11-23-də hansı mənbələrin lid verdiyinə baxın (`data/leadsbot.log`, `/stats`). Heç nə verməyənləri söndürün. Planın 2-ci fazası (mənbə üzrə həftəlik hesabat) bunu avtomatlaşdırır.
2. **Google Alerts (Reddit əvəzi):** istifadəçinin Google hesabında 30 alert var (RU, EN, TR; RSS, as-it-happens, all results) və hamısı bota əlavə olunub. 11-i xarici şirkətləri tutur ("local counsel" Azerbaijan, "register a company in Azerbaijan" və s.), qalanları vəkil axtaran əcnəbiləri. Azərbaycan dilindəki 8 alert yerli adamları tutduğu üçün silinib. Nəticələrin çoxu reklam ola bilər: Claude süzür, amma hər oxunan yazı pul tutur, ona görə balansa baxın. Lent linkləri yalnız botun bazasındadır (`user_sources`), açıq repoya yazmayın. Yeni alert: `/addrss <link> individual`. 2 həftə sonra hansının real sual gətirdiyinə baxın; yeni lent günlərlə boş qala bilər.
3. **Claude:** real açarla 4 dildə sınanıb: şirkət qurmaq istəyən xarici şirkət və sahibkarın müraciəti ən yüksək, yerli müraciət, qeydiyyat xidməti reklamı və cinayət işi ən aşağı bal alıb. İki həftə sonra `low` statuslu yazılara baxıb minimum balı tənzimləyin (`/minscore`).
4. **Nəzarət:** healthchecks.io hesabı açılsa, keçidi `/health <link>` ilə yazmaq kifayətdir.
5. **24 saat işləmə:** hazırda bot yalnız kompüter açıq olanda işləyir (`autostart.bat`). Windows tapşırığı `LegalLeadsBotWatchdog` hər 10 dəqiqədən bir `watchdog.vbs` işlədir və bot yoxdursa onu yenidən başladır; qurulmasını `watchdog-install.ps1` edir, `autostart-remove.bat` silir. 2026-11-09-da bot Claude tətbiqinin içindən başladıldığı üçün tətbiq yenidən başlayanda 19 saat dayanmışdı: botu heç vaxt Claude-un sessiyasından birbaşa başlatmayın, `explorer.exe` ilə `LegalLeadsBot.bat`-ı açın. Növbəti variant Oracle Cloud Always Free + `deploy/install-linux.sh`. GitHub Actions üçün branch-ı `master`-ə birləşdirmək və secret-ləri əlavə etmək lazımdır, amma o rejimdə düymələr işləmir.
6. **Tender portalları:** Dünya Bankı (`worldbank_az`) və TED (`ted_az`) 2026-11-09-da qoşulub, 6 saatda bir oxunur və hər yeni yazını Claude qiymətləndirir. Dünya Bankından yalnız məsləhətçi elanları götürülür, müqavilə nəticələri atılır. Hüquqi elan azdır: TED-də son 4 ayın 11 elanından heç biri hüquqi deyil, Dünya Bankının son 100 elanında "legal" sözü 2 dəfə keçir. Üzv siyahılarının müqayisəsi (AmCham, BCCA) hələ edilməyib.
7. **Hesabatdakı TOP 10 lidlə iş:** Vulcan, Wonderful, GUGLER, ENNA, Sunsync, UFlex, Popeyes, TripAdvisor və Expat.com sorğuları. Onları bota "manual lid" kimi əlavə etmək ideyası hələ edilməyib.

## 7. Qərarlar tarixçəsi

- 2026-11-10: istifadəçi axtardığı işlərin tam siyahısını verdi: Azərbaycan hüququ üzrə beynəlxalq və xarici tədqiqat layihələri, ingiliscə ödənişli akademik təhlil; beynəlxalq hüquq, insan hüquqları, humanitar hüquq, sülh hüququ, suverenlik, beynəlxalq iqtisadi və ticarət hüququ, dayanıqlı inkişaf hüququ üzrə ingiliscə onlayn dərs və təlim; məktəb, kollec və universitetlərdə onlayn insan hüquqları dərsi; bu sahələrdə akademik layihələr; xaricilərə ingiliscə izah və vəkil xidməti. Bunlar Claude təlimatına əlavə olundu və `tender` növü ilə gəlir. Bu iş üçün Azərbaycanla əlaqə şərt deyil, amma onlayn və ya uzaqdan olmalıdır. 6 yeni mənbə: EJIL:Talk, Opinio Juris, Völkerrechtsblog, 2 ReliefWeb axtarışı, UNjobs. EURAXESS və Academic Positions botları bloklayır (403), jobs.ac.uk RSS ünvanı 404 verir. İstifadəçi göndərilən 10 pravoved.ru sualından 9-nu "Maraqlıdır" işarələyib.
- 2026-11-09 axşam: **hədəf dəqiqləşdi.** İstifadəçi: "vəkil axtaran, hüquqi yardım axtaran, şirkət qurmaq istəyən, bütün növ hüquqi yardım." Ən yüksək balı şirkət qurmaq istəyən və ya bunu soruşan xarici şirkət və sahibkar, habelə vəkil axtaran xarici şirkət alır, "vəkil" sözü şərt deyil. Əcnəbilərin müraciəti 6–8 bal alır və gəlir. Xaricdə yaşayan azərbaycanlılar da istifadəçinin razılığı ilə əlavə olundu. Qeydiyyat xidməti reklamları, Azərbaycanda yaşayan vətəndaşların müraciətləri, başqa ölkənin hüququna aid suallar və cinayət işləri gəlmir. İstifadəçi real nümunə görsün deyə ilk oxunuşda saxlanmış pravoved.ru suallarından ən uyğun 10-u bir dəfə əl ilə növbəyə qoyuldu (kodda deyil, bazada).
- 2026-11-09 axşam: istifadəçinin istəyi ilə iş elanları söndürüldü, "vakansiya mənbələrini söndürməyin" qaydası artıq qüvvədə deyil. 17 iş mənbəyi oxunmur. Geri qaytarmaq: `/types individual tender company job`.
- 2026-11-09 axşam: botun bütün işi yoxlandı: 7 375 yazı oxunub, 5 mesaj göndərilib, heç biri real müştəri deyil. İstifadəçi botun istədiyi kimi olmadığını dedi. Ölçüdən əvvəl yeni mənbə əlavə etməyin.
- 2026-11-09: **əsas hədəf.** İstifadəçi vəkildir, cinayət işi görmür və dedi ki, müştərini Azərbaycandan yox, xaricdən, xarici şirkətlər arasında axtarır. Claude təlimatı buna görə yenidən yazıldı: xarici şirkət və təşkilatlar birinci, əcnəbilər ikinci, Azərbaycanda yaşayanlar və Azərbaycan vətəndaşlarının şəxsi işləri 1–2 bal. Telegram müraciət botu qurulmadı, çünki xarici şirkətlər vəkili belə axtarmır. İstifadəçi açıq müraciətlərin az olacağını bilərək şirkət xəbərlərini səhər siqnalı kimi istədi.
- 2026-11-09: istifadəçi şirkət xəbərini ("joint venture") nümunə göstərib yalnız real hüquqi yardım axtaranları istədiyini dedi. Şirkət və mübahisə xəbərləri standart olaraq söndürüldü. Vakansiya və tenderlər əvvəlki göstərişə görə qaldı (`/types individual` yalnız fərdi sorğular qoyur).
- 2026-11-09-da Telegram kanal adları istifadəçinin kompüterindən canlı yoxlandı və konfiqurasiyaya yazıldı. Başqa kanallar `/addtg` ilə əlavə olunur.
- LinkedIn və Facebook daxil edilməyib, çünki şərtləri avtomatik oxumağı qadağan edir.
- Bot heç kimə özü yazmır. Məktub layihələrini istifadəçi yoxlayıb özü göndərir.
- Claude defolt modeli `claude-opus-5-5`-dir. Ucuzlaşdırma istifadəçinin qərarıdır (`AI_MODEL`).
- Remote Control ilə qovluq paylaşma sınandı, amma qovluq siyahısı boş qayıtdı. Ona görə `/update` yolu seçildi.
