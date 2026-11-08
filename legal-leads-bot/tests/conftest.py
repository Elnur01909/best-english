import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import pytest  # noqa: E402

from leadsbot.config import DEFAULT_KEYWORDS, DEFAULT_SOURCES, Settings, load_profile, load_sources  # noqa: E402
from leadsbot.filters import Matcher  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def profile():
    return load_profile(DEFAULT_KEYWORDS)


@pytest.fixture
def matcher(profile):
    return Matcher(profile)


@pytest.fixture
def sources():
    return load_sources(DEFAULT_SOURCES)


@pytest.fixture
def settings(tmp_path):
    return Settings(
        bot_token="123:TEST", allowed_chat_ids=["42"], db_path=tmp_path / "t.sqlite",
        sources_file=DEFAULT_SOURCES, keywords_file=DEFAULT_KEYWORDS, max_per_cycle=2,
    )


def fixture_text(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def fixture_bytes(name: str) -> bytes:
    return (FIXTURES / name).read_bytes()
