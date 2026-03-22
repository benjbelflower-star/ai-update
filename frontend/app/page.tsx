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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Update</h1>
            <p className="text-dim text-sm mt-0.5">Your personal AI digest</p>
          </div>
          <GenerateButton variant="header" />
        </div>

        {stats && (
          <div className="flex gap-4 mt-4 text-xs text-muted">
            <span>{stats.total_reports} reports archived</span>
            <span>7am · 12pm · 6pm</span>
          </div>
        )}
      </header>

      {hasReports ? (
        <>
          <section>
            <h2 className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3">
              Latest Edition
            </h2>
            <div className="space-y-3">
              {latest.learn  && <ReportCard report={latest.learn}  large />}
              {latest.invest && <ReportCard report={latest.invest} large />}
            </div>
          </section>

          {recent.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] font-semibold text-muted uppercase tracking-widest">
                  Recent
                </h2>
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
    <div className="card p-10 text-center">
      <h2 className="font-semibold text-lg mb-2">No reports yet</h2>
      <p className="text-dim text-sm mb-6 max-w-xs mx-auto">
        Reports generate at 7am, noon, and 6pm. Trigger one now to get started.
      </p>
      <GenerateButton />
    </div>
  );
}
