"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Building2, UserRound, ShieldCheck, Save, RefreshCw } from "lucide-react";
import { useAccount } from "@/components/auth/AccountProvider";
import { apiClient } from "@/lib/api";
export function AccountDetails() {
  const { user, organization, refreshAccount, loading } = useAccount();
  const [businessName, setBusinessName] = useState(""), [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const scope = useRef(organization?.id); scope.current = organization?.id;
  useEffect(() => { setBusinessName(organization?.name || ""); setFullName(user?.full_name || ""); setError(""); setNotice(""); }, [organization?.id, organization?.name, user?.full_name]);
  const manageBusiness = ["OWNER", "ADMIN"].includes(organization?.role.toUpperCase() || "");
  async function save(kind: "business" | "profile") {
    if (!organization || !user) return;
    const organizationId = organization.id;
    setBusy(kind); setError(""); setNotice("");
    try {
      await apiClient(`/workspace-records/account/${kind}`, { method: "PATCH", body: JSON.stringify(kind === "business" ? { name: businessName.trim(), expected_name: organization.name } : { full_name: fullName.trim(), expected_name: user.full_name }) });
      if (scope.current === organizationId) { setNotice("Changes saved."); refreshAccount(); }
    } catch (failure) { if (scope.current === organizationId) setError(failure instanceof Error ? failure.message : "Changes could not be saved."); }
    finally { setBusy(""); }
  }
  return <div className="mx-auto max-w-4xl space-y-6 p-6 sm:p-8"><header className="flex items-center justify-between gap-3"><h1 className="text-3xl font-semibold tracking-tight">Settings</h1><button onClick={refreshAccount} disabled={loading || !!busy} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-40"><RefreshCw className="h-4 w-4" />Refresh</button></header>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    <form onSubmit={event => { event.preventDefault(); void save("business"); }} className="space-y-4 rounded-xl border p-5"><h2 className="flex items-center gap-2 font-semibold"><Building2 className="h-5 w-5 text-cyan-700" />Business</h2><label className="block text-sm">Business name<input value={businessName} onChange={event => setBusinessName(event.target.value)} disabled={!manageBusiness || !!busy || loading} required minLength={2} maxLength={255} className="mt-2 block w-full rounded-lg border p-2.5 disabled:bg-slate-50" /></label><div className="flex items-center justify-between gap-3"><span className="text-sm capitalize text-slate-500">Your access: {organization?.role.toLowerCase()}</span><button disabled={!manageBusiness || !!busy || loading || businessName.trim().length < 2 || businessName.trim() === organization?.name} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"><Save className="h-4 w-4" />{busy === "business" ? "Saving…" : "Save business"}</button></div></form>
    <form onSubmit={event => { event.preventDefault(); void save("profile"); }} className="space-y-4 rounded-xl border p-5"><h2 className="flex items-center gap-2 font-semibold"><UserRound className="h-5 w-5 text-cyan-700" />Your profile</h2><label className="block text-sm">Full name<input value={fullName} onChange={event => setFullName(event.target.value)} disabled={!!busy || loading} required minLength={2} maxLength={255} className="mt-2 block w-full rounded-lg border p-2.5" /></label><p className="text-sm text-slate-500">Sign-in email: <span className="break-all text-slate-800">{user?.email}</span></p><button disabled={!!busy || loading || fullName.trim().length < 2 || fullName.trim() === user?.full_name} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-40"><Save className="h-4 w-4" />{busy === "profile" ? "Saving…" : "Save profile"}</button></form>
    <section className="space-y-3 rounded-xl border p-5"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-cyan-700" />Account security</h2><Link href="/forgot-password" className="block text-sm font-medium text-cyan-700">Reset password</Link><Link href="/dashboard/settings/security/sso" className="block text-sm font-medium text-cyan-700">SSO configuration records</Link></section>
  </div>;
}
