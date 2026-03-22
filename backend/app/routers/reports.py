import json
import os
import re
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

from ..database import db, AUDIO_DIR
from ..models import ReportOut, ReportSummary, ReportContent, SearchResult

router = APIRouter(prefix="/reports", tags=["reports"])

# ── Stop words for phrase generation ──────────────────────────────────────────
_STOPS = {
    "a","an","the","is","are","was","were","be","been","being","have","has","had",
    "do","does","did","will","would","could","should","may","might","shall","can",
    "to","of","in","for","on","with","at","by","from","as","into","through","over",
    "and","or","but","if","while","about","against","between","its","it","this",
    "that","these","those","not","no","nor","new","get","use","how","why","what",
    "who","when","where","just","now","then","here","there","so","up","out","go",
    "him","her","his","our","your","their","we","they","i","you","he","she","says",
    "said","after","before","more","than","too","via","vs","among","ai","update",
}


def _generate_phrase(headline: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+(?:'[A-Za-z]+)?", headline)
    significant = [w for w in words if w.lower() not in _STOPS and len(w) > 2]
    chosen = significant[:3]
    phrase = " ".join(w.title() if w.islower() else w for w in chosen)
    return phrase or headline[:24]


# ── Serialisers ────────────────────────────────────────────────────────────────

def _row_to_summary(row) -> ReportSummary:
    return ReportSummary(
        id=row["id"],
        type=row["type"],
        title=row["title"],
        tagline=row["tagline"],
        generated_at=row["generated_at"],
        tags=json.loads(row["tags"] or "[]"),
    )


def _row_to_full(row) -> ReportOut:
    return ReportOut(
        id=row["id"],
        type=row["type"],
        title=row["title"],
        tagline=row["tagline"],
        generated_at=row["generated_at"],
        content=ReportContent(**json.loads(row["content"])),
        tags=json.loads(row["tags"] or "[]"),
    )


# ── Request models ─────────────────────────────────────────────────────────────

class FeedbackIn(BaseModel):
    vote: int  # 1 or -1

class FollowIn(BaseModel):
    headline: str
    tags: list[str] = []


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/generate")
def trigger_generation(background_tasks: BackgroundTasks):
    from ..scheduler import run_generation_cycle
    background_tasks.add_task(run_generation_cycle)
    return {"status": "generation started"}


@router.get("", response_model=list[ReportSummary])
def list_reports(
    type: Optional[str] = Query(None, pattern="^(learn|invest)$"),
    sort: Optional[str] = Query("desc", pattern="^(asc|desc)$"),
    tag:  Optional[str] = None,
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0,  ge=0),
):
    clauses: list[str] = []
    params:  list      = []

    if type:
        clauses.append("type = ?")
        params.append(type)
    if tag:
        clauses.append("tags LIKE ?")
        params.append(f'%"{tag}"%')

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    order = "ASC" if sort == "asc" else "DESC"
    params += [limit, offset]

    with db() as conn:
        rows = conn.execute(
            f"SELECT id, type, title, tagline, generated_at, tags "
            f"FROM reports {where} ORDER BY generated_at {order} LIMIT ? OFFSET ?",
            params,
        ).fetchall()

    return [_row_to_summary(r) for r in rows]


@router.get("/latest")
def get_latest():
    with db() as conn:
        learn  = conn.execute(
            "SELECT id,type,title,tagline,generated_at,tags FROM reports "
            "WHERE type='learn' ORDER BY generated_at DESC LIMIT 1"
        ).fetchone()
        invest = conn.execute(
            "SELECT id,type,title,tagline,generated_at,tags FROM reports "
            "WHERE type='invest' ORDER BY generated_at DESC LIMIT 1"
        ).fetchone()
    return {
        "learn":  _row_to_summary(learn)  if learn  else None,
        "invest": _row_to_summary(invest) if invest else None,
    }


@router.get("/following")
def list_following():
    with db() as conn:
        rows = conn.execute(
            "SELECT id, headline, phrase, tags, created_at "
            "FROM followed_stories WHERE active = 1 ORDER BY created_at DESC"
        ).fetchall()
    return [
        {
            "id":         row["id"],
            "phrase":     row["phrase"] or _generate_phrase(row["headline"]),
            "headline":   row["headline"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


@router.delete("/following/{follow_id}")
def delete_following(follow_id: int):
    with db() as conn:
        conn.execute("DELETE FROM followed_stories WHERE id = ?", (follow_id,))
    return {"deleted": True}


@router.get("/search", response_model=list[SearchResult])
def search_reports(
    q:        str           = Query(..., min_length=2),
    type:     Optional[str] = Query(None, pattern="^(learn|invest)$"),
    date_from: Optional[str] = None,
    date_to:   Optional[str] = None,
    tag:       Optional[str] = None,
    limit:  int = Query(20, ge=1, le=50),
    offset: int = Query(0,  ge=0),
):
    fts_query = re.sub(r"[^\w\s]", " ", q).strip()
    if not fts_query:
        return []

    extra: list[str] = []
    params: list     = [fts_query]

    if type:
        extra.append("r.type = ?")
        params.append(type)
    if date_from:
        extra.append("r.generated_at >= ?")
        params.append(date_from)
    if date_to:
        extra.append("r.generated_at <= ?")
        params.append(date_to)
    if tag:
        extra.append("r.tags LIKE ?")
        params.append(f'%"{tag}"%')

    extra_sql = f"AND {' AND '.join(extra)}" if extra else ""
    params += [limit, offset]

    sql = f"""
        SELECT r.id, r.type, r.title, r.tagline, r.generated_at, r.content, r.tags,
               bm25(reports_fts) AS rank
        FROM reports_fts
        JOIN reports r ON reports_fts.rowid = r.id
        WHERE reports_fts MATCH ? {extra_sql}
        ORDER BY rank
        LIMIT ? OFFSET ?
    """

    def _snippet(content_json: str) -> str:
        try:
            content = json.loads(content_json)
            for section in content.get("sections", []):
                body = section.get("body", "")
                if q.lower() in body.lower():
                    idx   = body.lower().find(q.lower())
                    start = max(0, idx - 80)
                    end   = min(len(body), idx + 160)
                    snip  = body[start:end].strip()
                    if start > 0: snip = "..." + snip
                    if end < len(body): snip = snip + "..."
                    return snip
            sections = content.get("sections", [])
            if sections:
                body = sections[0].get("body", "")
                return body[:200] + ("..." if len(body) > 200 else "")
        except Exception:
            pass
        return ""

    with db() as conn:
        rows = conn.execute(sql, params).fetchall()

    return [
        SearchResult(
            id=r["id"], type=r["type"], title=r["title"],
            tagline=r["tagline"], generated_at=r["generated_at"],
            snippet=_snippet(r["content"]),
            tags=json.loads(r["tags"] or "[]"),
        )
        for r in rows
    ]


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: int):
    with db() as conn:
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Report not found")
    try:
        return _row_to_full(row)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(500, str(e))


@router.get("/{report_id}/follow")
def get_follow_status(report_id: int):
    with db() as conn:
        rows = conn.execute(
            "SELECT section_id, active FROM followed_stories WHERE report_id = ?",
            (report_id,),
        ).fetchall()
    return {r["section_id"]: bool(r["active"]) for r in rows}


@router.post("/{report_id}/follow/{section_id}")
def toggle_follow(report_id: int, section_id: str, body: FollowIn):
    now = datetime.now(timezone.utc).isoformat()
    with db() as conn:
        existing = conn.execute(
            "SELECT id, active FROM followed_stories WHERE report_id=? AND section_id=?",
            (report_id, section_id),
        ).fetchone()
        if existing:
            new_active = 0 if existing["active"] else 1
            conn.execute(
                "UPDATE followed_stories SET active=? WHERE report_id=? AND section_id=?",
                (new_active, report_id, section_id),
            )
            return {"following": bool(new_active)}
        else:
            phrase = _generate_phrase(body.headline)
            conn.execute(
                "INSERT INTO followed_stories "
                "(report_id, section_id, headline, phrase, tags, created_at, active) "
                "VALUES (?, ?, ?, ?, ?, ?, 1)",
                (report_id, section_id, body.headline, phrase, json.dumps(body.tags), now),
            )
            return {"following": True, "phrase": phrase}


@router.get("/{report_id}/feedback")
def get_feedback(report_id: int):
    with db() as conn:
        row = conn.execute(
            "SELECT vote FROM feedback WHERE report_id=?", (report_id,)
        ).fetchone()
    return {"vote": row["vote"] if row else None}


@router.post("/{report_id}/feedback")
def set_feedback(report_id: int, body: FeedbackIn):
    if body.vote not in (1, -1):
        raise HTTPException(400, "vote must be 1 or -1")
    now = datetime.now(timezone.utc).isoformat()
    with db() as conn:
        existing = conn.execute(
            "SELECT vote FROM feedback WHERE report_id=?", (report_id,)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE feedback SET vote=?, updated_at=? WHERE report_id=?",
                (body.vote, now, report_id),
            )
        else:
            conn.execute(
                "INSERT INTO feedback (report_id, vote, created_at, updated_at) VALUES (?,?,?,?)",
                (report_id, body.vote, now, now),
            )
    return {"vote": body.vote}


def _build_audio_text(content: dict) -> str:
    parts = []
    if content.get("title"):   parts.append(content["title"])
    if content.get("tagline"): parts.append(content["tagline"])
    for s in content.get("sections", []):
        if s.get("headline"): parts.append(s["headline"])
        if s.get("body"):     parts.append(s["body"])
        if s.get("key_insight"): parts.append(f"Key insight: {s['key_insight']}")
    text = ". ".join(p.strip(". ") for p in parts if p)
    return text[:4096]


@router.get("/{report_id}/audio")
def get_audio(report_id: int):
    audio_path = AUDIO_DIR / f"audio_{report_id}.mp3"
    if audio_path.exists():
        return FileResponse(str(audio_path), media_type="audio/mpeg")

    with db() as conn:
        row = conn.execute(
            "SELECT content FROM reports WHERE id=?", (report_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, "Report not found")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(500, "OPENAI_API_KEY not configured")

    try:
        from openai import OpenAI
        client  = OpenAI(api_key=api_key)
        content = json.loads(row["content"])
        text    = _build_audio_text(content)
        resp    = client.audio.speech.create(model="tts-1", voice="alloy", input=text)
        AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        resp.stream_to_file(str(audio_path))
        return FileResponse(str(audio_path), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(500, str(e))
