from fastapi import APIRouter, HTTPException
from ..database import db
from ..models import SourceOut

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("", response_model=list[SourceOut])
def list_sources():
    with db() as conn:
        rows = conn.execute("SELECT * FROM sources ORDER BY score DESC").fetchall()
    return [
        SourceOut(
            id=r["id"], name=r["name"], url=r["url"],
            type=r["type"], score=r["score"],
            last_checked=r["last_checked"], active=bool(r["active"]),
        )
        for r in rows
    ]


@router.patch("/{source_id}/toggle")
def toggle_source(source_id: int):
    with db() as conn:
        row = conn.execute("SELECT active FROM sources WHERE id=?", (source_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Source not found")
        new_val = 0 if row["active"] else 1
        conn.execute("UPDATE sources SET active=? WHERE id=?", (new_val, source_id))
    return {"active": bool(new_val)}


@router.get("/stats")
def get_stats():
    with db() as conn:
        total   = conn.execute("SELECT COUNT(*) AS n FROM reports").fetchone()["n"]
        learn   = conn.execute("SELECT COUNT(*) AS n FROM reports WHERE type='learn'").fetchone()["n"]
        invest  = conn.execute("SELECT COUNT(*) AS n FROM reports WHERE type='invest'").fetchone()["n"]
        sources = conn.execute("SELECT COUNT(*) AS n FROM sources WHERE active=1").fetchone()["n"]
        watch   = conn.execute("SELECT COUNT(*) AS n FROM watchlist WHERE active=1").fetchone()["n"]
    return {
        "total_reports":       total,
        "learn_reports":       learn,
        "invest_reports":      invest,
        "active_sources":      sources,
        "watchlist_companies": watch,
    }
