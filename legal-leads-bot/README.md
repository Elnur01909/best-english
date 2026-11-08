# Legal Leads Bot — Telegram

Azərbaycanda **ingilis dilində hüquqi xidmətə ehtiyacı olan şirkət və şəxsləri**, həmçinin **hüquqşünas vakansiyalarını** və **beynəlxalq təşkilatların hüquqi konsultant tenderlərini** izləyib sizə Telegram-a göndərən bot.

Bot `reports/Azərbaycanda hüquqi yardım potensial müştərilər.md` araşdırmasındakı planı avtomatlaşdırır: lidlər hansı kanallardan gəlirdisə, bot həmin kanalları müntəzəm yoxlayır.

## Nə göndərir

| Kateqoriya | Nümunə | Mənbə |
|---|---|---|
| 🏢 Şirkət lidi | "UK firm opens Baku office", AFEZ-in yeni rezidenti, franşiza açılışı | Google News (6 sorğu) |
| 🧑‍💼 Fərdi sorğu | "Need an English speaking lawyer in Baku for residence permit" | Reddit, TripAdvisor, Expat.com |
| 💼 İş elanı | Legal Counsel, Compliance Manager — Bakı | boss.az, hh.az, jobsearch.az |
| 📑 Tender | "National Legal Consultant" — UNICEF/UNDP | ReliefWeb API, UNDP |
| ⚖️ Mübahisə | ICSID işi, lisenziya ləğvi, arbitraj | Google News |

Mesaj nümunəsi:

```
🏢 Şirkət lidi · Google News — Bakıda yeni ofis / filial / törəmə
UK oilfield firm Vulcan opens Baku office and extends Azerbaijan contract
World Oil · Wed, 08 Jul 2026
Açar sözlər: opens Baku office, new office
Linki aç
```

Bot ilk dəfə işə düşəndə mövcud xəbərləri **göndərmir**, sadəcə yadda saxlayır. Sonrakı hər yoxlamada yalnız **yeni** elementlər gəlir. Eyni xəbər iki dəfə gəlmir.

## Quraşdırma: 3 addım

**1. Bot yaradın.** Telegram-da [@BotFather](https://t.me/BotFather) → `/newbot` → ad verin. Sizə token verəcək (`123456789:AAH...`). Tokeni heç kimə göstərməyin.

**2. Layihəni hazırlayın.**

```bash
cd legal-leads-bot
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # Windows: copy .env.example .env
```

`.env` faylını açıb `TELEGRAM_BOT_TOKEN=` sətrinə tokeni yazın.

**3. Çat ID-nizi tapın.** Telegram-da botunuza `/start` yazın, sonra:

```bash
python -m leadsbot chatid
```

Çıxan `TELEGRAM_CHAT_ID=...` sətrini `.env`-ə yazın. Yoxlayın:

```bash
python -m leadsbot send-test     # Telegram-a test mesajı gəlməlidir
python -m leadsbot check         # hansı mənbələr işləyir
```

## İşə salmaq: 3 variant

**A. Kompüterinizdə və ya VPS-də (tövsiyə olunur).** Bot həm intervalla yoxlayır, həm də Telegram əmrlərinə cavab verir:

```bash
python -m leadsbot serve
```

**B. Docker ilə (VPS üçün, avtomatik yenidən başlayır):**

```bash
docker compose up -d --build
docker compose logs -f
```

**C. Pulsuz, serversiz: GitHub Actions.** Repoda `.github/workflows/legal-leads-bot.yml` hazırdır, hər 30 dəqiqədən bir `fetch` işə salır. GitHub-da repo → Settings → Secrets and variables → Actions → `TELEGRAM_BOT_TOKEN` və `TELEGRAM_CHAT_ID` əlavə edin. Bu rejimdə bot xəbər göndərir, amma əmrlərə (`/run`, `/last`) cavab vermir. GitHub-un cron-u bəzən 5–15 dəqiqə gecikir.

## Telegram əmrləri

| Əmr | Nə edir |
|---|---|
| `/run` | mənbələri indi yoxla |
| `/check` | hər mənbəni test et, bazaya yazmır |
| `/sources` | mənbələr və son status |
| `/mute <id>` · `/unmute <id>` | mənbəni söndür / yandır |
| `/addkw <söz>` · `/delkw <söz>` | öz açar sözünüzü əlavə edin, məs. `/addkw golden visa` |
| `/keywords` | əlavə açar sözlər |
| `/last 10` | son 10 uyğun element |
| `/stats` | statistika |
| `/stop` · `/start` | bildirişləri dayandır / davam et |
| `/reload` | konfiqurasiya fayllarını yenidən oxu |

Bot yalnız `.env`-dəki çat ID-lərinə cavab verir, başqaları istifadə edə bilməz.

## Fərdiləşdirmə

- **Mənbələr:** `config/sources.yaml`. Yeni Google News sorğusu əlavə etmək üçün mövcud `gnews_*` blokunu kopyalayıb `id` və `query` dəyişin. İstənilən RSS lenti `type: rss` ilə əlavə olunur.
- **Açar sözlər:** `config/keywords.yaml`. `geo` — Azərbaycanla bağlılıq şərti, `categories` — nə axtarılır, `exclude` — səs-küy (futbol, hava və s.).
- **İnterval:** `.env` → `FETCH_INTERVAL_MIN=30`. Bir dövrədə ən çox `MAX_PER_CYCLE=15` mesaj; artığı növbəyə düşür.

## Bilinən məhdudiyyətlər

- **TripAdvisor, Expat.com, hh.az** botları bloklaya bilər (HTTP 403). `/check` göstərəcək. İşləməyən mənbəni `/mute` edin və o forumu əl ilə izləyin.
- **Reddit** data-mərkəz IP-lərini (VPS, GitHub Actions) bəzən 429 ilə bloklayır. Ev kompüterindən adətən işləyir. `.env`-də `USER_AGENT`-i öz Reddit adınızla yazın.
- **jobsearch.az** JavaScript ilə yüklənə bilər, ona görə defolt söndürülüb. `python -m leadsbot check --only jobsearch_az_legal` ilə sınayın.
- **LinkedIn və Facebook qrupları** daxil edilməyib: onların şərtləri avtomatik oxumağı qadağan edir. Onları əl ilə izləyin.
- **UNGM və EBRD ECEPP** portallarında vendor kimi qeydiyyatdan keçib e-poçt xəbərdarlığı qurmaq botdan daha etibarlıdır.

## Etik qaydalar

- Bot yalnız açıq (public) məlumatı oxuyur və yalnız **sizə** mesaj göndərir. Heç kimə avtomatik yazmır.
- Fərdlərə yalnız onların yazdığı platformada, açıq və faydalı cavabla yanaşın. Reklam spamı platforma qaydalarını və Vəkillər Kollegiyasının reklam qaydalarını poza bilər.
- Mübahisə/arbitraj lidlərinə yanaşmazdan əvvəl maraqlar toqquşmasını yoxlayın.

## Testlər

```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

## Struktur

```
legal-leads-bot/
  leadsbot/        kod: mənbələr, filtr, baza (SQLite), Telegram, əmrlər
  config/          sources.yaml, keywords.yaml
  data/            leads.sqlite (avtomatik yaranır, git-ə düşmür)
  tests/           29 test + nümunə lentlər
```
