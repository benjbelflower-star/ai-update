"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href:  "/archive",
    label: "Archive",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    href:  "/",
    label: "Today",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
  },
  {
    href:  "/search",
    label: "Search",
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
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

          if (isCenter) {
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{ transform: "translateY(-14px)" }}
                className="flex-1 flex flex-col items-center gap-1.5 select-none"
              >
                <span
                  className={`w-13 h-13 w-[52px] h-[52px] rounded-full flex items-center justify-center
                               shadow-lg transition-all duration-200 ${
                    active
                      ? "bg-learn text-white shadow-learn/25"
                      : "bg-surface border border-border text-muted hover:border-learn/50 hover:text-learn"
                  }`}
                >
                  {link.icon}
                </span>
                <span
                  className={`text-[9px] font-bold tracking-widest uppercase transition-colors ${
                    active ? "text-learn" : "text-muted"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center justify-center py-4 gap-1.5
                          transition-colors duration-150 select-none ${
                active ? "text-learn" : "text-muted hover:text-dim"
              }`}
            >
              {link.icon}
              <span className="text-[9px] font-bold tracking-widest uppercase">
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
