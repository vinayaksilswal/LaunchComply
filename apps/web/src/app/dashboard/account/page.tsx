"use client";

import { useState } from "react";
import {
  Building2,
  ShieldCheck,
  Lock,
  Mail,
  CheckCircle2,
  Key,
  Globe,
  MapPin,
  Save,
  Sparkles
} from "lucide-react";

export default function AccountPage() {
  const [legalName, setLegalName] = useState("AcmeCloud Technologies Private Limited");
  const [website, setWebsite] = useState("https://acmecloud.io");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Karnataka");
  const [gstin, setGstin] = useState("29AABCA1234F1Z5");
  const [pan, setPan] = useState("AABCA1234F");
  const [billingEmail, setBillingEmail] = useState("billing@acmecloud.io");
  const [securityEmail, setSecurityEmail] = useState("security@acmecloud.io");
  const [isMfaActive, setIsMfaActive] = useState(true);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveNotice("Organization legal and tax profile saved successfully.");
    setTimeout(() => setSaveNotice(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Organization Business & Tax Identity</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Organization Profile & Security</h1>
          <p className="text-sm text-slate-400 mt-1">
            Maintain statutory business registration, GST invoice details, and account authentication policies.
          </p>
        </div>
      </div>

      {saveNotice && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-sm font-bold text-white">Commercial & Tax Identity</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Appears on official B2B tax invoices, bilateral DPAs, and customer audit packs.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Registered Legal Entity Name</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Corporate Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">GSTIN (India)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Corporate PAN</label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">State / Province</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Billing & Invoicing Email</label>
              <input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Security & Incident Contact Email</label>
              <input
                type="email"
                value={securityEmail}
                onChange={(e) => setSecurityEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & MFA Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Authentication & Security Policies</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Two-Factor Authentication (TOTP) and privileged session enforcement.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ENFORCED
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">Authenticator App (TOTP)</div>
              <div className="text-slate-400 text-[11px]">Configured via Google Authenticator / 1Password</div>
            </div>
          </div>
          <button
            onClick={() => alert("MFA backup codes regenerated and displayed securely.")}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Manage Backup Codes
          </button>
        </div>
      </div>
    </div>
  );
}
