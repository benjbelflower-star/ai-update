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
    state === "done"    ? "Started" :
    "Generate now";

  if (variant === "header") {
    return (
      <button
        onClick={handleClick}
        disabled={state !== "idle"}
        className="btn-ghost disabled:opacity-40"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={state !== "idle"}
      className="px-5 py-2.5 rounded-xl bg-learn text-white text-sm font-semibold
                 hover:bg-learn/90 active:scale-95 transition-all duration-150 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
