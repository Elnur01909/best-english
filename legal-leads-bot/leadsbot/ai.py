"""Claude ilə lid qiymətləndirmə və məktub layihəsi.

Süni intellekt isteğe bağlıdır: ANTHROPIC_API_KEY yoxdursa və ya `anthropic` paketi
quraşdırılmayıbsa, bot açar söz filtri ilə işləməyə davam edir."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass

log = logging.getLogger("leadsbot.ai")

AI_CATEGORIES = ["company", "individual", "job", "tender", "dispute", "other"]
FALLBACK_BETA = "server-side-fallback-2026-07-01"
FALLBACK_MODEL_PREFIXES = ("claude-opus-", "claude-sonnet-", "claude-fable-", "claude-mythos-")
BATCH_SIZE = 20

SCORING_SYSTEM = """You screen leads for an advocate, a member of the Azerbaijani Bar, who is looking for clients abroad.
The target clients are foreign companies, foreign entrepreneurs, foreign nationals and Azerbaijanis living abroad, anywhere in the world, who are looking for a lawyer, need legal help of any kind connected with Azerbaijan, or want to set up a business presence there: register a company (LLC/MMC), open a branch or representative office, form a joint venture, or become a resident of a free economic zone or industrial park. They do not have to ask for a lawyer: saying they want or plan to set up, or asking how, what it costs or which documents are needed, is enough. Foreign companies come first.
The advocate also looks for two other kinds of professional work, in English:
1. Azerbaijani law as the subject: international or foreign research projects on Azerbaijani law or legislation, paid scientific and academic analysis, expert opinions, and explaining Azerbaijani law to foreigners.
2. Online teaching, online training and academic projects on public international law, international human rights law, international humanitarian law, peace law, sovereignty in international law, international economic law, international trade law and the law of sustainable development, including teaching human rights at schools, colleges and universities. This work may be anywhere in the world and needs no link to Azerbaijan, as long as it can be done online or remotely.
Not target clients: Azerbaijani citizens and businesses based in Azerbaijan. If an Azerbaijani does not say where they live and the source is a foreign site such as pravoved.ru, assume they live abroad.
Items may be in English, Russian, Turkish or Azerbaijani, and informal writing without diacritics is common. Decide who is writing from the content: the language of an item must never raise or lower its score by itself.

The work covers all civil and business law: company and branch registration (LLC/MMC), licences and permits, employment contracts and the Labour Code, work permits and residence permits, citizenship and documents, immigration fines, entry bans and deportation, family and inheritance matters, property left in Azerbaijan, civil and commercial disputes, contracts, debts, real estate, tax registration, trademarks and franchising, Alat Free Economic Zone and industrial park setup, energy and infrastructure projects, compliance, arbitration and enforcement. The advocate practises Azerbaijani law only and does not take criminal cases.
The advocate also wants legal job vacancies in Azerbaijan in any language and tenders or consultancy calls for legal experts in Azerbaijan.

For each item, judge how likely it leads to paid legal work for this advocate.
Score 1-10:
- 9-10: a call, vacancy or request for an expert, consultant, researcher or author on Azerbaijani law; a call for an online or remote teacher, lecturer, trainer or course author in one of the fields listed above; a foreign company or entrepreneur writes that it wants or plans to set up in Azerbaijan, or asks how to, including questions on cost, documents, tax registration or permits for doing so; a foreign company or organisation asks for a lawyer, local counsel or legal help with a matter in Azerbaijan; an open legal-consultant tender in Azerbaijan; a legal counsel or lawyer vacancy in Azerbaijan; a named foreign company is entering Azerbaijan now (new office, subsidiary, JV, plant, franchise opening, contract win).
- 7-8: a research project, consortium, fellowship or academic collaboration in those fields open to remote participants; a call for experts or trainers in those fields where the place of work is not stated; a foreign national or an Azerbaijani living abroad asks for a lawyer or legal help with a matter in Azerbaijan; a foreign company or investor describes a concrete legal need connected with Azerbaijan without asking for help; a concrete event that very likely creates legal needs for a named foreign company soon (signed MoU or investment agreement, foreign investor dispute, licence revocation).
- 6: a call for papers, contributions, an edited volume or a conference in those fields; a foreign national or an Azerbaijani living abroad describes a concrete legal problem in Azerbaijan without asking for help.
- 3-5: an on-site post or contract that requires living in another country; weak or indirect signals (general investment talk, government-to-government meetings, new rules with no named party).
- 1-2: courses, degrees, summer schools, certificates, scholarships and internships offered to students rather than seeking teachers or experts; commentary and news with no opportunity in it; anyone who is not a target client, even with a concrete legal problem; matters governed only by another country's law, such as a Russian entry ban or Russian residence; criminal cases; law firms, consultants or agents advertising or explaining their services, because guides and service pages are competitors' marketing and nobody in them needs help; irrelevant items (sports, politics, weather, culture, reports of crimes or court cases where nobody needs a lawyer, matters with no link to Azerbaijan, ads, duplicates).
Use "category" as follows. individual: anyone, person or company, writing about their own plan to set up a business or their own legal problem, whatever the subject, including their own dispute.
company: news about a company where nobody is asking for help. dispute: news about arbitration or litigation between other parties.
job: ordinary employment vacancies at companies or law firms. tender: tenders, consultancy calls, calls for experts, teachers, trainers or researchers, academic projects and calls for papers. other: anything else.
Write "service", "summary_az" and "reason_az" in Azerbaijani (Latin script). "service" names the legal service in a few words. "summary_az" is at most two short sentences on what happened and who is involved. "reason_az" is one short sentence on why the score is what it is. Return one result per input id, using the same id."""

DRAFT_SYSTEM = """You draft first-contact messages for a lawyer practising Azerbaijani law. Write in the language of the lead \
(English, Russian, Turkish or Azerbaijani; use English if unsure), 70-130 words, warm and specific, no hype, no guarantees, no \
invented facts or credentials. \
Reference the concrete situation and the 1-2 legal services that fit it. If the lead is a public forum question, write a \
genuinely helpful public reply that answers the question at a high level and offers further help, not a sales pitch. If it is a \
job vacancy, write a short cover note. If it is a tender, write a short expression-of-interest note. Use placeholders \
[Your Name], [Law Firm] and [Contact] instead of inventing them. Output only the message text."""

SCORE_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "score": {"type": "integer"},
                    "category": {"type": "string", "enum": AI_CATEGORIES},
                    "service": {"type": "string"},
                    "summary_az": {"type": "string"},
                    "reason_az": {"type": "string"},
                },
                "required": ["id", "score", "category", "service", "summary_az", "reason_az"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["items"],
    "additionalProperties": False,
}


class AIError(Exception):
    pass


@dataclass
class LeadScore:
    id: int
    score: int
    category: str
    service: str
    summary_az: str
    reason_az: str


def ai_available() -> bool:
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return False
    return True


class LeadAI:
    def __init__(self, api_key: str, model: str, effort: str = "low", client=None):
        if client is None:
            try:
                import anthropic
            except ImportError as exc:
                raise AIError("`anthropic` paketi quraşdırılmayıb (Python 3.10+ lazımdır): pip install -r requirements.txt") from exc
            client = anthropic.Anthropic(api_key=api_key, timeout=120.0, max_retries=2)
        self.client = client
        self.model = model
        self.effort = effort
        self.use_fallbacks = model.startswith(FALLBACK_MODEL_PREFIXES)

    # ── aşağı səviyyə ──
    def _create(self, **kwargs):
        """Opus/Sonnet/Fable üçün server tərəfli refusal fallback-ı ilə; dəstəklənməsə adi sorğu."""
        try:
            import anthropic
            api_error = anthropic.APIError
            bad_request = anthropic.BadRequestError
        except ImportError:  # testlərdə saxta client
            api_error = bad_request = Exception
        try:
            if self.use_fallbacks:
                try:
                    return self.client.beta.messages.create(betas=[FALLBACK_BETA], fallbacks="default", **kwargs)
                except bad_request as exc:
                    if "fallback" not in str(exc).lower():
                        raise  # məsələn balans bitib: bunun fallback-la əlaqəsi yoxdur
                    log.warning("fallbacks parametri qəbul olunmadı, onsuz davam edirəm: %s", exc)
                    self.use_fallbacks = False
            return self.client.messages.create(**kwargs)
        except api_error as exc:
            raise AIError(f"Claude API xətası: {exc.__class__.__name__}") from exc

    @staticmethod
    def _text(resp) -> str:
        if getattr(resp, "stop_reason", None) == "refusal":
            raise AIError("Claude sorğunu rədd etdi (refusal)")
        if getattr(resp, "stop_reason", None) == "max_tokens":
            raise AIError("cavab max_tokens həddində kəsildi")
        for block in resp.content:
            if getattr(block, "type", None) == "text":
                return block.text
        raise AIError("cavabda mətn yoxdur")

    # ── qiymətləndirmə ──
    def score(self, items: list[dict], negatives: list[str] | None = None) -> dict[int, LeadScore]:
        """items: [{'id', 'source', 'title', 'summary'}] → {id: LeadScore}. BATCH_SIZE-lik hissələrlə.
        Bir hissənin xətası digərlərinin nəticəsini itirmir; heç biri alınmasa AIError atılır."""
        out: dict[int, LeadScore] = {}
        error: AIError | None = None
        for i in range(0, len(items), BATCH_SIZE):
            try:
                out.update(self._score_batch(items[i : i + BATCH_SIZE], negatives or []))
            except AIError as exc:
                log.warning("Claude hissəsi alınmadı: %s", exc)
                error = exc
        if error is not None and not out:
            raise error
        return out

    def _score_batch(self, batch: list[dict], negatives: list[str]) -> dict[int, LeadScore]:
        payload = [
            {"id": int(it["id"]), "source": it.get("source", ""), "title": (it.get("title") or "")[:300],
             "summary": (it.get("summary") or "")[:600]}
            for it in batch
        ]
        user = "Items to screen (JSON):\n" + json.dumps(payload, ensure_ascii=False)
        if negatives:
            user += ("\n\nThe lawyer recently marked these as NOT relevant; score similar items low:\n- "
                     + "\n- ".join(n[:160] for n in negatives[:10]))
        resp = self._create(
            model=self.model,
            max_tokens=16000,
            system=[{"type": "text", "text": SCORING_SYSTEM, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user}],
            output_config={"effort": self.effort, "format": {"type": "json_schema", "schema": SCORE_SCHEMA}},
        )
        try:
            data = json.loads(self._text(resp))
        except json.JSONDecodeError as exc:
            raise AIError(f"JSON oxunmadı: {exc}") from exc
        wanted = {p["id"] for p in payload}
        out: dict[int, LeadScore] = {}
        for r in data.get("items", []):
            try:
                rid = int(r["id"])
            except (KeyError, TypeError, ValueError):
                continue
            if rid not in wanted:
                continue
            cat = r.get("category") if r.get("category") in AI_CATEGORIES else "other"
            out[rid] = LeadScore(
                id=rid, score=max(1, min(10, int(r.get("score", 1)))), category=cat,
                service=str(r.get("service", "")).strip(), summary_az=str(r.get("summary_az", "")).strip(),
                reason_az=str(r.get("reason_az", "")).strip(),
            )
        return out

    # ── məktub ──
    def draft(self, lead: dict) -> str:
        info = {k: lead.get(k) for k in ("category", "title", "summary", "origin", "link", "service") if lead.get(k)}
        resp = self._create(
            model=self.model,
            max_tokens=16000,
            system=DRAFT_SYSTEM,
            messages=[{"role": "user", "content": "Lead (JSON):\n" + json.dumps(info, ensure_ascii=False)}],
            output_config={"effort": self.effort},
        )
        return self._text(resp).strip()


TEMPLATES = {
    "individual": (
        "Hi, I saw your question about {topic}. I am an Azerbaijani lawyer working in English, and I regularly help "
        "foreigners with residence and work permits, registration and dealings with the State Migration Service. "
        "In short, the rules depend on your status and the reason for your stay, so it is worth checking the details "
        "before any deadline passes. Happy to answer follow-up questions here, or you can reach me at [Contact].\n\n"
        "[Your Name], [Law Firm]"
    ),
    "job": (
        "Dear Hiring Manager,\n\nI am writing regarding the {topic} position. I am an Azerbaijani-qualified lawyer "
        "working in English and Azerbaijani, with experience in corporate, contract and employment matters under "
        "Azerbaijani law. I would welcome the chance to discuss how I can support your team.\n\n"
        "Kind regards,\n[Your Name]\n[Contact]"
    ),
    "tender": (
        "Dear Procurement Team,\n\nI would like to express interest in \"{topic}\". I am an Azerbaijani-qualified "
        "lawyer working in English, with experience in legal review and drafting under Azerbaijani law. I would be "
        "glad to receive the full terms of reference and submit a proposal.\n\nKind regards,\n[Your Name], [Law Firm]\n[Contact]"
    ),
    "default": (
        "Dear team,\n\nCongratulations on your recent news: \"{topic}\". As you set up operations in Azerbaijan, "
        "I can help in English with company or branch registration, employment contracts and work permits, leases, "
        "licences and tax registration under Azerbaijani law. Would a short call next week be useful?\n\n"
        "Kind regards,\n[Your Name], [Law Firm]\n[Contact]"
    ),
}


def template_draft(category: str | None, title: str) -> str:
    topic = (title or "your announcement").strip()[:120]
    return TEMPLATES.get(category or "", TEMPLATES["default"]).format(topic=topic)


def make_ai(settings) -> "LeadAI | None":
    """ANTHROPIC_API_KEY varsa və paket quraşdırılıbsa LeadAI, əks halda None."""
    if not settings.ai_enabled:
        return None
    if not ai_available():
        log.warning("ANTHROPIC_API_KEY var, amma `anthropic` paketi yoxdur (Python 3.10+ lazımdır). Claude söndürüldü.")
        return None
    return LeadAI(settings.anthropic_api_key, settings.ai_model, settings.ai_effort)
