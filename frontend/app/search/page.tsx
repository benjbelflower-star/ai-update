"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api, SearchResult } from "@/lib/api";

const AZ = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Phoenix",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const TYPE_TABS = [
  { value: "",       label: "All"    },
  { value: "learn",  label: "Learn"  },
  { value: "invest", label: "Invest" },
];

const HINTS = ["NVIDIA", "funding", "transformer", "open source", "acquisition", "benchmark"];

export default function SearchPage() {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [type, setType]       = useState("");
  const inputRef   = useRef<HTMLInputElement>(null);
  const debounceId = useRef<NodeJS.Timeout>();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(debounceId.current);
    if (query.trim().length < 2) { setResults([]); setSearched(false); return; }
    debounceId.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search({ q: query.trim(), type: type || undefined });
        setResults(data);
        setSearched(true);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 380);
  }, [query, type]);

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight leading-none">Search</h1>
        <p className="text-muted text-sm mt-1.5">Search across all archived reports</p>
      </header>

      {/* Search input */}
      <div className="relative mb-4">
        <input
          ref={inputRef}
          type="search"
          placeholder="Search reports..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-surface border border-border rounded-2xl px-4 py-3.5 text-base
                     text-primary placeholder-muted focus:border-learn/60 focus:outline-none
                     transition-colors duration-150"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-learn border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-6">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setType(tab.value)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              type === tab.value
                ? "bg-learn text-white"
                : "bg-surface border border-border text-muted hover:text-dim hover:bg-surface-2"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          {results.map((r) => <SearchResultCard key={r.id} result={r} query={query} />)}
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="text-center py-16 text-muted">
          <p>No results for &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-1 opacity-60">Try different keywords</p>
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-12 text-muted">
          <p className="text-sm">Search for topics, companies, or concepts</p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {HINTS.map((hint) => (
              <button
                key={hint}
                onClick={() => setQuery(hint)}
                className="pill pill-dim cursor-pointer hover:bg-learn/15 hover:text-learn transition-colors"
              >
                {hint}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchResultCard({ result, query }: { result: SearchResult; query: string }) {
  const isLearn = result.type === "learn";
  const accent  = isLearn ? "learn" : "invest";
  let dateStr   = "";
  try { dateStr = AZ.format(new Date(result.generated_at)); } catch { dateStr = ""; }

  const highlight = (text: string) => {
    if (!query) return <>{text}</>;
    const re    = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(re);
    return (
      <>
        {parts.map((part, i) =>
          re.test(part)
            ? <mark key={i} className="bg-accent/25 text-primary rounded px-0.5">{part}</mark>
            : <span key={i}>{part}</span>
        )}
      </>
    );
  };

  return (
    <Link href={`/report/${result.id}`} className="block group">
      <article className={`card p-4 hover:border-${accent}/40 transition-all duration-150`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`pill pill-${accent}`}>{isLearn ? "Learn" : "Invest"}</span>
          <time className="text-xs text-muted">{dateStr}</time>
        </div>
        <h3 className={`font-semibold text-sm mb-1 group-hover:text-${accent} transition-colors`}>
          {result.title}
        </h3>
        {result.snippet && (
          <p className="text-xs text-muted leading-relaxed line-clamp-3">
            {highlight(result.snippet)}
          </p>
        )}
      </article>
    </Link>
  );
}
