"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReportOut, ReportSection, QuickStat } from "@/lib/api";
import { api } from "@/lib/api";

// ── Formatters ───────────────────────────────────────────────────────────────────
const AZ_LONG = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Phoenix",
  weekday:  "long",
  month:    "long",
  day:      "numeric",
  hour:     "numeric",
  minute:   "2-digit",
  hour12:   true,
});

// ── Audio Player ─────────────────────────────────────────────────────────────────
function AudioPlayer({ reportId }: { reportId: number }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const toggle = useCallback(async () => {
    if (state === "playing") { audioRef.current?.pause(); setState("paused"); return; }
    if (state === "paused" && audioRef.current) { audioRef.current.play(); setState("playing"); return; }
    setState("loading");
    const audio = new Audio(api.audioUrl(reportId));
    audioRef.current = audio;
    audio.oncanplaythrough = () => { audio.play(); setState("playing"); };
    audio.onended  = () => setState("idle");
    audio.onerror  = () => setState("idle");
    audio.load();
  }, [state, reportId]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setState("idle");
  }, []);

  const isActive = state === "playing" || state === "paused";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={state === "loading"}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold
                    transition-all duration-150 disabled:opacity-40 ${
          state === "playing"
            ? "bg-learn/10 border-learn/40 text-learn"
            : "border-border text-dim hover:border-primary/40 hover:text-primary"
        }`}
      >
        {state === "loading" && (
          <span className="w-3.5 h-3.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}

        {state === "playing" && (
          <span className="flex items-end gap-[2px] w-3.5 h-3.5 shrink-0">
            <span className="w-[3px] h-full bg-current rounded-sm origin-bottom animate-bar1" />
            <span className="w-[3px] h-full bg-current rounded-sm origin-bottom animate-bar2" />
            <span className="w-[3px] h-full bg-current rounded-sm origin-bottom animate-bar3" />
          </span>
        )}

        {state === "paused" && (
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        )}

        {state === "idle" && (
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        )}

        {state === "loading" ? "Loading"  :
         state === "playing" ? "Playing"  :
         state === "paused"  ? "Resume"   : "Listen"}
      </button>

      {isActive && (
        <button onClick={stop} className="text-[11px] text-muted hover:text-dim transition-colors">
          Stop
        </button>
      )}
    </div>
  );
}

// ── Follow Button ─────────────────────────────────────────────────────────────────
function FollowButton({ reportId, section }: { reportId: number; section: ReportSection }) {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy]           = useState(false);

  useEffect(() => {
    api.getFollowStatus(reportId)
      .then((s) => setFollowing(!!s[section.id]))
      .catch(() => {});
  }, [reportId, section.id]);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.toggleFollow(reportId, section.id, section.headline, section.tags);
      setFollowing(res.following);
    } catch { /* ignore */ } finally { setBusy(false); }
  }, [busy, reportId, section]);

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={following ? "Unfollow story" : "Follow story"}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border
                  transition-all duration-150 disabled:opacity-40 ${
        following
          ? "border-learn/50 bg-learn/10 text-learn"
          : "border-border text-muted hover:border-learn/40 hover:text-dim"
      }`}
    >
      <svg
        className="w-3 h-3"
        fill={following ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {following ? "Following" : "Follow"}
    </button>
  );
}

// ── Quick Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ stat }: { stat: QuickStat }) {
  return (
    <div className="flex-none text-center px-5 py-3.5 rounded-2xl bg-surface border border-border min-w-[108px]">
      <div className="font-bold text-[18px] leading-none text-primary tracking-tight">{stat.value}</div>
      <div className="text-[10px] text-muted mt-1.5 leading-snug uppercase tracking-wide">{stat.label}</div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────────
// Static class maps — Tailwind must see these as literal strings to include them
const SECTION_STYLES = {
  learn:  { headline: "text-learn",  pill: "pill-learn",  link: "text-learn"  },
  invest: { headline: "text-invest", pill: "pill-invest", link: "text-invest" },
} as const;

function Section({
  section,
  reportType,
  reportId,
  index,
}: {
  section: ReportSection;
  reportType: string;
  reportId: number;
  index: number;
}) {
  const s = SECTION_STYLES[reportType === "learn" ? "learn" : "invest"];

  return (
    <article className="animate-slide-up">
      {/* Section number + headline */}
      <div className="mb-4">
        <span className="text-[10px] font-bold text-muted/50 uppercase tracking-widest mb-1.5 block tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <h2 className={`text-xl font-bold leading-tight ${s.headline}`}>
          {section.headline}
        </h2>
      </div>

      {/* Body */}
      <div className="space-y-4 text-[15.5px] leading-[1.8] text-primary/85">
        {section.body.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {/* Key Insight */}
      {section.key_insight && (
        <div className="insight-callout mt-5">
          <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1.5">
            Key Insight
          </p>
          <p className="text-sm font-medium text-primary leading-relaxed">{section.key_insight}</p>
        </div>
      )}

      {/* Wit */}
      {section.wit && (
        <p className="mt-4 text-sm text-muted/70 italic border-l-2 border-border pl-3">
          {section.wit}
        </p>
      )}

      {/* Chart */}
      {section.chart_id && (
        <div className="mt-5 rounded-xl overflow-hidden border border-border/60 bg-surface">
          <img
            src={api.chartUrl(section.chart_id)}
            alt="Data chart"
            className="w-full block"
            loading="lazy"
          />
        </div>
      )}

      {/* Tags */}
      {section.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-5">
          {section.tags.map((t) => (
            <span key={t} className={`pill ${s.pill}`}>{t}</span>
          ))}
        </div>
      )}

      {/* Sources */}
      {section.sources.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border/40">
          <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-2.5">
            Sources
          </p>
          <ul className="space-y-2">
            {section.sources.map((src, i) => (
              <li key={i}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs ${s.link} hover:underline flex items-start gap-1.5`}
                >
                  <svg className="w-3 h-3 shrink-0 mt-0.5 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="line-clamp-1">{src.title || src.url}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5">
        <FollowButton reportId={reportId} section={section} />
      </div>
    </article>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────────
export default function ReportViewer({ report }: { report: ReportOut }) {
  const isLearn = report.type === "learn";
  let dateStr   = "";
  try { dateStr = AZ_LONG.format(new Date(report.generated_at)); } catch { dateStr = ""; }

  const { sections, quick_stats, no_developments } = report.content;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className={`pill ${isLearn ? "pill-learn" : "pill-invest"} px-3 py-1`}>
            {isLearn ? "Learn Edition" : "Invest Edition"}
          </span>
          <AudioPlayer reportId={report.id} />
        </div>

        <h1 className="text-[23px] font-bold leading-tight mb-2 tracking-tight">
          {report.content.title}
        </h1>

        {report.content.tagline && (
          <p className="text-[15px] text-muted leading-relaxed">{report.content.tagline}</p>
        )}

        <time className="block text-[11px] text-muted/60 mt-2 tabular-nums">{dateStr}</time>
      </header>

      {/* Quick Stats */}
      {quick_stats.length > 0 && (
        <div className="mb-8 -mx-1 overflow-x-auto no-scrollbar">
          <div className="flex gap-2.5 px-1 pb-1">
            {quick_stats.map((s, i) => <StatCard key={i} stat={s} />)}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-0">
        {sections.map((section, i) => (
          <div key={section.id}>
            <Section
              section={section}
              reportType={report.type}
              reportId={report.id}
              index={i + 1}
            />

            {i < sections.length - 1 && (
              <div className="my-10 flex items-center gap-4">
                <div className="flex-1 h-px bg-border/50" />
                <div className="w-1 h-1 rounded-full bg-border" />
                <div className="flex-1 h-px bg-border/50" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Developments */}
      {no_developments && no_developments.length > 0 && (
        <div className="mt-10 pt-6 border-t border-border/40">
          <p className="text-[10px] font-semibold text-muted/60 uppercase tracking-widest mb-3">
            Followed Stories — No New Developments
          </p>
          <ul className="space-y-2.5">
            {no_developments.map((headline, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
                <span className="shrink-0 mt-[7px] w-1 h-1 rounded-full bg-muted/40" />
                <span>{headline}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-14 pt-6 border-t border-border/30 text-center">
        <p className="text-[11px] text-muted/40 tracking-wider uppercase">AI Update</p>
        <p className="text-[10px] text-muted/30 mt-1">{dateStr}</p>
      </footer>
    </div>
  );
}
