from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..database import db
from ..models import WatchlistItem

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class WatchlistAdd(BaseModel):
    name: str
    ticker: Optional[str] = None
    category: Optional[str] = None
    score: float = 5.0


@router.get("", response_model=list[WatchlistItem])
def list_watchlist():
    with db() as conn:
        rows = conn.execute("SELECT * FROM watchlist ORDER BY score DESC").fetchall()
    return [
        WatchlistItem(
            id=r["id"], name=r["name"], ticker=r["ticker"],
            category=r["category"], score=r["score"], active=bool(r["active"]),
        )
        for r in rows
    ]


@router.post("", response_model=WatchlistItem)
def add_to_watchlist(body: WatchlistAdd):
    with db() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO watchlist (name, ticker, category, score) VALUES (?,?,?,?)",
                (body.name, body.ticker, body.category, body.score),
            )
            row = conn.execute(
                "SELECT * FROM watchlist WHERE id=?", (cursor.lastrowid,)
            ).fetchone()
        except Exception:
            raise HTTPException(409, "Company already in watchlist")
    return WatchlistItem(
        id=row["id"], name=row["name"], ticker=row["ticker"],
        category=row["category"], score=row["score"], active=bool(row["active"]),
    )


@router.patch("/{item_id}/toggle")
def toggle_watchlist(item_id: int):
    with db() as conn:
        row = conn.execute("SELECT active FROM watchlist WHERE id=?", (item_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Item not found")
        new_val = 0 if row["active"] else 1
        conn.execute("UPDATE watchlist SET active=? WHERE id=?", (new_val, item_id))
    return {"active": bool(new_val)}


@router.delete("/{item_id}")
def delete_from_watchlist(item_id: int):
    with db() as conn:
        conn.execute("DELETE FROM watchlist WHERE id=?", (item_id,))
    return {"deleted": True}
