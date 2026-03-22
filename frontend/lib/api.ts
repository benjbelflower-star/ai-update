const IS_SERVER  = typeof window === "undefined";
const BACKEND    = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const BASE       = IS_SERVER ? BACKEND : "/api";

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface ReportSummary {
  id: number;
  type: "learn" | "invest";
  title: string;
  tagline: string | null;
  generated_at: string;
  tags: string[];
}

export interface Source {
  title: string;
  url: string;
}

export interface ReportSection {
  id: string;
  headline: string;
  body: string;
  key_insight: string;
  wit: string | null;
  chart_id: string | null;
  sources: Source[];
  tags: string[];
}

export interface QuickStat {
  label: string;
  value: string;
  icon: string;
}

export interface ReportContent {
  title: string;
  tagline: string;
  sections: ReportSection[];
  quick_stats: QuickStat[];
  no_developments: string[];
}

export interface ReportOut extends ReportSummary {
  content: ReportContent;
}

export interface SearchResult {
  id: number;
  type: "learn" | "invest";
  title: string;
  tagline: string | null;
  generated_at: string;
  snippet: string;
  tags: string[];
}

export interface FollowedPhrase {
  id: number;
  phrase: string;
  headline: string;
  created_at: string;
}

// ── HTTP helpers ───────────────────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  const str = q.toString();
  return str ? `?${str}` : "";
}

// ── API ────────────────────────────────────────────────────────────────────────

export const api = {
  // Reports
  getLatest: () =>
    fetchJSON<{ learn: ReportSummary | null; invest: ReportSummary | null }>(
      `${BASE}/reports/latest`
    ),

  getReport: (id: number) =>
    fetchJSON<ReportOut>(`${BASE}/reports/${id}`),

  listReports: (params: {
    type?: string;
    sort?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  }) => fetchJSON<ReportSummary[]>(`${BASE}/reports${qs(params)}`),

  search: (params: {
    q: string;
    type?: string;
    date_from?: string;
    date_to?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  }) => fetchJSON<SearchResult[]>(`${BASE}/reports/search${qs(params)}`),

  generateReport: () =>
    fetch("/api/reports/generate", { method: "POST" }).then((r) => r.json()),

  getStats: () =>
    fetchJSON<Record<string, number>>(`${BASE}/sources/stats`),

  // Follow system
  getFollowStatus: (reportId: number) =>
    fetchJSON<Record<string, boolean>>(`${BASE}/reports/${reportId}/follow`),

  toggleFollow: (
    reportId: number,
    sectionId: string,
    headline: string,
    tags: string[]
  ) =>
    fetch(`/api/reports/${reportId}/follow/${sectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline, tags }),
    }).then((r) => r.json()) as Promise<{ following: boolean; phrase?: string }>,

  getFollowing: () =>
    fetchJSON<FollowedPhrase[]>(`${BASE}/reports/following`),

  deleteFollowing: (id: number) =>
    fetch(`/api/reports/following/${id}`, { method: "DELETE" }).then((r) => r.json()),

  // Feedback
  getFeedback: (reportId: number) =>
    fetchJSON<{ vote: number | null }>(`${BASE}/reports/${reportId}/feedback`),

  setFeedback: (reportId: number, vote: 1 | -1) =>
    fetch(`/api/reports/${reportId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote }),
    }).then((r) => r.json()),

  // Assets
  chartUrl: (filename: string) => `/api/charts/${filename}`,
  audioUrl: (reportId: number) => `/api/reports/${reportId}/audio`,
};
