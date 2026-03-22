"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ReportOut, ReportSection, QuickStat } from "@/lib/api";
import { api } from "@/lib/api";

// ── Formatters ──────────────────────────────────────────────────────────────────
const AZ_LONG = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Phoenix",
  weekday: "long",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

// ── Audio Player ────────────────────────────────────────────────────────────────
function AudioPlayer({ reportId }: { reportId: number }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const toggle = useCallback(async () => {
    if (state === "playing") {
      audioRef.current?.pause();
      setState("paused");
      return;
    }
    if (state === "paused" && audioRef.current) {
      audioRef.current.play();
      setState("playing");
      return;
    }
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

  const label =
    state === "loading" ? "Loading..." :
    state === "playing" ? "Pause"      :
    state === "paused"  ? "Resume"     : "Listen";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={state === "loading"}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full
                   border border-border text-dim hover:border-primary/40 hover:text-primary
                   transition-all duration-150 disabled:opacity-40"
      >
        {state === "loading" && (
          <span className="w-3 h-3 border border-dim border-t-transparent rounded-full animate-spin" />
        )}
        {state === "playing" ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : state !== "loading" ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        ) : null}
        {label}
      </button>
      {(state === "playing" || state === "paused") && (
        <button
          onClick={stop}
          className="text-xs text-muted hover:text-dim transition-colors"
        >
          Stop
        </button>
      )}
    </div>
  );
}

// ── Follow Button ───────────────────────────────────────────────────────────────
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
    } catch { /* ignore */ } finally {
      setBusy(false);
    }
  }, [busy, reportId, section]);

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={following ? "Unfollow story" : "Follow story"}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border
                  transition-all duration-150 disabled:opacity-40 ${
        following
          ? "border-learn bg-learn/10 text-learn"
          : "border-border text-muted hover:border-learn/40 hover:text-dim"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
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

// ── Quick Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ stat }: { stat: QuickStat }) {
  return (
    <div className="card px-4 py-3 text-center min-w-[96px] shrink-0">
      <div className="font-bold text-base leading-none text-primary">{stat.value}</div>
      <div className="text-[11px] text-muted mt-1 leading-tight">{stat.label}</div>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────────
function Section({
  section,
  reportType,
  reportId,
}: {
  section: ReportSection;
  reportType: string;
  reportId: number;
}) {
  const accent = reportType === "learn" ? "learn" : "invest";

  return (
    <article className="animate-slide-up">
      <h2 className={`text-xl font-bold mb-3 leading-snug text-${accent}`}>
        {section.headline}
      </h2>

      <div className="space-y-3 text-[15px] leading-relaxed text-primary/90">
        {section.body.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {section.key_insight && (
        <div className="insight-callout mt-4">
          <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">
            Key Insight
          </p>
          <p className="text-sm font-medium text-primary">{section.key_insight}</p>
        </div>
      )}

      {section.wit && (
        <p className="mt-3 text-sm text-muted italic">{section.wit}</p>
      )}

      {section.chart_id && (
        <div className="mt-4 rounded-xl overflow-hidden border border-border">
          <img
            src={api.chartUrl(section.chart_id)}
            alt="Data chart"
            className="w-full block"
            loading="lazy"
          />
        </div>
      )}

      {section.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {section.tags.map((t) => (
            <span key={t} className={`pill pill-${accent}`}>{t}</span>
          ))}
        </div>
      )}

      {section.sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2">
            Sources
          </p>
          <ul className="space-y-1.5">
            {section.sources.map((src, i) => (
              <li key={i}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs text-${accent} hover:underline flex items-start gap-1`}
                >
                  <span className="shrink-0 mt-0.5">↗</span>
                  <span className="line-clamp-1">{src.title || src.url}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <FollowButton reportId={reportId} section={section} />
      </div>
    </article>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────
export default function ReportViewer({ report }: { report: ReportOut }) {
  const isLearn = report.type === "learn";
  const accent  = isLearn ? "learn" : "invest";
  let dateStr   = "";
  try { dateStr = AZ_LONG.format(new Date(report.generated_at)); } catch { dateStr = ""; }

  const { sections, quick_stats, no_developments } = report.content;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className={`pill pill-${accent} text-sm px-3 py-1`}>
            {isLearn ? "Learn Edition" : "Invest Edition"}
          </span>
          <AudioPlayer reportId={report.id} />
        </div>
        <h1 className="text-[22px] font-bold leading-tight mb-2">
          {report.content.title}
        </h1>
        {report.content.tagline && (
          <p className="text-dim text-base italic">{report.content.tagline}</p>
        )}
        <time className="block text-xs text-muted mt-2">{dateStr}</time>
      </header>

      {/* Quick Stats */}
      {quick_stats.length > 0 && (
        <div className="mb-8 overflow-x-auto no-scrollbar">
          <div className="flex gap-3 pb-1">
            {quick_stats.map((s, i) => <StatCard key={i} stat={s} />)}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-10">
        {sections.map((section, i) => (
          <div key={section.id}>
            <Section section={section} reportType={report.type} reportId={report.id} />
            {i < sections.length - 1 && <hr className="mt-10 border-border" />}
          </div>
        ))}
      </div>

      {/* No Developments */}
      {no_developments && no_developments.length > 0 && (
        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3">
            Followed Stories — No New Developments
          </p>
          <ul className="space-y-2">
            {no_developments.map((headline, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted">
                <span className="shrink-0 mt-0.5">—</span>
                <span>{headline}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-border text-center">
        <p className="text-xs text-muted">AI Update · {dateStr}</p>
      </footer>
    </div>
  );
}
