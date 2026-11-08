"""Botun özünü GitHub-dan yeniləməsi: /update (Telegram) və `python -m leadsbot update`.

Repo açıqdır, ona görə açar lazım deyil. Yalnız `legal-leads-bot/` alt qovluğu yazılır;
.env, data/, .venv/ heç vaxt toxunulmur."""
from __future__ import annotations

import io
import logging
import os
import subprocess
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Callable

import requests

log = logging.getLogger("leadsbot.updater")

DEFAULT_REPO = "Elnur01909/best-english"
DEFAULT_BRANCH = "claude/legal-aid-azerbaijan-research-3roqlx"
SUBDIR = "legal-leads-bot"
PROTECTED = {".env", "data", ".venv", "venv", "__pycache__", ".pytest_cache"}
RESTART_EXIT_CODE = 42


class UpdateError(Exception):
    pass


class RestartRequested(BaseException):
    """BaseException-dır ki, əmr dövrəsindəki `except Exception` onu udmasın."""


@dataclass
class UpdateResult:
    updated: bool
    sha: str
    files: int = 0
    pip_ran: bool = False
    message: str = ""


def repo_and_branch() -> tuple[str, str]:
    repo = os.getenv("UPDATE_REPO", "").strip() or DEFAULT_REPO
    branch = os.getenv("UPDATE_BRANCH", "").strip() or DEFAULT_BRANCH
    return repo, branch


def version_file(root: Path) -> Path:
    return root / "data" / "version.txt"


def installed_sha(root: Path) -> str:
    try:
        return version_file(root).read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def latest_sha(session: requests.Session, repo: str, branch: str, timeout: int = 20) -> str:
    try:
        r = session.get(f"https://api.github.com/repos/{repo}/commits/{branch}",
                        headers={"Accept": "application/vnd.github+json"}, timeout=timeout)
        r.raise_for_status()
        return str(r.json().get("sha") or "")
    except (requests.RequestException, ValueError) as exc:
        log.warning("son versiya yoxlanmadı: %s", exc.__class__.__name__)
        return ""


def download_zip(session: requests.Session, repo: str, branch: str, timeout: int = 60) -> bytes:
    url = f"https://codeload.github.com/{repo}/zip/refs/heads/{branch}"
    try:
        r = session.get(url, timeout=timeout)
        r.raise_for_status()
    except requests.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else "?"
        raise UpdateError(f"GitHub-dan endirilmədi (HTTP {code})") from exc
    except requests.RequestException as exc:
        raise UpdateError(f"GitHub-a qoşulmadı ({exc.__class__.__name__})") from None
    return r.content


def apply_zip(data: bytes, target: Path) -> tuple[int, list[str]]:
    """Arxivdəki */legal-leads-bot/** fayllarını target-ə yazır. Yalnız dəyişən fayllar yazılır.
    Qaytarır: (dəyişən fayl sayı, dəyişən nisbi yollar)."""
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise UpdateError("endirilən fayl zip deyil") from exc
    root = target.resolve()
    seen = 0
    changed: list[str] = []
    for info in zf.infolist():
        parts = PurePosixPath(info.filename).parts
        if info.is_dir() or len(parts) < 3 or parts[1] != SUBDIR:
            continue
        rel = parts[2:]
        if rel[0] in PROTECTED or any(p in ("..", "", ".") or p in PROTECTED for p in rel):
            continue
        dest = target.joinpath(*rel).resolve()
        if root not in dest.parents:
            continue  # zip-slip
        seen += 1
        content = zf.read(info)
        try:
            if dest.exists() and dest.read_bytes() == content:
                continue
        except OSError:
            pass
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_name(dest.name + ".update-tmp")
        tmp.write_bytes(content)
        os.replace(tmp, dest)
        changed.append("/".join(rel))
    if seen == 0:
        raise UpdateError(f"arxivdə {SUBDIR}/ qovluğu tapılmadı")
    return len(changed), changed


def pip_install(root: Path) -> None:
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q", "--disable-pip-version-check", "-r",
         str(root / "requirements.txt")],
        check=True, timeout=900,
    )


def run_update(
    root: Path,
    session: requests.Session | None = None,
    pip: Callable[[Path], None] = pip_install,
    force: bool = False,
) -> UpdateResult:
    repo, branch = repo_and_branch()
    s = session or requests.Session()
    s.headers.setdefault("User-Agent", "legal-leads-bot-updater")
    current = installed_sha(root)
    sha = latest_sha(s, repo, branch)
    if sha and sha == current and not force:
        return UpdateResult(False, sha, message=f"Artıq son versiyadır ({sha[:7]}).")
    data = download_zip(s, repo, branch)
    count, changed = apply_zip(data, root)
    pip_ran = False
    if "requirements.txt" in changed:
        try:
            pip(root)
            pip_ran = True
        except (subprocess.SubprocessError, OSError) as exc:
            log.warning("pip install alınmadı: %s", exc)
    if sha:
        version_file(root).parent.mkdir(parents=True, exist_ok=True)
        version_file(root).write_text(sha, encoding="utf-8")
    if count == 0:
        return UpdateResult(False, sha, 0, pip_ran, f"Fayllar artıq aktualdır ({(sha or '?')[:7]}).")
    return UpdateResult(True, sha, count, pip_ran,
                        f"Yeniləndi: {count} fayl, versiya {(sha or '?')[:7]}." + (" Paketlər quraşdırıldı." if pip_ran else ""))
