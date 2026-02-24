"""
Discovery Engine: Success Pattern Mining for Career Trajectories.

This module fetches “success profiles” for a target role/company using the
Proxycurl Search API, extracts the step immediately before the target role
("Golden Step"), and analyzes gaps between a user's CV and those patterns.

Key entry points:
  - fetch_career_patterns(target_role, target_company, use_mock=False)
  - analyze_trajectory_gap(user_cv_text, success_pattern)

The module is written to be production-ready but intentionally conservative:
  - It uses a small SQLite cache to avoid repeated Proxycurl calls.
  - It supports a mock mode that loads profiles from mock_profiles.json.
  - It logs estimated credit usage for each Proxycurl search.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv
from pydantic import BaseModel, Field

try:
    import openai
except ImportError:  # pragma: no cover - optional dependency
    openai = None  # type: ignore


# ---------------------------------------------------------------------------
# Environment & configuration
# ---------------------------------------------------------------------------

load_dotenv()

PROXYCURL_API_KEY = os.getenv("PROXYCURL_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if OPENAI_API_KEY and openai is not None:
    openai.api_key = OPENAI_API_KEY

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_PATH = os.path.join(BASE_DIR, "discovery_cache.sqlite3")
MOCK_PROFILES_PATH = os.path.join(BASE_DIR, "mock_profiles.json")

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(name)s: %(message)s",
)
logger = logging.getLogger("discovery_engine")


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


class ExperienceEntry(BaseModel):
    title: str
    company: str
    start_date: Optional[str] = None  # ISO string if available
    end_date: Optional[str] = None
    description: Optional[str] = None


class SuccessProfile(BaseModel):
    full_name: str
    current_occupation: str
    experience_history: List[ExperienceEntry]
    skills: List[str]
    education: List[str]


class SuccessPattern(BaseModel):
    common_previous_roles: List[str]
    top_skills_delta: List[str]
    avg_tenure_in_previous_step: float
    impact_keyword_density: float


# ---------------------------------------------------------------------------
# Caching layer (SQLite)
# ---------------------------------------------------------------------------


@dataclass
class PatternCache:
    path: str = CACHE_PATH

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS career_patterns (
                company TEXT NOT NULL,
                role TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at REAL NOT NULL,
                PRIMARY KEY (company, role)
            )
            """
        )
        return conn

    def get(self, company: str, role: str) -> Optional[List[Dict]]:
        conn = self._conn()
        try:
            cur = conn.execute(
                "SELECT data FROM career_patterns WHERE company = ? AND role = ?",
                (company, role),
            )
            row = cur.fetchone()
            if not row:
                return None
            data = json.loads(row[0])
            return data
        finally:
            conn.close()

    def set(self, company: str, role: str, profiles: List[SuccessProfile]) -> None:
        payload = [p.model_dump() for p in profiles]
        conn = self._conn()
        try:
            conn.execute(
                "REPLACE INTO career_patterns (company, role, data, created_at) "
                "VALUES (?, ?, ?, ?)",
                (company, role, json.dumps(payload), time.time()),
            )
            conn.commit()
        finally:
            conn.close()


cache = PatternCache()


# ---------------------------------------------------------------------------
# Proxycurl integration
# ---------------------------------------------------------------------------


def _estimate_proxycurl_cost(num_results: int) -> float:
    """
    Proxycurl Search API costs 2–3 credits per result.
    We log a simple midpoint estimate of 2.5 credits / result.
    """
    return num_results * 2.5


def _proxycurl_person_search(
    target_role: str, target_company: str, page_size: int = 25
) -> List[Dict]:
    """
    Call Proxycurl Person Search API for people in (or having been in)
    a given role at a given company.

    NOTE: Endpoint and parameters are based on Proxycurl docs and may need
    adjustment depending on your account configuration.
    """
    if not PROXYCURL_API_KEY:
        raise RuntimeError("PROXYCURL_API_KEY is not set in the environment.")

    url = "https://nubela.co/proxycurl/api/v2/search/person/"

    params = {
        "enrich_profiles": "enrich",
        # These parameters mirror the examples in Proxycurl docs.
        "current_role_title": target_role,
        "current_company_name": target_company,
        "page_size": str(page_size),
    }

    headers = {"Authorization": f"Bearer {PROXYCURL_API_KEY}"}

    logger.info("Calling Proxycurl Person Search for %s @ %s", target_role, target_company)
    resp = requests.get(url, headers=headers, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    # Response format: list of enriched person profiles
    results: List[Dict] = data if isinstance(data, list) else data.get("results", [])
    logger.info(
        "Proxycurl returned %d results (≈ %.1f credits)",
        len(results),
        _estimate_proxycurl_cost(len(results)),
    )
    return results


def _suggest_peer_companies(target_role: str, target_company: str) -> List[str]:
    """
    Use an LLM to suggest peer companies if Proxycurl results are sparse.
    """
    if not (OPENAI_API_KEY and openai is not None):
        logger.warning("OPENAI_API_KEY not set; skipping peer company suggestion.")
        return []

    prompt = (
        "You are a career intelligence assistant.\n"
        f"Given the target role '{target_role}' at company '{target_company}', "
        "suggest 3 peer companies of similar size, prestige, and industry.\n"
        "Return ONLY a comma-separated list of company names, no extra text."
    )

    try:
        client = openai
        completion = client.ChatCompletion.create(  # type: ignore[attr-defined]
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        content = completion.choices[0].message["content"]  # type: ignore[index]
    except Exception as e:  # pragma: no cover - best effort
        logger.warning("OpenAI peer company suggestion failed: %s", e)
        return []

    if not content:
        return []
    peers = [c.strip() for c in content.split(",") if c.strip()]
    logger.info("Peer companies suggested by LLM: %s", peers)
    return peers[:3]


def _map_proxycurl_profile(raw: Dict) -> SuccessProfile:
    """
    Map a Proxycurl person profile into our SuccessProfile schema.
    This function is defensive and will work with partially-enriched data.
    """
    full_name = raw.get("full_name") or raw.get("name") or "Unknown"
    headline = raw.get("headline") or ""

    experiences_raw = raw.get("experiences") or raw.get("employment") or []
    experience_history: List[ExperienceEntry] = []
    for exp in experiences_raw:
        title = exp.get("title") or exp.get("role") or ""
        company = (
            (exp.get("company") or {}).get("name")
            if isinstance(exp.get("company"), dict)
            else exp.get("company") or ""
        )
        if not title and not company:
            continue
        experience_history.append(
            ExperienceEntry(
                title=title,
                company=company,
                start_date=exp.get("start_date") or exp.get("starts_at"),
                end_date=exp.get("end_date") or exp.get("ends_at"),
                description=exp.get("description") or exp.get("summary"),
            )
        )

    skills_raw = raw.get("skills") or []
    if isinstance(skills_raw, str):
        skills = [s.strip() for s in skills_raw.split(",") if s.strip()]
    else:
        skills = [str(s).strip() for s in skills_raw if str(s).strip()]

    education_raw = raw.get("education") or []
    education: List[str] = []
    for ed in education_raw:
        if isinstance(ed, dict):
            name = ed.get("school") or ed.get("school_name") or ed.get("degree") or ""
        else:
            name = str(ed)
        if name:
            education.append(name)

    current_occupation = headline or (
        experience_history[0].title if experience_history else "Unknown"
    )

    return SuccessProfile(
        full_name=full_name,
        current_occupation=current_occupation,
        experience_history=experience_history,
        skills=skills,
        education=education,
    )


# ---------------------------------------------------------------------------
# Golden step & pattern extraction
# ---------------------------------------------------------------------------


def _find_golden_step(
    profile: SuccessProfile, target_role: str, target_company: str
) -> Optional[ExperienceEntry]:
    """
    Golden Step = role held immediately before the target role at the target company.
    We do a simple scan through experience_history in chronological order,
    matching by fuzzy substring on role and company.
    """
    if not profile.experience_history:
        return None

    exps = profile.experience_history

    # We assume the list is ordered from most recent to oldest. Reverse for chronology.
    for i in range(len(exps) - 1):
        current = exps[i]
        prev = exps[i + 1]
        role_match = target_role.lower() in current.title.lower()
        company_match = target_company.lower() in current.company.lower()
        if role_match and company_match:
            return prev

    return None


def _tenure_in_years(exp: ExperienceEntry) -> Optional[float]:
    """
    Best-effort tenure estimation given ISO-like dates (YYYY-MM or YYYY-MM-DD).
    If dates are missing or malformed, returns None.
    """
    from datetime import datetime

    if not exp.start_date:
        return None

    try:
        start = datetime.fromisoformat(exp.start_date)
    except Exception:  # pragma: no cover - defensive
        return None

    if exp.end_date:
        try:
            end = datetime.fromisoformat(exp.end_date)
        except Exception:
            end = datetime.utcnow()
    else:
        end = datetime.utcnow()

    delta_years = (end - start).days / 365.25
    return max(delta_years, 0.0)


def _compute_impact_density(text: str) -> float:
    """
    Very simple “impact keyword density”:
    fraction of tokens that contain a digit, %, or $.
    """
    if not text:
        return 0.0
    tokens = [t for t in text.replace("\n", " ").split(" ") if t]
    if not tokens:
        return 0.0
    impactful = [
        t
        for t in tokens
        if any(ch.isdigit() for ch in t) or "%" in t or "$" in t
    ]
    return len(impactful) / len(tokens)


def _derive_success_pattern(
    profiles: List[SuccessProfile], target_role: str, target_company: str
) -> SuccessPattern:
    golden_roles: List[str] = []
    tenures: List[float] = []
    impact_scores: List[float] = []
    all_skills: List[str] = []

    for p in profiles:
        all_skills.extend(p.skills)
        golden = _find_golden_step(p, target_role, target_company)
        if not golden:
            continue
        golden_roles.append(golden.title)
        tenure = _tenure_in_years(golden)
        if tenure is not None:
            tenures.append(tenure)
        impact_scores.append(_compute_impact_density(golden.description or ""))

    # Common previous roles by frequency
    from collections import Counter

    role_counts = Counter(golden_roles)
    common_previous_roles = [r for r, _ in role_counts.most_common(5)]

    skill_counts = Counter([s.lower() for s in all_skills if s])
    top_skills = [s for s, _ in skill_counts.most_common(20)]

    avg_tenure = sum(tenures) / len(tenures) if tenures else 0.0
    avg_impact = sum(impact_scores) / len(impact_scores) if impact_scores else 0.0

    return SuccessPattern(
        common_previous_roles=common_previous_roles,
        top_skills_delta=top_skills,
        avg_tenure_in_previous_step=avg_tenure,
        impact_keyword_density=avg_impact,
    )


# ---------------------------------------------------------------------------
# Public API: fetch_career_patterns
# ---------------------------------------------------------------------------


def _load_mock_profiles() -> List[SuccessProfile]:
    if not os.path.exists(MOCK_PROFILES_PATH):
        raise FileNotFoundError(f"mock_profiles.json not found at {MOCK_PROFILES_PATH}")
    with open(MOCK_PROFILES_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return [SuccessProfile.model_validate(p) for p in raw]


def fetch_career_patterns(
    target_role: str,
    target_company: str,
    use_mock: bool = False,
) -> Tuple[List[SuccessProfile], SuccessPattern]:
    """
    Main entry point.

    1. Check local cache for (company, role).
    2. If use_mock, load mock_profiles.json.
    3. Otherwise, call Proxycurl Person Search.
       - If < 5 results, ask an LLM for 3 peer companies and search those too.
    4. Map all results into SuccessProfile objects and derive a SuccessPattern.
    """
    target_role = target_role.strip()
    target_company = target_company.strip()

    # Cache
    cached = cache.get(target_company, target_role)
    if cached and not use_mock:
        logger.info("Loaded %d cached success profiles for %s @ %s", len(cached), target_role, target_company)
        profiles = [SuccessProfile.model_validate(p) for p in cached]
        pattern = _derive_success_pattern(profiles, target_role, target_company)
        return profiles, pattern

    if use_mock:
        profiles = _load_mock_profiles()
        pattern = _derive_success_pattern(profiles, target_role, target_company)
        return profiles, pattern

    # Live Proxycurl path
    raw_results = _proxycurl_person_search(target_role, target_company)

    # Fallback: peer companies if we have too few matches
    if len(raw_results) < 5:
        peers = _suggest_peer_companies(target_role, target_company)
        for peer in peers:
            more = _proxycurl_person_search(target_role, peer)
            raw_results.extend(more)

    profiles = [_map_proxycurl_profile(r) for r in raw_results]
    if not profiles:
        logger.warning("No profiles found for %s @ %s", target_role, target_company)

    cache.set(target_company, target_role, profiles)
    pattern = _derive_success_pattern(profiles, target_role, target_company)
    return profiles, pattern


# ---------------------------------------------------------------------------
# Intelligence Layer: analyze_trajectory_gap
# ---------------------------------------------------------------------------


TECH_KEYWORDS = {
    "python",
    "r",
    "sql",
    "excel",
    "power bi",
    "tableau",
    "javascript",
    "react",
    "java",
    "c++",
    "c#",
    "aws",
    "azure",
    "gcp",
    "spark",
    "hadoop",
}

SOFT_KEYWORDS = {
    "leadership",
    "communication",
    "teamwork",
    "stakeholder management",
    "problem solving",
    "analytical thinking",
    "collaboration",
    "presentation",
    "mentoring",
    "client management",
}


def analyze_trajectory_gap(
    user_cv_text: str,
    success_pattern: SuccessPattern,
) -> Dict[str, object]:
    """
    Compare the user's CV text to the success pattern.

    Returns a dict with:
      - missing_golden_step_roles: which common previous roles are not mentioned
      - impact_gap_ratio: user's impact density vs success pattern
      - skill_gap: {technical: [...], soft: [...]}
    """
    text_lower = user_cv_text.lower()

    # Role / trajectory gap
    missing_roles = [
        r for r in success_pattern.common_previous_roles if r.lower() not in text_lower
    ]

    # Impact density on user CV
    user_impact_density = _compute_impact_density(user_cv_text)
    impact_gap_ratio = (
        user_impact_density / success_pattern.impact_keyword_density
        if success_pattern.impact_keyword_density > 0
        else 1.0
    )

    # Skill gap: skills in success pattern but not obviously present in CV
    pattern_skills = [s.lower() for s in success_pattern.top_skills_delta]
    missing_skills = [s for s in pattern_skills if s and s not in text_lower]

    technical_gap: List[str] = []
    soft_gap: List[str] = []
    for s in missing_skills:
        if any(k in s for k in TECH_KEYWORDS):
            technical_gap.append(s)
        elif any(k in s for k in SOFT_KEYWORDS):
            soft_gap.append(s)

    # Fallback: if classification missed, just take the remainder as technical
    if not technical_gap:
        technical_gap = missing_skills[:5]

    return {
        "missing_golden_step_roles": missing_roles,
        "impact_gap_ratio": impact_gap_ratio,
        "skill_gap": {
            "technical": technical_gap[:5],
            "soft": soft_gap[:5],
        },
        "success_pattern_snapshot": success_pattern.model_dump(),
    }


__all__ = [
    "SuccessProfile",
    "SuccessPattern",
    "fetch_career_patterns",
    "analyze_trajectory_gap",
]

