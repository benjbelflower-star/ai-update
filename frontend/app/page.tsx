import { api } from "@/lib/api";
import ReportCard from "@/components/ReportCard";
import GenerateButton from "@/components/GenerateButton";
import Link from "next/link";

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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight leading-none">AI Update</h1>
            <p className="text-muted text-sm mt-1.5">Your personal AI digest</p>
          </div>
          <GenerateButton variant="header" />
        </div>

        {stats && (
          <div className="flex items-center gap-3 mt-4 text-[11px] text-muted/60">
            <span className="tabular-nums">{stats.total_reports} reports</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>7am · 12pm · 6pm</span>
          </div>
        )}
      </header>

      {hasReports ? (
        <>
          <section>
            <p className="text-[10px] font-bold text-muted/60 uppercase tracking-widest mb-3">
              Latest Edition
            </p>
            <div className="space-y-3">
              {latest.learn  && <ReportCard report={latest.learn}  large />}
              {latest.invest && <ReportCard report={latest.invest} large />}
            </div>
          </section>

          {recent.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-muted/60 uppercase tracking-widest">
                  Recent
                </p>
                <Link href="/archive" className="text-xs text-learn hover:text-learn/80 transition-colors">
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
    <div className="card p-10 text-center mt-4">
      <div className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
        <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
      </div>
      <h2 className="font-semibold text-base mb-1.5">No reports yet</h2>
      <p className="text-muted text-sm mb-6 max-w-xs mx-auto leading-relaxed">
        Reports generate at 7am, noon, and 6pm. Trigger one now to get started.
      </p>
      <GenerateButton />
    </div>
  );
}
