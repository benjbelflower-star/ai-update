import Link from "next/link";
import type { ReportSummary } from "@/lib/api";

interface Props {
  report: ReportSummary;
  large?: boolean;
}

const AZ = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Phoenix",
  month:    "short",
  day:      "numeric",
  hour:     "numeric",
  minute:   "2-digit",
  hour12:   true,
});

// Static class maps — Tailwind must see these as literal strings to include them
const STYLES = {
  learn: {
    card:   "card-learn",
    title:  "group-hover:text-learn",
    pill:   "pill-learn",
    label:  "Learn",
    stripe: "bg-learn",
  },
  invest: {
    card:   "card-invest",
    title:  "group-hover:text-invest",
    pill:   "pill-invest",
    label:  "Invest",
    stripe: "bg-invest",
  },
} as const;

export default function ReportCard({ report, large = false }: Props) {
  const s       = STYLES[report.type === "learn" ? "learn" : "invest"];
  let dateStr   = "";
  try { dateStr = AZ.format(new Date(report.generated_at)); } catch { dateStr = ""; }

  return (
    <Link href={`/report/${report.id}`} className="block group">
      <article
        className={`card ${s.card} overflow-hidden hover:-translate-y-0.5 active:scale-[0.99] ${
          large ? "min-h-[148px]" : ""
        }`}
      >
        {/* Coloured top stripe */}
        <div className={`h-[3px] w-full ${s.stripe} opacity-70`} />

        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className={`pill ${s.pill}`}>{s.label}</span>
            <time className="text-[11px] text-muted tabular-nums">{dateStr}</time>
          </div>

          <h2
            className={`font-semibold leading-snug mb-1.5 transition-colors duration-150 ${s.title} ${
              large ? "text-[17px]" : "text-[15px]"
            } text-primary`}
          >
            {report.title}
          </h2>

          {report.tagline && (
            <p className="text-sm text-dim line-clamp-2 leading-relaxed mt-1">
              {report.tagline}
            </p>
          )}

          {report.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {report.tags.slice(0, 4).map((t) => (
                <span key={t} className="pill pill-dim">{t}</span>
              ))}
              {report.tags.length > 4 && (
                <span className="pill pill-dim">+{report.tags.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
