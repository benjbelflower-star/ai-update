import { notFound } from "next/navigation";
import Link from "next/link";
import ReportViewer from "@/components/ReportViewer";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface Props {
  params: { id: string };
}

export default async function ReportPage({ params }: Props) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) notFound();

  let report;
  try {
    // Server component: must use absolute URL — /api/... won't work here
    const res = await fetch(`${BACKEND}/reports/${id}`, { cache: "no-store" });
    if (!res.ok) notFound();
    report = await res.json();
  } catch (e) {
    console.error("Failed to fetch report", id, e);
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted
                     hover:text-primary transition-colors duration-150 group"
        >
          <svg
            className="w-3.5 h-3.5 transition-transform duration-150 group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>
      <ReportViewer report={report} />
    </div>
  );
}
