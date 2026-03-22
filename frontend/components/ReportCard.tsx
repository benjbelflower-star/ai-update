import Link from "next/link";
import type { ReportSummary } from "@/lib/api";

interface Props {
  report: ReportSummary;
  large?: boolean;
}

const AZ = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Phoenix",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default function ReportCard({ report, large = false }: Props) {
  const isLearn    = report.type === "learn";
  const accent     = isLearn ? "learn" : "invest";
  const label      = isLearn ? "Learn" : "Invest";
  let dateStr = "";
  try { dateStr = AZ.format(new Date(report.generated_at)); } catch { dateStr = ""; }

  return (
    <Link href={`/report/${report.id}`} className="block group">
      <article
        className={`card p-5 transition-all duration-200 hover:border-${accent}/40 hover:-translate-y-0.5 active:scale-[0.99] ${
          large ? "min-h-[148px]" : ""
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className={`pill pill-${accent}`}>{label}</span>
          <time className="text-xs text-muted">{dateStr}</time>
        </div>

        <h2
          className={`font-semibold leading-snug mb-1 transition-colors duration-150 group-hover:text-${accent} ${
            large ? "text-lg" : "text-[15px]"
          }`}
        >
          {report.title}
        </h2>

        {report.tagline && (
          <p className="text-sm text-dim line-clamp-2 leading-relaxed">{report.tagline}</p>
        )}

        {report.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {report.tags.slice(0, 4).map((t) => (
              <span key={t} className="pill pill-dim">{t}</span>
            ))}
            {report.tags.length > 4 && (
              <span className="pill pill-dim">+{report.tags.length - 4}</span>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}
