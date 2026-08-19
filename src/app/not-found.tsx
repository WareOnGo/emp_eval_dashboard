import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-xs text-ink-3">404</p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">Page not found</h1>
      <p className="mt-2 max-w-sm text-[13px] text-ink-2">
        That employee or page does not exist in the current dataset.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md border border-line px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
      >
        Back to overview
      </Link>
    </div>
  );
}
