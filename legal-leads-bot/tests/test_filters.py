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
