"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

const LINKS = [
  { href: "/", label: "Company" },
  { href: "/employees", label: "Employees" },
  { href: "/data-quality", label: "Data quality" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-col gap-6 border-line px-5 py-5 md:sticky md:top-0 md:h-dvh md:w-56 md:border-r">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-md bg-series text-xs font-semibold text-plane">
          W
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-ink">Wareongo</span>
      </Link>

      <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {LINKS.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                active ? "bg-inset text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-line pt-4 md:block">
        <p className="text-xs leading-relaxed text-ink-3">
          Per-employee figures cover active employees only. Company totals cover all history.
        </p>
        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="text-xs text-ink-3 transition-colors hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
