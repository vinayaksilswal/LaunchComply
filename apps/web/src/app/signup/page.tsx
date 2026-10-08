"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import {
  API_BASE_URL,
  ApiError,
  authApi,
  setAuthToken,
  setActiveOrganizationId,
} from "@/lib/api";
import { safeDestination } from "@/lib/auth-destination.mjs";
import { AuthShell } from "@/components/marketing/AuthShell";

function SignupForm() {
  const router = useRouter();
  const search = useSearchParams();
  const destination = safeDestination(search.get("next"), "/onboarding");
  const inviteToken = search.get("invite_token") || "";
  const loginQuery = new URLSearchParams();
  if (search.get("next")) loginQuery.set("next", destination);
  if (inviteToken) loginQuery.set("invite_token", inviteToken);
  const login = `/login${loginQuery.size ? `?${loginQuery}` : ""}`;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const locked = busy || created || !mounted;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (created) return;
    setBusy(true);
    setError(null);
    try {
      const account = await authApi.register({
        full_name: fullName,
        email,
        password,
        organization_name: orgName || `${fullName}'s Organization`,
      });
      setAuthToken(account.access_token);
      setActiveOrganizationId(account.organization_id);
      localStorage.setItem("launchcomply_user", JSON.stringify(account));
      setCreated(true);
      if (inviteToken) {
        const response = await fetch(
          `${API_BASE_URL}/commercial/invitations/accept`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${account.access_token}`,
            },
            body: JSON.stringify({ token: inviteToken }),
          },
        );
        if (!response.ok)
          throw new Error(
            "Your account was created, but the invitation could not be accepted. Please ask your team for a new invitation.",
          );
        setActiveOrganizationId((await response.json()).organization_id);
      }
      router.push(
        inviteToken && !search.get("next") ? "/dashboard" : destination,
      );
    } catch (failure) {
      setError(
        failure instanceof ApiError &&
          (failure.status >= 500 ||
            failure.status === 408 ||
            failure.status === 0)
          ? "We could not confirm account creation. Please try signing in before submitting again."
          : failure instanceof Error
            ? failure.message
            : "Unable to create your account. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const inputClass =
    "mt-2 block w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base disabled:bg-slate-50";
  return (
    <AuthShell mode="signup">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Create your workspace
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        {inviteToken
          ? "Create your account to accept a team invitation."
          : "Start with your business. No payment details required."}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="signup-name"
            className="text-sm font-medium text-slate-700"
          >
            Full name
          </label>
          <input
            id="signup-name"
            autoComplete="name"
            required
            maxLength={150}
            disabled={locked}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="signup-email"
            className="text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            disabled={locked}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="signup-password"
            className="text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={locked}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="password-help"
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              disabled={locked}
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible((value) => !value)}
              className="absolute right-2 top-2 rounded-lg p-2 text-slate-400"
            >
              {visible ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          <p id="password-help" className="mt-2 text-xs text-slate-500">
            Use at least 8 characters.
          </p>
        </div>
        {!inviteToken && (
          <div>
            <label
              htmlFor="signup-business"
              className="text-sm font-medium text-slate-700"
            >
              Business name
            </label>
            <input
              id="signup-business"
              autoComplete="organization"
              required
              maxLength={200}
              disabled={locked}
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              className={inputClass}
            />
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"
          >
            <p>{error}</p>
            <Link
              href={created ? "/dashboard" : login}
              className="mt-2 inline-block font-semibold underline"
            >
              {created ? "Continue to your workspace" : "Try signing in"}
            </Link>
          </div>
        )}
        <button
          type="submit"
          disabled={locked}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating your account…
            </>
          ) : (
            <>
              Create workspace
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-500">
        Already have an account?{" "}
        <Link href={login} className="font-semibold text-cyan-700">
          Sign In
        </Link>
      </p>
    </AuthShell>
  );
}
export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="p-10 text-sm text-slate-500">
          Loading account setup…
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
