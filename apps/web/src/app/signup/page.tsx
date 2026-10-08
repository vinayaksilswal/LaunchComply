"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL, ApiError, authApi, setAuthToken, setActiveOrganizationId } from "@/lib/api";
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  Building2,
  User,
  Sparkles
} from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") || "GROWTH";
  const inviteToken = searchParams.get("invite_token") || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await authApi.register({
          full_name: fullName,
          email: email,
          password: password,
          organization_name: orgName || `${fullName}'s Organization`
      });
      setAuthToken(data.access_token);
      setActiveOrganizationId(data.organization_id);
      localStorage.setItem("launchcomply_user", JSON.stringify(data));

      // If invite token present, accept it
      if (inviteToken) {
        const invitationResponse = await fetch(`${API_BASE_URL}/commercial/invitations/accept`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${data.access_token}`
          },
          body: JSON.stringify({ token: inviteToken })
        });
        if (!invitationResponse.ok) {
          throw new Error("Your account was created, but the invitation could not be accepted. Please ask your team for a new invitation.");
        }
        const invitation = await invitationResponse.json();
        setActiveOrganizationId(invitation.organization_id);
      }

      router.push("/onboarding");
    } catch (err: unknown) {
      setErrorMsg(err instanceof ApiError && (err.status >= 500 || err.status === 408 || err.status === 0)
        ? "We could not confirm account creation. Please try signing in before submitting again."
        : err instanceof Error ? err.message : "Unable to create your account. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-center items-center p-6 relative">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <span className="font-bold text-xl text-slate-950 tracking-tight">LaunchComply</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-950 tracking-tight">Create your enterprise account</h1>
          <p className="text-xs text-slate-500">
            {inviteToken ? "Join your team workspace on LaunchComply." : "Start your 14-day free trial. No card required."}
          </p>
        </div>

        {errorMsg && (
          <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Signup Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Alex Mercer"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="alex@acmecloud.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {!inviteToken && (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company / Organization Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="AcmeCloud Technologies"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {!inviteToken && (
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Initial Plan Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {["STARTER", "GROWTH", "BUSINESS"].map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSelectedPlan(tier)}
                      className={`p-2 rounded-lg border text-center text-xs font-bold transition-all ${
                        selectedPlan === tier
                          ? "bg-cyan-50 border-cyan-500 text-cyan-800 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? "Connecting and creating your account…" : "Start 14-Day Free Trial"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-700 font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-slate-500">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
