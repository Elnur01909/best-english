# Legal Leads Bot — Telegram

Dünyanın harasında olursa olsun **Azərbaycanla bağlı vəkil, hüquqi yardım axtaran və ya orada şirkət qurmaq istəyən xarici şirkət, sahibkar və əcnəbiləri** (ingilis, rus, türk, Azərbaycan dillərində) və **hüquqi konsultant tenderlərini** izləyib sizə Telegram-a göndərən bot.

## Nə edir

1. **Oxuyur:** Google News (6 sorğu), Trend və AzerNews lentləri, Expat.com forumu, iş saytları (HelloJob, Smartjob, Busy, Boss, hh.az), UNDP və ReliefWeb, sizin əlavə etdiyiniz Telegram kanalları.
2. **Süzür:** açar sözlər, mənbəyə uyğun kateqoriyalar və eyni xəbərin təkrarlarının atılması.
3. **Qiymətləndirir (istəyə bağlı):** Claude hər lidə 1–10 bal verir, Azərbaycanca xülasə yazır və lazım olan hüquqi xidməti göstərir. Aşağı ballı lidlər gəlmir.
4. **Çatdırır:** ani bildiriş və ya hər səhər bir xülasə. Hər lidin altında düymələr: ⭐ Maraqlıdır · 📞 Əlaqə saxladım · ❌ Uyğun deyil · ✍️ Məktub hazırla.

Bot ilk dəfə oxuduğu mənbədən köhnə elementləri **göndərmir**, yalnız yadda saxlayır. Sonra yalnız yeniləri gəlir.

## Quraşdırma

**Windows:**

1. Python 3.10+ quraşdırın: https://www.python.org/downloads. **"Add Python to PATH"** qutusunu işarələyin.
2. Telegram-da [@BotFather](https://t.me/BotFather) → `/newbot` → token alın.
3. **setup.bat** — asılılıqları quraşdırır, tokeni soruşur, `/start` gözləyir, istəsəniz Claude açarını soruşur.
4. **start.bat** — botu işə salır.
5. **autostart.bat** — kompüter açılanda bot özü işə düşsün (ləğv: autostart-remove.bat).

**Mac / Linux:**

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m leadsbot setup      # token, /start, Claude açarı
python -m leadsbot serve      # botu işə salır
```

Ayarları dəyişmək: `python -m leadsbot setup --force`.

## Yeniləmə: `/update`

Yeni versiya çıxanda zip yükləmək lazım deyil. Telegram-da yazın:

```
/update
```

Bot GitHub-dan yalnız dəyişən faylları endirir, lazım olsa paketləri quraşdırır və özü yenidən başlayır. `.env`, `data/` və `.venv/` heç vaxt toxunulmur. `/version` cari versiyanı göstərir, `/restart` isə botu yenidən başladır. Bot işləmirsə, eyni işi **update.bat** görür.

Kod `Elnur01909/best-english` reposunun `claude/legal-aid-azerbaijan-research-3roqlx` branch-ından gəlir. Branch dəyişsə, `.env` faylına `UPDATE_BRANCH=...` yazın. Bu branch-a yalnız push icazəsi olanlar kod əlavə edə bilər.

## Claude süni intellekt filtri

Claude olmadan bot açar sözlərlə işləyir, amma çox səs-küy gəlir. Claude ilə hər lid qiymətləndirilir.

| Model (`AI_MODEL`) | Təxmini xərc | Qeyd |
|---|---|---|
| `claude-opus-5-5` | ~20 $/ay | Defolt, ən dəqiq |
| `claude-haiku-5-5` | <1 $/ay | Çox ucuz; keyfiyyəti sınayın |

Xərc gündə ~150 uyğun lid üçün təxminidir. Açar: https://platform.claude.com → API Keys (claude.ai abunəliyindən ayrıdır). Opus/Sonnet modellərində Claude bir sorğunu rədd etsə, server özü uyğun ehtiyat modelə keçir (`fallbacks: "default"`).

"❌ Uyğun deyil" düyməsi ilə işarələdiyiniz son lidlər Claude-a nümunə kimi verilir: oxşarlarına aşağı bal qoyur.

Claude açarı varsa, forumlarda və Google Alerts lentlərində açar söz olmasa da hər yeni yazını Claude oxuyur (`sources.yaml` → `ai_screen`). Belə olanda problemini sadə sözlə yazan adam da tapılır. Bu yazılar yalnız Claude bal verəndən sonra gəlir: o işləməsə balsız göndərilmir, 3 ardıcıl xətadan sonra bot Telegram-a yazır.

Şirkət xəbərləri (X şirkəti Bakıda ofis açır) kömək istəmək deyil, ona görə dərhal gəlmir. Claude 9 və daha yüksək bal verirsə, xəbər hər səhər 09:00-da "Şirkət siqnalları" mesajına düşür (`SIGNAL_MIN_SCORE`). Claude olmadan siqnal gəlmir. Söndürmək üçün: `/types individual job tender`.

## Telegram əmrləri

| Əmr | Nə edir |
|---|---|
| `/last 20` | son uyğun lidlər |
| `/l123` | lid kartı və düymələr |
| `/pipeline` | "Maraqlıdır" və "Əlaqə saxladım" lidləri |
| `/draft 123` | lidin dilində məktub layihəsi (Claude; açar yoxdursa ingiliscə şablon) |
| `/types individual tender company` | Telegram-a hansı lid növləri gəlsin (`company` səhər siqnallarıdır, `job` və `dispute` əlavə oluna bilər) |
| `/addtg @kanal job` | ictimai Telegram kanalı əlavə et (`job`, `individual`, `company`, `tender`) |
| `/deltg @kanal` | kanalı sil |
| `/digest 09:00` · `/digest off` · `/digest now` | səhər xülasəsi |
| `/minscore 6` | minimum Claude balı |
| `/ai` | Claude statusu |
| `/run` · `/check` · `/sources` | yoxla · test et · mənbələr |
| `/mute id` · `/unmute id` | mənbəni söndür / yandır |
| `/addkw söz` · `/delkw söz` · `/keywords` | əlavə açar sözlər |
| `/stats` · `/stop` · `/start` · `/ping` | statistika · bildirişlər |
| `/update` · `/version` · `/restart` | yeniləmə · versiya · yenidən başlatma |

Bot yalnız `.env`-dəki çat ID-lərinə cavab verir.

### Telegram kanalları necə əlavə olunur

Azərbaycanda iş elanları çox vaxt Telegram kanallarında paylaşılır. HelloJob, Smartjob, Work.az kimi saytların hər vakansiya səhifəsində "Telegram kanalımız" linki var. O linki kopyalayıb bota göndərin:

```
/addtg https://t.me/kanal_adi job
```

Bot kanalı dərhal yoxlayır. Yalnız ictimai kanallar işləyir.

## 24 saat işləmə

| Variant | Çətinlik | Düymələr işləyir |
|---|---|---|
| Windows + autostart.bat | asan | bəli, kompüter açıq olanda |
| Linux server: `bash deploy/install-linux.sh` | orta | bəli, həmişə |
| Docker: `docker compose up -d` | orta | bəli |
| GitHub Actions (hər 30 dəq) | asan | xeyr, yalnız bildiriş |

**Pulsuz server:** Oracle Cloud "Always Free" Linux VM. Qeydiyyatdan sonra serverdə:

```bash
git clone <repo> && cd <repo>/legal-leads-bot
bash deploy/install-linux.sh
```

Skript virtual mühiti qurur, setup-ı işlədir və botu `systemd` xidməti kimi qeydiyyatdan keçirir: server yenidən başlasa, bot da başlayır.

Botun iki nüsxəsi eyni vaxtda işləyə bilməz: ikinci nüsxə avtomatik dayanır.

## Fərdiləşdirmə

- **Mənbələr:** `config/sources.yaml`. `categories` mənbədə hansı açar söz növlərinin sayıldığını təyin edir (məs. iş saytında yalnız `job`). `disable_after: "YYYY-MM-DD"` mənbəni həmin tarixdən sonra söndürür.
- **Açar sözlər:** `config/keywords.yaml`.
- **Ayarlar:** `.env` (bax `.env.example`).

## Bilinən məhdudiyyətlər

- **Reddit** RSS lentlərini 13.11.2026-da bağlayır. Bot Reddit mənbələrini 12.11.2026-dan sonra özü söndürür.
- **TripAdvisor** botları bloklayır: söndürülüb, forumu əl ilə izləyin.
- **❔ işarəli mənbələr** (Trend, AzerNews, iş saytları, ReliefWeb RSS) real şəbəkədə hələ sınanmayıb: `check.bat` ilə yoxlayın, işləməyəni `/mute` edin.
- **ReliefWeb API** təsdiqlənmiş tətbiq adı tələb edir. **UNGM, EBRD, ADB** açıq lent vermir: onların e-poçt xəbərdarlıqlarına abunə olun.
- **LinkedIn və Facebook** daxil edilməyib, şərtləri avtomatik oxumağı qadağan edir.

## Etik qaydalar

- Bot yalnız açıq məlumatı oxuyur və yalnız **sizə** yazır. Məktub layihələrini siz yoxlayıb özünüz göndərirsiniz.
- Fərdlərə yalnız onların yazdığı platformada, faydalı cavabla yanaşın. Vəkillər Kollegiyasının reklam qaydalarına riayət edin.
- Mübahisə və arbitraj lidlərində əvvəlcə maraqlar toqquşmasını yoxlayın.

## Testlər

```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

Xətalar `data/leadsbot.log` faylına yazılır.
