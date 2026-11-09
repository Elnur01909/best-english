from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

from .models import MatchResult

Compiled = list[tuple[str, re.Pattern]]

# Forumlarda çox vaxt xüsusi hərfsiz yazılır: "vekil", "huquqsunas", "Baki".
# Həm mətn, həm açar söz eyni formaya salınır, ona görə hər iki yazılış tapılır.
_FOLD = str.maketrans({
    "ə": "e", "Ə": "e", "ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ç": "c", "Ç": "c",
    "ğ": "g", "Ğ": "g", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u", "ё": "е", "Ё": "е",
    "’": "'", "ʼ": "'", "`": "'",
})


def fold(text: str) -> str:
    """Müqayisə forması: kiçik hərf, Azərbaycan/türk xüsusi hərfləri olmadan, ё → е."""
    return unicodedata.normalize("NFC", text or "").translate(_FOLD).lower().replace("\u0307", "")


def _pattern(word: str) -> re.Pattern:
    """Söz sərhədli regex (mətn fold() ilə müqayisə olunur).
    Söz '*' ilə bitirsə, şəkilçilər də tutulur: 'адвокат*' → адвоката, адвокату; 'vəkil*' → vəkilə, vəkillər.
    '*' olmayan söz dəqiq axtarılır: 'hüquqşünas' 'hüquqşünasın' içində tapılmır (yalan pozitivləri azaldır)."""
    w = fold(word.strip())
    body = r"\s+".join(re.escape(part).replace(r"\*", r"\w*") for part in w.split())
    start = r"(?<!\w)" if w and w[0].isalnum() else ""
    end = r"(?!\w)" if w and w[-1].isalnum() else ""
    return re.compile(start + body + end)


def label(word: str) -> str:
    """Telegram mesajında göstərilən forma ('vəkil*' → 'vəkil')."""
    return " ".join(p.rstrip("*") for p in str(word).split())


def compile_words(words: list[str] | None) -> Compiled:
    out: Compiled = []
    seen: set[str] = set()
    for w in words or []:
        w = str(w).strip()
        if not w or fold(w) in seen:
            continue
        seen.add(fold(w))
        out.append((label(w), _pattern(w)))
    return out


@dataclass
class KeywordProfile:
    geo: list[str] = field(default_factory=list)
    categories: dict[str, list[str]] = field(default_factory=dict)
    exclude: list[str] = field(default_factory=list)
    weak: list[str] = field(default_factory=list)
    need_strong: list[str] = field(default_factory=list)  # bu kateqoriyalarda ən azı bir güclü söz şərtdir

    @classmethod
    def from_dict(cls, d: dict) -> "KeywordProfile":
        cats = d.get("categories") or {}
        return cls(
            geo=list(d.get("geo") or []),
            categories={str(k): list(v or []) for k, v in cats.items()},
            exclude=list(d.get("exclude") or []),
            weak=list(d.get("weak") or []),
            need_strong=list(d.get("need_strong") or []),
        )


class Matcher:
    """Mətni açar sözlərə görə qiymətləndirir."""

    def __init__(self, profile: KeywordProfile, extra_keywords: list[str] | None = None):
        self.geo = compile_words(profile.geo)
        self.cats = {c: compile_words(ws) for c, ws in profile.categories.items()}
        self.exclude = compile_words(profile.exclude)
        self.extra = compile_words(extra_keywords)
        self.weak = {fold(label(w)) for w in profile.weak if str(w).strip()}
        self.need_strong = set(profile.need_strong)

    @staticmethod
    def _hits(compiled: Compiled, text: str) -> list[str]:
        return [w for w, rx in compiled if rx.search(text)]

    def evaluate(
        self,
        text: str,
        default_category: str | None,
        require_geo: bool,
        allowed: list[str] | None = None,
        allow_weak: bool = False,
    ) -> MatchResult | None:
        """allowed: yalnız bu kateqoriyaların açar sözləri sayılır (məs. iş saytında yalnız 'job')."""
        text = fold(text)
        if self._hits(self.exclude, text):
            return None
        geo_hits = self._hits(self.geo, text)
        if require_geo and not geo_hits:
            return None

        cats = self.cats if not allowed else {c: r for c, r in self.cats.items() if c in allowed}
        by_cat = {c: self._hits(rxs, text) for c, rxs in cats.items()}
        extra_hits = self._hits(self.extra, text)
        total = sum(len(v) for v in by_cat.values()) + len(extra_hits)
        if total == 0:
            return None

        if default_category and by_cat.get(default_category):
            category = default_category
        else:
            best = max(by_cat.items(), key=lambda kv: len(kv[1]), default=(None, []))
            category = best[0] if best[1] else (default_category or "other")

        hits: list[str] = []
        for c in ([category] + [c for c in by_cat if c != category]):
            for w in by_cat.get(c, []):
                if w not in hits:
                    hits.append(w)
        for w in extra_hits:
            if w not in hits:
                hits.append(w)

        strong = [h for h in hits if fold(h) not in self.weak]
        if not strong and len(hits) < 2 and not allow_weak:
            return None  # yalnız bir ümumi söz (məs. 'tender', 'debt') — lid deyil

        if category in self.need_strong and not extra_hits and all(fold(h) in self.weak for h in by_cat.get(category, [])):
            return None  # məs. "consultant" + "international consultant": hüquqla bağlı söz yoxdur

        score = len(hits) + (1 if geo_hits else 0)
        return MatchResult(category=category, score=score, hits=hits, geo_hits=geo_hits)
