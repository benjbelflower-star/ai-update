import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import uuid
from pathlib import Path

CHARTS_DIR: Path | None = None  # Set from database module at runtime

PALETTE = {
    "learn":  ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#4f46e5"],
    "invest": ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#059669"],
    "bg":     "#13131a",
    "text":   "#e2e8f0",
    "grid":   "#1e1e2e",
}


def _get_charts_dir() -> Path:
    if CHARTS_DIR is not None:
        return CHARTS_DIR
    from .database import CHARTS_DIR as _CD
    return _CD


def _apply_style(fig, ax, report_type: str):
    fig.patch.set_facecolor(PALETTE["bg"])
    ax.set_facecolor(PALETTE["bg"])
    ax.tick_params(colors=PALETTE["text"], labelsize=9)
    for spine in ["bottom", "left"]:
        ax.spines[spine].set_color(PALETTE["grid"])
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.yaxis.grid(True, color=PALETTE["grid"], linewidth=0.5, alpha=0.7)
    ax.set_axisbelow(True)
    ax.title.set_color(PALETTE["text"])
    ax.xaxis.label.set_color(PALETTE["text"])
    ax.yaxis.label.set_color(PALETTE["text"])


def generate_chart(chart_req: dict, report_type: str = "learn") -> str | None:
    try:
        ctype  = chart_req.get("type", "bar")
        title  = chart_req.get("title", "")
        xlabel = chart_req.get("x_label", "")
        ylabel = chart_req.get("y_label", "")
        data   = chart_req.get("data", {})
        labels = data.get("labels", [])
        values = data.get("values", [])

        if not labels or not values or len(labels) != len(values):
            return None

        # Coerce values to float
        values = [float(v) for v in values]
        colors = (PALETTE[report_type] * 10)[:len(labels)]

        fig, ax = plt.subplots(figsize=(7, 3.8))
        _apply_style(fig, ax, report_type)

        if ctype == "bar":
            bars = ax.bar(labels, values, color=colors, edgecolor="none", width=0.6)
            for bar, val in zip(bars, values):
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + max(values) * 0.015,
                    f"{val:g}", ha="center", va="bottom",
                    color=PALETTE["text"], fontsize=8, fontweight="bold"
                )
            ax.set_xticklabels(labels, rotation=30 if len(labels) > 4 else 0, ha="right")

        elif ctype == "line":
            ax.plot(labels, values, color=colors[0], linewidth=2.5, marker="o",
                    markersize=5, markerfacecolor=colors[1], zorder=3)
            ax.fill_between(range(len(labels)), values, alpha=0.12, color=colors[0])
            ax.set_xticks(range(len(labels)))
            ax.set_xticklabels(labels, rotation=30 if len(labels) > 4 else 0, ha="right")

        elif ctype == "pie":
            wedge_props = {"edgecolor": PALETTE["bg"], "linewidth": 2}
            ax.pie(
                values, labels=labels, colors=colors,
                autopct="%1.0f%%", pctdistance=0.82,
                wedgeprops=wedge_props,
                textprops={"color": PALETTE["text"], "fontsize": 8}
            )

        ax.set_title(title, pad=10, fontsize=11, fontweight="bold")
        if xlabel and ctype != "pie":
            ax.set_xlabel(xlabel, labelpad=6, fontsize=9)
        if ylabel and ctype != "pie":
            ax.set_ylabel(ylabel, labelpad=6, fontsize=9)

        plt.tight_layout()

        charts_dir = _get_charts_dir()
        charts_dir.mkdir(parents=True, exist_ok=True)
        filename = f"chart_{uuid.uuid4().hex[:12]}.png"
        filepath = charts_dir / filename
        fig.savefig(str(filepath), dpi=150, bbox_inches="tight", facecolor=PALETTE["bg"])
        plt.close(fig)
        return filename

    except Exception as e:
        print(f"[charts] Generation error: {e}")
        plt.close("all")
        return None
