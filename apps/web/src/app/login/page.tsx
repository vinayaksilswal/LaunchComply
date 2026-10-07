"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi, setAuthToken, setActiveOrganizationId } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const account = await authApi.login({ email, password });
      setAuthToken(account.access_token);
      setActiveOrganizationId(account.organization_id);
      localStorage.setItem("launchcomply_user", JSON.stringify(account));
      router.push("/dashboard");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
        <Link href="/" className="font-bold text-cyan-700">LaunchComply</Link>
        <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
        <form onSubmit={login} className="space-y-4">
          <label className="block text-sm text-slate-700">Email
            <input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" />
          </label>
          <label className="block text-sm text-slate-700">Password
            <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-cyan-700 text-white py-2 font-semibold disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="text-sm text-slate-600">New to LaunchComply? <Link href="/signup" className="text-cyan-700 underline">Create an account</Link></p>
      </div>
    </main>
  );
}
