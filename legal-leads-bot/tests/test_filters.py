from leadsbot.filters import KeywordProfile, Matcher


def test_requires_geo_when_asked(matcher):
    assert matcher.evaluate("Company opens office in Tbilisi", "company", True) is None
    m = matcher.evaluate("Company opens office in Baku", "company", True)
    assert m and m.category == "company" and "Baku" in m.geo_hits


def test_geo_not_required(matcher):
    m = matcher.evaluate("Looking for a lawyer for my residence permit", "individual", False)
    assert m and m.category == "individual"
    assert "lawyer" in m.hits and "residence permit" in m.hits


def test_exclude_wins(matcher):
    assert matcher.evaluate("Baku football club opens new office", "company", True) is None


def test_no_keyword_no_match(matcher):
    assert matcher.evaluate("Best plov in Baku?", "individual", False) is None


def test_default_category_preferred_when_it_hits(matcher):
    text = "Azerbaijan: legal counsel vacancy — lawyer needed, hiring now"
    assert matcher.evaluate(text, "job", True).category == "job"


def test_falls_back_to_best_category(matcher):
    text = "Azerbaijan company signs memorandum of understanding and joint venture"
    m = matcher.evaluate(text, "individual", True)
    assert m.category == "company"


def test_word_boundaries_unicode():
    p = KeywordProfile(geo=[], categories={"job": ["hüquqşünas"]}, exclude=[])
    m = Matcher(p)
    assert m.evaluate("Baş hüquqşünas vakansiyası", "job", False)
    assert m.evaluate("hüquqşünasın məqaləsi", "job", False) is None


def test_short_keywords_do_not_match_inside_words(matcher):
    # "fine" must not match "define", "visa" must not match "advisable"
    assert matcher.evaluate("Baku: define the advisable route", "individual", False) is None


def test_extra_keywords(profile):
    m = Matcher(profile, extra_keywords=["golden visa"])
    r = m.evaluate("Azerbaijan golden visa program announced", "company", True)
    assert r and "golden visa" in r.hits


def test_score_counts_hits_and_geo(matcher):
    m = matcher.evaluate("Lawyer in Baku for work permit", "individual", False)
    assert m.score == len(m.hits) + 1


# Real səs-küy nümunələri (istifadəçinin 08.11.2026 check.bat nəticəsindən)
import pytest


@pytest.mark.parametrize("text,cat,cats", [
    ("Azerbaijan's Central Bank announces tender for XSOAR system support", "company", ["company", "dispute", "tender"]),
    ("SOFAZ opens tender for personnel's voluntary medical insurance services", "company", ["company", "dispute", "tender"]),
    ("Azerbaijan's Accounts Chamber announces tender for software licences", "company", ["company", "dispute", "tender"]),
    ("Debt in Europe & Central Asia climbs fast, but falls in Azerbaijan and Turkmenistan", "individual", ["individual"]),
    ("Who Were Most Frequently Deported from Georgia in 2026", "individual", ["individual"]),
])
def test_single_weak_word_is_not_a_lead(matcher, text, cat, cats):
    assert matcher.evaluate(text, cat, False, cats) is None


@pytest.mark.parametrize("text,cat,cats,expected", [
    ("Ministry of Justice announces tender for legal services in Baku", "company", ["company", "dispute", "tender"], "tender"),
    ("UNDP seeks a national legal consultant for Azerbaijan", "tender", ["tender"], "tender"),
    ("Need an English speaking lawyer in Baku", "individual", ["individual"], "individual"),
    ("Got fined and deported, what are my options in Azerbaijan?", "individual", ["individual"], "individual"),
])
def test_strong_or_two_weak_words_still_match(matcher, text, cat, cats, expected):
    m = matcher.evaluate(text, cat, False, cats)
    assert m and m.category == expected


# Çoxdilli uyğunlaşdırma: şəkilçilər (*) və xüsusi hərfsiz yazı
def test_star_catches_suffixes_and_plain_word_stays_exact():
    m = Matcher(KeywordProfile(geo=[], categories={"job": ["адвокат*", "hüquqşünas"]}, exclude=[]))
    assert m.evaluate("Ищу адвоката", "job", False).hits == ["адвокат"]
    assert m.evaluate("hüquqşünasın məqaləsi", "job", False) is None


def test_phrase_with_stars_and_line_break():
    m = Matcher(KeywordProfile(geo=[], categories={"x": ["вид* на жительств*"]}, exclude=[]))
    assert m.evaluate("Получил вида\nна жительство", "x", False)


@pytest.mark.parametrize("text", ["vekil lazimdir", "VƏKİL LAZIMDIR", "Vəkilə müraciət etdim", "vekile yazdim"])
def test_azerbaijani_with_or_without_special_letters(matcher, text):
    assert matcher.evaluate(text, "individual", False, ["individual"]), text


@pytest.mark.parametrize("text,cat,cats,geo", [
    ("Вид на жительство в Азербайджане: нужна консультация юриста", "individual", ["individual"], True),
    ("Azerbaycan'da oturma izni için avukat arıyorum", "individual", ["individual"], True),
    ("Компания открыла офис в Баку", "company", ["company", "dispute", "tender"], True),
    ("Azərbaycanda birgə müəssisə yaradılır", "company", ["company", "dispute", "tender"], True),
    ("Türk şirketi Bakü'de ofis açtı", "company", ["company", "dispute", "tender"], True),
    ("Центробанк оштрафовал страховую компанию в Азербайджане", "dispute", ["dispute", "company"], True),
    ("Требуется юрисконсульт, Баку", "job", ["job"], False),
    ("Hüquqi xidmətlərin satın alınması", "tender", ["tender"], False),
])
def test_real_russian_turkish_azerbaijani_leads(matcher, text, cat, cats, geo):
    m = matcher.evaluate(text, cat, geo, cats)
    assert m and m.category == cat, text


@pytest.mark.parametrize("text,cat,cats", [
    ("Azərbaycan Mərkəzi Bankı tender elan edib", "company", ["company", "dispute", "tender"]),
    ("Азербайджан объявил тендер на поставку оборудования", "company", ["company", "dispute", "tender"]),
    ("В Баку подписали соглашение о культурном обмене", "company", ["company", "dispute", "tender"]),
    # 09.11.2026 canlı sınaqda tapılmış səs-küy
    ("Chinese business delegation visits Alat Free Economic Zone", "company", ["company", "dispute", "tender"]),
    ("Nvidia rəhbəri araşdırmaya cəlb olunub, hüquq məsləhətçisi bildirib", "tender", ["company", "dispute", "tender"]),
])
def test_general_words_alone_are_not_leads_in_any_language(matcher, text, cat, cats):
    assert matcher.evaluate(text, cat, False, cats) is None


def test_geo_needs_a_real_place_name(matcher):
    # türkcə "bakım" (qulluq) Bakı sayılmamalıdır
    assert matcher.evaluate("Bakım için avukat arıyorum", "individual", True, ["individual"]) is None


def test_football_is_excluded_in_russian_and_azerbaijani(matcher):
    assert matcher.evaluate("Футбольный клуб из Баку открыл офис", "company", True) is None
    assert matcher.evaluate("Futbol klubu Bakıda yeni ofis açıb", "company", True) is None


@pytest.mark.parametrize("text,geo", [
    ("Наследство в Баку: как оформить, живу в России", True),
    ("Atamdan qalan miras barədə sualım var", False),
    ("Dəbilqəsiz sürməyin cəriməsi varmı?", False),
])
def test_one_general_word_is_enough_only_on_a_legal_forum(matcher, text, geo):
    assert matcher.evaluate(text, "individual", geo, ["individual"]) is None
    assert matcher.evaluate(text, "individual", geo, ["individual"], allow_weak=True)


def test_general_post_on_an_ordinary_forum_is_not_a_lead(matcher):
    assert matcher.evaluate("Ağır depresiya, maaş az, nə edim", "individual", False, ["individual"]) is None
    assert matcher.evaluate("Amazondan çatdırılma və vergi", "individual", False, ["individual"]) is None


def test_tender_without_a_legal_word_is_not_a_lead(matcher):
    text = "International Consultant on gender-responsive sustainable finance, individual consultant, Baku"
    assert matcher.evaluate(text, "tender", False, ["tender"]) is None
    assert matcher.evaluate("National legal consultant for Azerbaijan", "tender", False, ["tender"])
