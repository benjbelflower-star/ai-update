/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:          "#0a0a0f",
        surface:     "#13131a",
        "surface-2": "#1a1a27",
        border:      "#1e1e2e",
        muted:       "#64748b",
        dim:         "#94a3b8",
        primary:     "#e2e8f0",
        learn:       "#6366f1",
        "learn-dim": "#312e81",
        invest:      "#10b981",
        "invest-dim":"#064e3b",
        accent:      "#f59e0b",
        danger:      "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in":  "fadeIn 0.25s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "bar1":     "audioBar 0.9s ease-in-out infinite",
        "bar2":     "audioBar 0.9s ease-in-out 0.2s infinite",
        "bar3":     "audioBar 0.9s ease-in-out 0.4s infinite",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        audioBar: {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%":      { transform: "scaleY(1)" },
        },
      },
    },
  },
  plugins: [],
};
