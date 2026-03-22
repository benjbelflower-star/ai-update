import json
from datetime import datetime, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .database import db
from .scraper import scrape_all
from .generator import build_report

_scheduler: BackgroundScheduler | None = None
_TZ = "America/Phoenix"  # UTC-7, no DST


def _get_sources() -> list[dict]:
    with db() as conn:
        rows = conn.execute(
            "SELECT name, url, type, score, active FROM sources WHERE active = 1"
        ).fetchall()
    return [dict(r) for r in rows]


def _save_report(report: dict):
    with db() as conn:
        conn.execute(
            "INSERT INTO reports (type, title, tagline, generated_at, content, tags, sources_used) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                report["type"],
                report["title"],
                report.get("tagline", ""),
                report["generated_at"],
                json.dumps(report["content"]),
                json.dumps(report.get("tags", [])),
                json.dumps(report.get("sources_used", [])),
            ),
        )
    print(f"[scheduler] Saved {report['type']} report: {report['title']}")


def run_generation_cycle():
    print(f"[scheduler] Cycle started at {datetime.now(timezone.utc).isoformat()}")
    sources = _get_sources()

    for report_type in ("learn", "invest"):
        try:
            articles = scrape_all(sources, report_type)
            print(f"[scheduler] {report_type}: {len(articles)} articles scraped")
            report = build_report(report_type, articles, sources)
            if report:
                _save_report(report)
            else:
                print(f"[scheduler] {report_type}: generation failed")
        except Exception as e:
            import traceback
            print(f"[scheduler] {report_type} error: {e}")
            traceback.print_exc()


def start_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    # CRITICAL: pass timezone explicitly on EACH CronTrigger — do not rely on
    # scheduler-level timezone inheritance (APScheduler behaviour is inconsistent)
    _scheduler = BackgroundScheduler()

    for hour in (7, 12, 18):
        _scheduler.add_job(
            run_generation_cycle,
            CronTrigger(hour=hour, minute=0, timezone=_TZ),
            id=f"generate_{hour}",
            replace_existing=True,
            misfire_grace_time=300,
        )

    _scheduler.start()
    jobs = _scheduler.get_jobs()
    next_runs = [f"{j.id} → {j.next_run_time}" for j in jobs]
    print(f"[scheduler] Started (7am/12pm/6pm {_TZ}). Next runs:")
    for r in next_runs:
        print(f"  {r}")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        print("[scheduler] Stopped")
