import type { Metadata } from "next";
import { isPasswordConfigured } from "@/lib/auth";
import { signIn } from "./actions";

export const metadata: Metadata = {
  title: "Sign in",
};

const MESSAGES: Record<string, string> = {
  invalid: "That password is not correct.",
  unconfigured: "DASHBOARD_PASSWORD is not set on the server, so sign-in is unavailable.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? MESSAGES[params.error] : undefined;
  const next = typeof params.next === "string" ? params.next : "/";
  const configured = isPasswordConfigured();

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-series text-xs font-semibold text-plane">
            W
          </span>
          <span className="text-[13px] font-semibold tracking-tight text-ink">Wareongo</span>
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink">Evaluation dashboard</h1>
        <p className="mt-2 text-[13px] text-ink-2">
          This dashboard holds employee performance data. Enter the shared password to continue.
        </p>

        <form action={signIn} className="mt-6 space-y-3">
          <input type="hidden" name="next" value={next} />

          <div>
            <label htmlFor="password" className="block text-xs text-ink-3">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              aria-describedby={error ? "signin-error" : undefined}
              className="mt-1.5 w-full rounded-md border border-line bg-card px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-series focus:outline-none focus:ring-1 focus:ring-series"
            />
          </div>

          {error ? (
            <p id="signin-error" role="alert" className="flex items-baseline gap-1.5 text-xs text-bad">
              <span aria-hidden className="text-[9px]">
                ▲
              </span>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!configured}
            className="w-full rounded-md bg-series px-3 py-2 text-[13px] font-medium text-plane transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
