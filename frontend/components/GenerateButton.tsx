"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Props {
  variant?: "header" | "default";
}

export default function GenerateButton({ variant = "default" }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const router = useRouter();

  const handleClick = async () => {
    if (state === "loading") return;
    setState("loading");
    try {
      await api.generateReport();
      setState("done");
      setTimeout(() => { setState("idle"); router.refresh(); }, 2500);
    } catch {
      setState("idle");
    }
  };

  const label =
    state === "loading" ? "Generating..." :
    state === "done"    ? "Started"       :
    "Generate";

  if (variant === "header") {
    return (
      <button
        onClick={handleClick}
        disabled={state !== "idle"}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold
                   px-3.5 py-2 rounded-xl border border-border bg-white text-dim
                   shadow-sm hover:border-learn/40 hover:text-learn hover:bg-learn-dim/40
                   transition-all duration-150 active:scale-95 disabled:opacity-40"
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
      disabled={state !== "idle"}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                 bg-learn text-white text-sm font-semibold
                 shadow-[0_4px_14px_rgba(79,70,229,0.3)]
                 hover:bg-learn/90 active:scale-95 transition-all duration-150 disabled:opacity-50"
    >
      {state === "loading" && (
        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      )}
      {label}
    </button>
  );
}
