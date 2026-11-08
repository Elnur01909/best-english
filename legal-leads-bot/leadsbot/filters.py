from __future__ import annotations

import re
from dataclasses import dataclass, field

from .models import MatchResult

Compiled = list[tuple[str, re.Pattern]]


def _pattern(word: str) -> re.Pattern:
    """Söz sərhədli, hərf ölçüsünə həssas olmayan regex.
    Unicode (\\w) Azərbaycan hərflərini də əhatə edir, ona görə 'hüquqşünas'
    'hüquqşünasın' içində tapılmaz — bu istənilən davranışdır (yalan pozitivləri azaldır)."""
    w = word.strip()
    esc = re.escape(w)
    start = r"(?<!\w)" if w and w[0].isalnum() else ""
    end = r"(?!\w)" if w and w[-1].isalnum() else ""
    return re.compile(start + esc + end, re.IGNORECASE)


def compile_words(words: list[str] | None) -> Compiled:
    out: Compiled = []
    seen: set[str] = set()
    for w in words or []:
        w = str(w).strip()
        if not w or w.lower() in seen:
            continue
        seen.add(w.lower())
        out.append((w, _pattern(w)))
    return out


@dataclass
class KeywordProfile:
    geo: list[str] = field(default_factory=list)
    categories: dict[str, list[str]] = field(default_factory=dict)
    exclude: list[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, d: dict) -> "KeywordProfile":
        cats = d.get("categories") or {}
        return cls(
            geo=list(d.get("geo") or []),
            categories={str(k): list(v or []) for k, v in cats.items()},
            exclude=list(d.get("exclude") or []),
        )


class Matcher:
    """Mətni açar sözlərə görə qiymətləndirir."""

    def __init__(self, profile: KeywordProfile, extra_keywords: list[str] | None = None):
        self.geo = compile_words(profile.geo)
        self.cats = {c: compile_words(ws) for c, ws in profile.categories.items()}
        self.exclude = compile_words(profile.exclude)
        self.extra = compile_words(extra_keywords)

    @staticmethod
    def _hits(compiled: Compiled, text: str) -> list[str]:
        return [w for w, rx in compiled if rx.search(text)]

    def evaluate(self, text: str, default_category: str | None, require_geo: bool) -> MatchResult | None:
        text = text or ""
        if self._hits(self.exclude, text):
            return None
        geo_hits = self._hits(self.geo, text)
        if require_geo and not geo_hits:
            return None

        by_cat = {c: self._hits(rxs, text) for c, rxs in self.cats.items()}
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

        score = len(hits) + (1 if geo_hits else 0)
        return MatchResult(category=category, score=score, hits=hits, geo_hits=geo_hits)
