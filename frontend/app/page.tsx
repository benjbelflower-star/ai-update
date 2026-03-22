import { api } from "@/lib/api";
import ReportCard from "@/components/ReportCard";
import GenerateButton from "@/components/GenerateButton";
import Link from "next/link";

// Format today's date in Phoenix timezone
const TODAY_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Phoenix",
  weekday: "long",
  month:   "long",
  day:     "numeric",
});

async function getLatest() {
  try { return await api.getLatest(); }
  catch { return { learn: null, invest: null }; }
}

async function getStats() {
  try { return await api.getStats(); }
  catch { return null; }
}

async function getRecent() {
  try { return await api.listReports({ limit: 6, offset: 2 }); }
  catch { return []; }
}

export default async function TodayPage() {
  const [latest, stats, recent] = await Promise.all([
    getLatest(), getStats(), getRecent(),
  ]);
  const hasReports = latest.learn || latest.invest;
  const today      = TODAY_FMT.format(new Date());

  return (
    <div className="animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="-mx-4 px-4 pt-5 pb-6 mb-6 bg-gradient-to-b from-learn-dim to-bg">
        <p className="text-[11px] font-semibold text-learn/70 uppercase tracking-widest mb-3">
          {today}
        </p>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-primary leading-none">
              AI Update
            </h1>
            <p className="text-dim text-[14px] mt-1.5 font-medium">
              Your personal AI digest
            </p>
          </div>
          <GenerateButton variant="header" />
        </div>

        {stats && (
          <div className="flex items-center gap-2.5 mt-4 text-[11px] text-muted">
            <span className="tabular-nums font-medium">{stats.total_reports} reports</span>
            <span className="w-[3px] h-[3px] rounded-full bg-border" />
            <span>7 am · 12 pm · 6 pm</span>
          </div>
        )}
      </header>

      {hasReports ? (
        <>
          {/* ── Latest Edition ──────────────────────────────────────── */}
          <section>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
              Latest Edition
            </p>
            <div className="space-y-3">
              {latest.learn  && <ReportCard report={latest.learn}  large />}
              {latest.invest && <ReportCard report={latest.invest} large />}
            </div>
          </section>

          {/* ── Recent ──────────────────────────────────────────────── */}
          {recent.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                  Recent
                </p>
                <Link
                  href="/archive"
                  className="text-xs font-medium text-learn hover:text-learn/70 transition-colors"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {recent.map((r) => <ReportCard key={r.id} report={r} />)}
              </div>
            </section>
          )}
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center mt-2">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)" }}
      >
        <svg className="w-5 h-5 text-learn" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
      </div>
      <h2 className="font-semibold text-base text-primary mb-1.5">No reports yet</h2>
      <p className="text-dim text-sm mb-6 max-w-xs mx-auto leading-relaxed">
        Reports generate at 7 am, noon, and 6 pm. Trigger one now to get started.
      </p>
      <GenerateButton />
    </div>
  );
}
