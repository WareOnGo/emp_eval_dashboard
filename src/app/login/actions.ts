"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  expectedSessionToken,
  safeEqual,
  tokenForPassword,
} from "@/lib/auth";

/** Only allow relative in-app paths, so `next` can't be used as an open redirect. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signIn(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const expected = await expectedSessionToken();
  if (expected === null) redirect("/login?error=unconfigured");

  const candidate = await tokenForPassword(password);
  if (!safeEqual(candidate, expected)) {
    redirect(`/login?error=invalid${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(next);
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
