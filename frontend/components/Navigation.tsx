"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/archive", label: "Archive" },
  { href: "/",        label: "Today"   },
  { href: "/search",  label: "Search"  },
];

export default function Navigation() {
  const path = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-2xl mx-auto flex items-end">
        {LINKS.map((link, i) => {
          const isCenter = i === 1;
          const active   =
            link.href === "/" ? path === "/" : path.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              style={isCenter ? { transform: "translateY(-10px)" } : undefined}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors duration-150 select-none ${
                active ? "text-learn" : "text-muted hover:text-dim"
              }`}
            >
              {isCenter && (
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-colors duration-150 ${
                    active ? "bg-learn text-white" : "bg-surface border border-border text-dim"
                  }`}
                >
                  A
                </span>
              )}
              <span
                className={`text-[10px] font-semibold tracking-wider uppercase transition-colors duration-150 ${
                  active ? "text-learn" : "text-muted"
                }`}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
