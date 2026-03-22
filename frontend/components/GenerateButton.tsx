"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Props {
  variant?: "header" | "default";
}

export default function GenerateButton({ variant = "default" }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const router = useRouter();

  const handleClick = async () => {
    if (state === "loading") return;
    setState("loading");
    try {
      await api.generateReport();
      setState("done");
      setTimeout(() => { setState("idle"); router.refresh(); }, 2500);
    } catch (err) {
      console.error("[GenerateButton] failed:", err);
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const label =
    state === "loading" ? "Generating..." :
    state === "done"    ? "Started"       :
    state === "error"   ? "Failed — retry?" :
    "Generate";

  if (variant === "header") {
    return (
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold
                   px-3.5 py-2 rounded-xl border shadow-sm
                   transition-all duration-150 active:scale-95 disabled:opacity-50 ${
          state === "error"
            ? "border-danger/40 bg-danger/5 text-danger"
            : state === "done"
            ? "border-invest/40 bg-invest-dim text-invest"
            : "border-border bg-white text-dim hover:border-learn/40 hover:text-learn hover:bg-learn-dim/40"
        }`}
      >
        {state === "loading" && (
          <span className="w-3 h-3 border-[1.5px] border-learn border-t-transparent rounded-full animate-spin" />
        )}
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                 text-sm font-semibold transition-all duration-150
                 active:scale-95 disabled:opacity-50 ${
        state === "error"
          ? "bg-danger text-white"
          : "bg-learn text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:bg-learn/90"
      }`}
    >
      {state === "loading" && (
        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      )}
      {label}
    </button>
  );
}
