"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api, ReportSummary, FollowedPhrase } from "@/lib/api";
import ReportCard from "@/components/ReportCard";

// ── Swipeable phrase row ────────────────────────────────────────────────────────
function SwipeablePhrase({
  item, selected, onSelect, onDelete,
}: {
  item: FollowedPhrase;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const startX = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - startX.current;
    if (delta < -60) { if (!revealed) setRevealed(true); else onDelete(); }
    else if (delta > 30) setRevealed(false);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete reveal */}
      <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-center bg-red-600 rounded-r-xl">
        <button onClick={onDelete} aria-label="Delete" className="p-2 text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16M10 4h4a1 1 0 011 1v2H9V5a1 1 0 011-1z"
            />
          </svg>
        </button>
      </div>

      {/* Row */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={onSelect}
        style={{
          transform:  revealed ? "translateX(-64px)" : "translateX(0)",
          transition: "transform 0.2s ease",
        }}
        className={`relative flex items-center gap-3 px-4 py-3 cursor-pointer select-none rounded-xl border ${
          selected
            ? "bg-learn/10 border-learn/30"
            : "bg-[#13131a] border-[#1e1e2e]"
        }`}
      >
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          selected ? "bg-learn border-learn" : "border-[#1e1e2e]"
        }`}>
          {selected && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary truncate">{item.phrase}</p>
          <p className="text-xs text-muted truncate mt-0.5">{item.headline}</p>
        </div>
      </div>
    </div>
  );
}

// ── Following Panel ─────────────────────────────────────────────────────────────
function FollowingPanel({
  onFilter, onClose,
}: {
  onFilter: (phrases: FollowedPhrase[]) => void;
  onClose: () => void;
}) {
  const [items, setItems]       = useState<FollowedPhrase[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.getFollowing()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: number) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleDelete = async (id: number) => {
    await api.deleteFollowing(id).catch(() => {});
    setItems((p) => p.filter((i) => i.id !== id));
    setSelected((p) => { const n = new Set(p); n.delete(id); return n; });
  };

  const handleGo = () => {
    const chosen = items.filter((i) => selected.has(i.id));
    if (!chosen.length) return;
    onFilter(chosen);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f] border-t border-[#1e1e2e] rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#1e1e2e]" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 shrink-0">
          <h2 className="text-base font-bold text-primary">Following</h2>
          <button onClick={onClose} className="text-xs text-muted hover:text-dim transition-colors">Close</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 space-y-2 pb-4">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-learn border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <p className="text-center text-muted text-sm py-10">
              No followed topics. Follow a story section in any report to track it here.
            </p>
          )}
          {items.map((item) => (
            <SwipeablePhrase
              key={item.id} item={item}
              selected={selected.has(item.id)}
              onSelect={() => toggle(item.id)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>

        {items.length > 0 && (
          <div className="px-4 pb-8 pt-3 border-t border-[#1e1e2e] bg-[#0a0a0f] shrink-0">
            <button
              onClick={handleGo}
              disabled={selected.size === 0}
              className="w-full py-3 rounded-xl bg-learn text-white font-semibold text-sm
                         disabled:opacity-40 transition-opacity"
            >
              {selected.size === 0
                ? "Select topics to filter"
                : `Show reports for ${selected.size} topic${selected.size > 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Archive Page ────────────────────────────────────────────────────────────────
const TYPE_TABS = [
  { value: "",        label: "All"       },
  { value: "learn",   label: "Learn"     },
  { value: "invest",  label: "Invest"    },
  { value: "follow",  label: "Following" },
];
const SORT_TABS = [
  { value: "desc", label: "Newest" },
  { value: "asc",  label: "Oldest" },
];
const LIMIT = 20;

export default function ArchivePage() {
  const [reports, setReports]           = useState<ReportSummary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [type, setType]                 = useState("");
  const [sort, setSort]                 = useState("desc");
  const [offset, setOffset]             = useState(0);
  const [hasMore, setHasMore]           = useState(true);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followFilter, setFollowFilter] = useState<FollowedPhrase[] | null>(null);

  const loadNormal = useCallback(async (reset: boolean) => {
    setLoading(true);
    try {
      const cur  = reset ? 0 : offset;
      const data = await api.listReports({ type: type || undefined, sort, limit: LIMIT, offset: cur });
      if (reset) { setReports(data); setOffset(LIMIT); }
      else        { setReports((p) => [...p, ...data]); setOffset((p) => p + LIMIT); }
      setHasMore(data.length === LIMIT);
    } catch { setHasMore(false); } finally { setLoading(false); }
  }, [type, sort, offset]);

  const loadFollowFiltered = useCallback(async (phrases: FollowedPhrase[]) => {
    setLoading(true);
    try {
      const sets = await Promise.all(phrases.map((p) => api.search({ q: p.phrase })));
      const seen = new Set<number>();
      const combined: ReportSummary[] = [];
      for (const results of sets)
        for (const r of results)
          if (!seen.has(r.id)) {
            seen.add(r.id);
            combined.push({ id: r.id, type: r.type, title: r.title, tagline: r.tagline, generated_at: r.generated_at, tags: r.tags });
          }
      combined.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
      setReports(combined);
      setHasMore(false);
    } catch { setReports([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (followFilter) loadFollowFiltered(followFilter);
    else { setOffset(0); loadNormal(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, sort, followFilter]);

  const handleTabClick = (value: string) => {
    if (value === "follow") { setShowFollowing(true); return; }
    setFollowFilter(null);
    setType(value);
  };

  return (
    <div className="animate-fade-in">
      {showFollowing && (
        <FollowingPanel
          onFilter={(p) => { setFollowFilter(p); }}
          onClose={() => setShowFollowing(false)}
        />
      )}

      <header className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight leading-none">Archive</h1>
        <p className="text-muted text-sm mt-1.5">Every report, forever</p>
      </header>

      {/* Follow filter banner */}
      {followFilter && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-learn/10 border border-learn/20 rounded-xl text-xs">
          <span className="text-learn font-medium flex-1 truncate">
            Filtering: {followFilter.map((p) => p.phrase).join(", ")}
          </span>
          <button onClick={() => setFollowFilter(null)} className="text-muted hover:text-dim shrink-0">
            Clear
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card p-3 mb-6 space-y-2">
        {/* Type / Following tabs */}
        <div className="flex gap-1.5">
          {TYPE_TABS.map((tab) => {
            const active = tab.value === "follow"
              ? !!followFilter
              : !followFilter && type === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleTabClick(tab.value)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  active
                    ? "bg-learn text-white"
                    : "text-muted hover:text-dim hover:bg-surface-2"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sort tabs */}
        <div className="flex gap-1.5">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSort(tab.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                sort === tab.value
                  ? "bg-learn text-white"
                  : "text-muted hover:text-dim hover:bg-surface-2"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {reports.length === 0 && !loading ? (
        <div className="text-center py-16 text-muted">
          <p>No reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-learn border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasMore && !loading && reports.length > 0 && (
        <button
          onClick={() => loadNormal(false)}
          className="w-full mt-6 py-3 text-sm text-muted border border-border rounded-xl
                     hover:border-learn/40 hover:text-dim transition-all duration-150"
        >
          Load more
        </button>
      )}
    </div>
  );
}
