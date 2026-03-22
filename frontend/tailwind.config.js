/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:          "#f5f7fa",   // soft cool-grey canvas
        surface:     "#ffffff",
        "surface-2": "#eef1f6",
        border:      "#e2e8f0",
        muted:       "#94a3b8",
        dim:         "#64748b",
        primary:     "#0f172a",   // near-black navy
        learn:       "#4f46e5",   // deeper indigo for white-bg contrast
        "learn-dim": "#eef2ff",   // indigo-50
        invest:      "#059669",   // deeper emerald
        "invest-dim":"#ecfdf5",   // emerald-50
        accent:      "#d97706",   // amber-600
        danger:      "#dc2626",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "card":    "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-lg": "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        "nav":     "0 -1px 0 #e2e8f0, 0 -4px 16px rgba(0,0,0,0.04)",
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
