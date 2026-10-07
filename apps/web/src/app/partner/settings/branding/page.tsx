"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Palette,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Upload,
  Eye,
  ShieldCheck,
  Building2,
  Mail,
  FileText,
} from "lucide-react";

export default function PartnerBrandingPage() {
  const [brandName, setBrandName] = useState("SecureOps Compliance Cloud");
  const [logoUrl, setLogoUrl] = useState("https://cdn.secureops.example/logo.svg");
  const [accentColor, setAccentColor] = useState("#06B6D4");
  const [loginMessage, setLoginMessage] = useState("Welcome to SecureOps Managed Compliance & VAPT Assurance Portal.");
  const [supportEmail, setSupportEmail] = useState("assurance@secureops.example");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/partner" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Partner Control Plane
        </Link>
        <span>/</span>
        <span className="text-white font-medium">White-Label Branding Suite</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            MSP White-Label Branding Studio
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Premier MSP Entitlement
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deliver LaunchComply&apos;s continuous assurance platform under your consultancy or MSP brand identity.
          </p>
        </div>

        <Link
          href="/partner/settings/domain"
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition text-slate-200"
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          Configure Vanity Domain →
        </Link>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>White-label brand attributes and portal styling updated successfully!</span>
        </div>
      )}

      {/* 2-Column: Config Form vs Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Configuration Form */}
        <form onSubmit={handleSave} className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            Portal Appearance Settings
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Brand / Consultancy Name</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Logo Image Asset URL</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Primary Accent Theme Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono text-xs w-36 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Custom Customer Login Greeting</label>
              <textarea
                rows={2}
                value={loginMessage}
                onChange={(e) => setLoginMessage(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Dedicated Support Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5">
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-cyan-500/20 transition"
            >
              Save White-Label Branding Changes
            </button>
          </div>
        </form>

        {/* Right: Live Interactive Visual Preview */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              Live Branded Portal Header Preview
            </h3>

            {/* Mock Navigation Bar */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: accentColor }}
                >
                  S
                </div>
                <span className="font-bold text-sm text-white">{brandName}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Managed Customer: AcmeCloud</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  MSP PARTNER MODE
                </span>
              </div>
            </div>

            {/* Mock Login Card Preview */}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-cyan-400" />
              Customer Login Greeting Preview
            </h3>
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-lg text-center space-y-3">
              <div
                className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center text-white text-base font-bold shadow-lg"
                style={{ backgroundColor: accentColor }}
              >
                S
              </div>
              <h4 className="text-sm font-bold text-white">{brandName}</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">{loginMessage}</p>
              <p className="text-[11px] text-slate-500">Support: {supportEmail}</p>
            </div>

            {/* Internal Platform Identity Note */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-300 block mb-0.5">Audit Integrity Protection:</span>
              While visual styling and portal routing are white-labeled, underlying cryptographically sealed audit events and compliance evidence records retain authentic system provenance tags.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
