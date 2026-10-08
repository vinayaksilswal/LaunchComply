"use client";
import Link from "next/link";
import { useAccount } from "./AccountProvider";
export function InternalWorkspaceGate({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAccount();
  if (loading) return <div role="status" className="p-8 text-sm text-slate-500">Checking account access…</div>;
  if (error) return <div role="alert" className="p-8 text-sm text-rose-700">{error}</div>;
  if (!user?.is_platform_admin) return <div className="max-w-xl mx-auto p-10 space-y-4"><h1 className="text-2xl font-semibold">This is an internal workspace</h1><p className="text-sm text-slate-500">Your applications and business settings are available in your dashboard.</p><Link href="/dashboard" className="text-cyan-700 font-semibold text-sm">Return to your workspace</Link></div>;
  return children;
}
