"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenParam);
  const [status, setStatus] = useState<"IDLE" | "VERIFYING" | "SUCCESS" | "ERROR">("IDLE");
  const [message, setMessage] = useState("");

  const handleVerify = async (tokenToUse: string) => {
    if (!tokenToUse) return;
    setStatus("VERIFYING");
    try {
      const res = await fetch(`${API_BASE_URL}/commercial/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToUse })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Invalid or expired token.");
      }
      setStatus("SUCCESS");
      setMessage("Your work email address has been confirmed successfully.");
    } catch (err: any) {
      setStatus("ERROR");
      setMessage(err.message);
    }
  };

  useEffect(() => {
    if (tokenParam) {
      handleVerify(tokenParam);
    }
  }, [tokenParam]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <span className="font-bold text-xl text-slate-950 tracking-tight">LaunchComply</span>
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4">
          <h1 className="text-xl font-bold text-slate-950">Email Address Verification</h1>

          {status === "SUCCESS" ? (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="text-xs text-slate-600">{message}</p>
              <Link
                href="/dashboard"
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : status === "ERROR" ? (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <p className="text-xs text-rose-700">{message}</p>
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Paste verification token..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 mb-2 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleVerify(token)}
                  className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  Retry Verification
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Please enter the one-time verification token dispatched to your email address:
              </p>
              <input
                type="text"
                placeholder="Paste verification token..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => handleVerify(token)}
                disabled={status === "VERIFYING"}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              >
                <span>{status === "VERIFYING" ? "Verifying Token..." : "Verify Work Email"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-slate-500">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
