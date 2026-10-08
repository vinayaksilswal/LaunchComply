"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import {
  apiClient,
  authApi,
  setAuthToken,
  setActiveOrganizationId,
} from "@/lib/api";
import { safeDestination } from "@/lib/auth-destination.mjs";
import { AuthShell } from "@/components/marketing/AuthShell";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const destination = safeDestination(search.get("next"));
  const inviteToken = search.get("invite_token") || "";
  const signupQuery = new URLSearchParams();
  if (search.get("next")) signupQuery.set("next", destination);
  if (inviteToken) signupQuery.set("invite_token", inviteToken);
  const signup = `/signup${signupQuery.size ? `?${signupQuery}` : ""}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const account = await authApi.login({ email, password });
      setAuthToken(account.access_token);
      setActiveOrganizationId(account.organization_id);
      localStorage.setItem("launchcomply_user", JSON.stringify(account));
      if (inviteToken) {
        const invitation = await apiClient<{ organization_id: string }>(
          "/commercial/invitations/accept",
          {
            method: "POST",
            body: JSON.stringify({ token: inviteToken }),
          },
        );
        setActiveOrganizationId(invitation.organization_id);
      }
      router.push(destination);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell mode="login">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        Sign in
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        Continue to your business workspace.
      </p>
      <form onSubmit={login} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="login-email"
            className="text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            disabled={busy || !mounted}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 block w-full rounded-xl border border-slate-300 px-3.5 py-3 text-base"
          />
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <div className="relative mt-2">
            <input
              id="login-password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={busy || !mounted}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="block w-full rounded-xl border border-slate-300 px-3.5 py-3 pr-12 text-base"
            />
            <button
              type="button"
              disabled={busy || !mounted}
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
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !mounted}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-500">
        New to LaunchComply?{" "}
        <Link href={signup} className="font-semibold text-cyan-700">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="p-10 text-sm text-slate-500">
          Loading sign-in…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
