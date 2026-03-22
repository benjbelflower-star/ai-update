import json
import os
import anthropic
from datetime import datetime, timezone

from .charts import generate_chart

# ── Prompts ────────────────────────────────────────────────────────────────────
# IMPORTANT: Use str.replace("{articles}", text) — NOT str.format().
# Article content contains curly braces that break format strings.

LEARN_PROMPT = """You are AI Update — a sharp, curious editorial voice turning today's AI news into a 5-minute read that makes people genuinely smarter.

Write a Learn Edition with EXACTLY 4 sections. Select stories with real educational value. No press releases, no fluff.

VOICE: Curious professor meets sharp journalist. Clear, engaging, occasionally witty — think "brilliant friend who follows AI obsessively." Clever analogies and light humor welcome when they fit naturally. Never try-hard.

RULES:
- Write EXACTLY 4 sections — no more, no less
- If followed stories (listed below) have new developments in today's articles, they each occupy one of the 4 slots
- If a followed story has NO new developments, list its headline in "no_developments" only — it does NOT count toward the 4 sections
- PRIORITIZE the most recent articles — recency is the #1 selection criterion
- AVOID topics already covered in recent reports (listed below)
- Each section needs a KEY INSIGHT — the one sentence readers should remember
- Wit is optional — null is fine if nothing fits naturally
- Sources must only reference URLs from the provided articles

CHARTS — HIGH PRIORITY: Scan every article for numerical data: benchmark scores, model sizes, performance metrics (% improvement), dataset statistics, compute costs, training times, comparison tables. Create a chart_request for EVERY section where meaningful numbers appear. Target 2-3 charts per report — they are the most valuable visual element. Only skip if there is genuinely no numerical data in that section.

{recent_context}

Return ONLY valid JSON — no markdown fences, no explanation. Just the JSON object.

SCHEMA:
{
  "title": "catchy edition title",
  "tagline": "one witty sentence summarizing this edition",
  "sections": [
    {
      "id": "s1",
      "headline": "clear, engaging headline",
      "body": "2-3 paragraphs. Informative and readable. Plain text, no markdown.",
      "key_insight": "One sentence. The core takeaway.",
      "wit": "One clever/funny observation, or null",
      "chart_request": {
        "type": "bar | line | pie",
        "title": "descriptive chart title",
        "x_label": "x axis label",
        "y_label": "y axis label",
        "data": {"labels": ["A","B","C"], "values": [10,20,30]}
      },
      "sources": [{"title": "exact article title", "url": "exact url from articles"}],
      "tags": ["LLM","Research","OpenSource"]
    }
  ],
  "no_developments": ["Followed story headline with no new info"],
  "quick_stats": [{"label": "stat label", "value": "42", "icon": ""}]
}

ARTICLES:
{articles}
"""

INVEST_PROMPT = """You are AI Update — a sharp financial intelligence analyst covering the AI industry. Write a 5-minute Invest Edition with EXACTLY 4 sections. Focus on market-moving stories: funding rounds, M&A, infrastructure plays, company strategy, earnings, executive changes, major product launches.

VOICE: Hedge fund analyst with a personality. Sharp takes, dry wit, relentless focus on what the numbers mean. Think: "I actually have a sense of humor but the p&l is not joking." No hype, no filler.

RULES:
- Write EXACTLY 4 sections — no more, no less
- If followed stories (listed below) have new developments in today's articles, they each occupy one of the 4 slots
- If a followed story has NO new developments, list its headline in "no_developments" only — it does NOT count toward the 4 sections
- PRIORITIZE the most recent articles — recency is the #1 selection criterion
- AVOID topics already covered in recent reports (listed below)
- Include dollar amounts, percentages, and company names prominently
- Flag notable risks, contradictions, or second-order implications
- Wit is optional — null is fine if the story doesn't invite it
- Sources must only reference URLs from the provided articles

CHARTS — HIGH PRIORITY: Scan every article for numerical data: funding amounts ($Xm raised), valuations, revenue figures, market share percentages, stock performance, headcount, infrastructure capacity, cost comparisons. Create a chart_request for EVERY section where meaningful numbers appear. Target 2-3 charts per report. Only skip if there is genuinely no numerical data in that section.

{recent_context}

Return ONLY valid JSON — no markdown fences, no explanation. Just the JSON object.

SCHEMA:
{
  "title": "catchy edition title",
  "tagline": "one witty sentence summarizing this edition",
  "sections": [
    {
      "id": "s1",
      "headline": "clear, engaging headline",
      "body": "2-3 paragraphs. Informative and readable. Plain text, no markdown.",
      "key_insight": "One sentence. The core takeaway.",
      "wit": "One dry/clever observation, or null",
      "chart_request": {
        "type": "bar | line | pie",
        "title": "descriptive chart title",
        "x_label": "x axis label",
        "y_label": "y axis label",
        "data": {"labels": ["A","B","C"], "values": [10,20,30]}
      },
      "sources": [{"title": "exact article title", "url": "exact url from articles"}],
      "tags": ["Funding","M&A","Infrastructure"]
    }
  ],
  "no_developments": ["Followed story headline with no new info"],
  "quick_stats": [{"label": "stat label", "value": "$4.2B", "icon": ""}]
}

ARTICLES:
{articles}
"""


# ── Client ─────────────────────────────────────────────────────────────────────

def _get_client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set")
    return anthropic.Anthropic(api_key=api_key, max_retries=4)


# ── Context injection ──────────────────────────────────────────────────────────

def _get_recent_context(report_type: str) -> str:
    from .database import db
    try:
        with db() as conn:
            recent_rows = conn.execute(
                "SELECT r.title, r.tags, f.vote "
                "FROM reports r LEFT JOIN feedback f ON f.report_id = r.id "
                "WHERE r.type = ? ORDER BY r.generated_at DESC LIMIT 10",
                (report_type,)
            ).fetchall()

            followed_rows = conn.execute(
                "SELECT fs.headline, fs.tags "
                "FROM followed_stories fs "
                "JOIN reports r ON r.id = fs.report_id "
                "WHERE fs.active = 1 AND r.type = ? "
                "ORDER BY fs.created_at DESC",
                (report_type,)
            ).fetchall()

        if not recent_rows and not followed_rows:
            return ""

        parts = []

        if recent_rows:
            lines = ["Recent reports already published (avoid repeating these topics):"]
            liked, disliked = [], []
            for row in recent_rows:
                tags = json.loads(row["tags"] or "[]")
                tag_str = f" [{', '.join(tags[:5])}]" if tags else ""
                lines.append(f"- {row['title']}{tag_str}")
                if row["vote"] == 1:
                    liked.append(f"- {row['title']}{tag_str}")
                elif row["vote"] == -1:
                    disliked.append(f"- {row['title']}{tag_str}")
            parts.append("\n".join(lines))
            if liked:
                parts.append("Reader-liked topics (prioritize similar depth and angles):\n" + "\n".join(liked))
            if disliked:
                parts.append("Reader-disliked topics (avoid similar content):\n" + "\n".join(disliked))

        if followed_rows:
            flines = [
                "Followed stories (reader wants updates — check today's articles for NEW developments on each):"
            ]
            for row in followed_rows:
                tags = json.loads(row["tags"] or "[]")
                tag_str = f" [{', '.join(tags[:4])}]" if tags else ""
                flines.append(f"- {row['headline']}{tag_str}")
            flines.append(
                "For each followed story: if new developments appear in today's articles, "
                "prioritize covering them in one of the 4 sections. "
                "If nothing new is found, add the headline to no_developments."
            )
            parts.append("\n".join(flines))

        return "\n\n".join(parts)

    except Exception as e:
        print(f"[generator] Context fetch error: {e}")
        return ""


# ── Core generation ────────────────────────────────────────────────────────────

def _strip_fences(raw: str) -> str:
    """Remove markdown code fences Claude sometimes wraps around JSON."""
    if "```" not in raw:
        return raw
    start = raw.find("```")
    end   = raw.rfind("```")
    if start == end:
        # Missing closing fence — truncated response; take everything after opener
        raw = raw[start + 3:].strip()
    else:
        raw = raw[start + 3:end].strip()
    if raw.startswith("json"):
        raw = raw[4:].strip()
    return raw


def generate_report(articles_text: str, report_type: str, recent_context: str = "") -> dict | None:
    template = LEARN_PROMPT if report_type == "learn" else INVEST_PROMPT

    # CRITICAL: use str.replace — article text contains curly braces
    prompt = template.replace("{articles}", articles_text).replace("{recent_context}", recent_context)

    client = _get_client()
    raw = ""
    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        raw = _strip_fences(raw)

        data = json.loads(raw)
        if not isinstance(data, dict):
            print(f"[generator] Unexpected response type: {type(data)}")
            return None
        return data

    except json.JSONDecodeError as e:
        print(f"[generator] JSON parse error: {e}")
        print(f"[generator] Raw (first 400): {repr(raw[:400])}")
        return None
    except anthropic.APIError as e:
        print(f"[generator] Anthropic API error: {e}")
        return None
    except Exception as e:
        print(f"[generator] Unexpected error ({type(e).__name__}): {e}")
        return None


def build_report(report_type: str, articles: list[dict], sources: list[dict]) -> dict | None:
    from .scraper import format_articles_for_prompt

    if len(articles) < 3:
        print(f"[generator] Too few articles for {report_type}: {len(articles)}")
        return None

    articles_text   = format_articles_for_prompt(articles)
    recent_context  = _get_recent_context(report_type)
    raw_report      = generate_report(articles_text, report_type, recent_context)

    if not raw_report:
        return None

    # Generate charts for sections that requested them
    sections = raw_report.get("sections", [])
    for section in sections:
        chart_req = section.pop("chart_request", None)
        if chart_req and isinstance(chart_req, dict):
            chart_filename = generate_chart(chart_req, report_type)
            section["chart_id"] = chart_filename
        else:
            section["chart_id"] = None

    # Collect unique tags and sources
    all_tags: set[str] = set()
    sources_used: list[dict] = []
    seen_urls: set[str] = set()
    for section in sections:
        all_tags.update(section.get("tags", []))
        for src in section.get("sources", []):
            if src.get("url") not in seen_urls:
                seen_urls.add(src.get("url", ""))
                sources_used.append(src)

    return {
        "type":         report_type,
        "title":        raw_report.get("title", f"AI Update — {report_type.title()} Edition"),
        "tagline":      raw_report.get("tagline", ""),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "content": {
            "title":           raw_report.get("title", ""),
            "tagline":         raw_report.get("tagline", ""),
            "sections":        sections,
            "quick_stats":     raw_report.get("quick_stats", []),
            "no_developments": raw_report.get("no_developments", []),
        },
        "tags":         sorted(all_tags),
        "sources_used": sources_used,
    }
