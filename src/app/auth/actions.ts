"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function signup(formData: FormData) {
  const companyName = String(formData.get("companyName") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!companyName || !fullName || !email || !password) {
    redirect(`/signup?error=${encodeURIComponent("Please fill in all fields.")}`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Stored as "user metadata" on the auth user. A database trigger
      // (see supabase/schema.sql) reads this to create the company and
      // profile rows automatically.
      data: { company_name: companyName, full_name: fullName },
      emailRedirectTo: `${SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");

  // If email confirmation is switched on in Supabase, there's no session
  // yet — send them to a "check your email" screen. If it's switched off,
  // Supabase returns a session immediately and we can go straight in.
  if (!data.session) {
    redirect("/signup/check-email");
  }

  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Please enter your email and password.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// Actually consumes the token from a signup-confirmation or password-reset
// email link — but only when THIS runs, not when the /auth/confirm page
// itself merely loads. That split matters: many email providers (Gmail,
// Outlook/Microsoft Defender Safe Links, iOS Mail's Privacy Protection)
// automatically "visit" links in emails to scan them for safety before a
// person ever clicks them. A one-time token consumed by a plain page load
// gets silently burned by that scan, so the real click then fails with
// "invalid or expired" — even though nothing was actually wrong. Requiring
// an explicit button click (a real form submission, which scanners don't
// do) means only a genuine visit ever consumes the token.
export async function confirmEmailLink(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") || "");
  const type = String(formData.get("type") || "") as EmailOtpType;

  const invalidLinkError = `/login?error=${encodeURIComponent(
    "That confirmation link is invalid or has expired."
  )}`;

  if (!tokenHash || !type) {
    redirect(invalidLinkError);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    redirect(invalidLinkError);
  }

  revalidatePath("/", "layout");
  redirect(type === "recovery" ? "/reset-password" : "/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("Please enter your email.")}`);
  }

  const supabase = await createClient();

  // Deliberately ignoring any error here and always sending people to the
  // same "check your email" screen either way — Supabase itself doesn't
  // report whether the email matched an account, and neither should this
  // page. Otherwise the form becomes a way to check who has an account.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/confirm`,
  });

  redirect("/forgot-password/check-email");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!password || password.length < 6) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Password must be at least 6 characters.")}`
    );
  }
  if (password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords don't match.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
