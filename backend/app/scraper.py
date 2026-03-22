import feedparser
import httpx
import re
from datetime import datetime, timezone, timedelta

AI_KEYWORDS = {
    "learn": [
        "artificial intelligence", "machine learning", "deep learning", "neural network",
        "large language model", "llm", "transformer", "diffusion", "reinforcement learning",
        "gpt", "claude", "gemini", "llama", "mistral", "arxiv", "research", "paper",
        "benchmark", "dataset", "training", "fine-tuning", "rlhf", "attention",
        "multimodal", "vision", "speech", "robotics", "open source", "hugging face",
        "pytorch", "tensorflow", "jax", "model", "inference", "embedding", "agent",
        "reasoning", "alignment", "safety", "capability",
    ],
    "invest": [
        "artificial intelligence", "ai", "machine learning", "funding", "raises",
        "acquisition", "acquires", "merger", "ipo", "valuation", "investment",
        "venture capital", "series", "round", "billion", "million", "revenue",
        "partnership", "deal", "launch", "release", "nvidia", "openai", "anthropic",
        "google", "microsoft", "meta", "amazon", "apple", "infrastructure", "data center",
        "chip", "semiconductor", "gpu", "cloud", "enterprise", "startup", "market cap",
        "earnings", "forecast", "growth", "profit", "contract", "deploy",
    ],
}


def _is_relevant(text: str, report_type: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in AI_KEYWORDS.get(report_type, AI_KEYWORDS["learn"]))


def _clean_html(text: str) -> str:
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:2000]


def _parse_date(entry) -> str:
    try:
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            return dt.isoformat()
    except Exception:
        pass
    return datetime.now(timezone.utc).isoformat()


def _dedupe(articles: list[dict]) -> list[dict]:
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    unique = []
    for a in articles:
        url_key = a.get("url", "").split("?")[0].rstrip("/")
        title_key = re.sub(r"[^a-z0-9]", "", a.get("title", "").lower())[:60]
        if url_key in seen_urls or title_key in seen_titles:
            continue
        seen_urls.add(url_key)
        if title_key:
            seen_titles.add(title_key)
        unique.append(a)
    return unique


def fetch_feed(url: str, report_type: str, max_items: int = 10) -> list[dict]:
    articles = []
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; AIUpdateBot/1.0; +personal)"}
        resp = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
        feed = feedparser.parse(resp.text)
        for entry in feed.entries[:max_items]:
            title = _clean_html(getattr(entry, "title", ""))
            summary = _clean_html(
                getattr(entry, "summary", "") or getattr(entry, "description", "")
            )
            link = getattr(entry, "link", "")
            if not title or not link:
                continue
            if not _is_relevant(f"{title} {summary}", report_type):
                continue
            articles.append({
                "title": title,
                "url": link,
                "summary": summary,
                "published": _parse_date(entry),
                "source_url": url,
            })
    except Exception as e:
        print(f"[scraper] Feed error {url}: {e}")
    return articles


def scrape_all(sources: list[dict], report_type: str) -> list[dict]:
    applicable = [
        s for s in sources
        if s.get("active") and s.get("type") in (report_type, "both")
    ]

    all_articles: list[dict] = []
    for source in applicable:
        all_articles.extend(fetch_feed(source["url"], report_type, max_items=8))

    cutoff = (datetime.now(timezone.utc) - timedelta(hours=72)).isoformat()
    fresh = [a for a in all_articles if a.get("published", "") >= cutoff]
    older = [a for a in all_articles if a.get("published", "") < cutoff]

    fresh.sort(key=lambda a: a.get("published", ""), reverse=True)
    older.sort(key=lambda a: a.get("published", ""), reverse=True)

    deduped = _dedupe(fresh + older)
    return deduped[:60]


def format_articles_for_prompt(articles: list[dict]) -> str:
    if not articles:
        return "No articles available."
    lines = []
    for i, a in enumerate(articles[:25], 1):
        lines.append(f"[{i}] {a['title']}")
        lines.append(f"    URL: {a['url']}")
        if a.get("summary"):
            lines.append(f"    Summary: {a['summary'][:500]}")
        lines.append(f"    Published: {a.get('published', 'unknown')}")
        lines.append("")
    return "\n".join(lines)
