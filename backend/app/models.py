from pydantic import BaseModel
from typing import Optional


class ChartData(BaseModel):
    type: str  # bar | line | pie
    title: str
    x_label: str = ""
    y_label: str = ""
    data: dict  # {"labels": [...], "values": [...]}


class Source(BaseModel):
    title: str
    url: str


class ReportSection(BaseModel):
    id: str
    headline: str
    body: str
    key_insight: str
    wit: Optional[str] = None
    chart_id: Optional[str] = None
    sources: list[Source] = []
    tags: list[str] = []


class QuickStat(BaseModel):
    label: str
    value: str
    icon: str = ""


class ReportContent(BaseModel):
    title: str
    tagline: str
    sections: list[ReportSection]
    quick_stats: list[QuickStat] = []
    no_developments: list[str] = []


class ReportOut(BaseModel):
    id: int
    type: str
    title: str
    tagline: Optional[str]
    generated_at: str
    content: ReportContent
    tags: list[str] = []


class ReportSummary(BaseModel):
    id: int
    type: str
    title: str
    tagline: Optional[str]
    generated_at: str
    tags: list[str] = []


class SearchResult(BaseModel):
    id: int
    type: str
    title: str
    tagline: Optional[str]
    generated_at: str
    snippet: str
    tags: list[str] = []


class SourceOut(BaseModel):
    id: int
    name: str
    url: str
    type: str
    score: float
    last_checked: Optional[str]
    active: bool


class WatchlistItem(BaseModel):
    id: int
    name: str
    ticker: Optional[str]
    category: Optional[str]
    score: float
    active: bool
