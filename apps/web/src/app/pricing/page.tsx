"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Shield,
  Layers,
  FileCheck2,
  Lock,
  Building2,
  Server,
  X
} from "lucide-react";
import { crmApi } from "@/lib/api/modules";

export default function PricingPage() {
  const [interval, setInterval] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoForm, setDemoForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    use_case: "SaaS Production Readiness",
    company_size: "11-50",
    desired_compliance: "ISO 27001 / SOC 2"
  });

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.name || !demoForm.email || !demoForm.company) return;
    try {
      setDemoLoading(true);
      await crmApi.submitDemoRequest({
        ...demoForm,
        source: "BOOK_DEMO_PRICING",
      });
      setDemoSubmitted(true);
    } catch (err) {
      console.error("Failed to submit demo request:", err);
      alert("Failed to submit demo request. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  const plans = [
    {
      tier: "STARTER",
      name: "Starter",
      tagline: "For early startups deploying their first production application.",
      priceINR: interval === "MONTHLY" ? "₹4,999" : "₹4,166",
      priceUSD: interval === "MONTHLY" ? "$59" : "$49",
      billingNote: interval === "ANNUAL" ? "billed annually (₹49,990/yr)" : "billed monthly",
      badge: null,
      highlight: false,
      features: [
        "1 Connected Application",
        "1 Production AWS Environment",
        "Up to 3 Team Members",
        "10 Monthly Automated Security Scans",
        "IaC Architecture Generator",
        "Standard CloudWatch Monitoring",
        "Community & Email Support",
        "30-Day Evidence Retention"
      ],
      ctaText: "Start 14-Day Free Trial",
      ctaHref: "/signup?plan=STARTER"
    },
    {
      tier: "GROWTH",
      name: "Growth",
      tagline: "For scaling cloud teams requiring continuous security & DR.",
      priceINR: interval === "MONTHLY" ? "₹19,999" : "₹16,666",
      priceUSD: interval === "MONTHLY" ? "$249" : "$208",
      billingNote: interval === "ANNUAL" ? "billed annually (₹1,99,990/yr)" : "billed monthly",
      badge: "MOST POPULAR",
      highlight: true,
      features: [
        "5 Connected Applications",
        "3 Environments (Dev, Staging, Prod)",
        "Up to 15 Team Members",
        "100 Monthly Security Scans",
        "1 Professional VAPT Engagement Scope",
        "Continuous Multi-Region DR Restore Drills",
        "Public Trust Center Profile",
        "ISO 27001 & SOC 2 Readiness Workspaces",
        "India DPDP Privacy Operations",
        "Standard 8-Hour SLA Support"
      ],
      ctaText: "Start 14-Day Free Trial",
      ctaHref: "/signup?plan=GROWTH"
    },
    {
      tier: "BUSINESS",
      name: "Business",
      tagline: "For mature SaaS teams selling to enterprise & regulated buyers.",
      priceINR: interval === "MONTHLY" ? "₹49,999" : "₹41,666",
      priceUSD: interval === "MONTHLY" ? "$649" : "$541",
      billingNote: interval === "ANNUAL" ? "billed annually (₹4,99,990/yr)" : "billed monthly",
      badge: "ENTERPRISE READY",
      highlight: false,
      features: [
        "20 Connected Applications",
        "10 Environments",
        "Up to 50 Team Members",
        "500 Monthly Security Scans",
        "4 Professional VAPT Scopes / Year",
        "Auditor Portal with Scoped Grants",
        "Immutable Audit Package Generator",
        "Vendor & Subprocessor Risk Center",
        "Centralized CAPA & Management Review",
        "Priority 2-Hour SLA Support"
      ],
      ctaText: "Start 14-Day Free Trial",
      ctaHref: "/signup?plan=BUSINESS"
    },
    {
      tier: "ENTERPRISE",
      name: "Enterprise",
      tagline: "Custom architecture limits, dedicated advisory, and custom paper.",
      priceINR: "Custom",
      priceUSD: "Custom",
      billingNote: "Annual contract with PO / invoice terms",
      badge: "BESPOKE",
      highlight: false,
      features: [
        "100+ Applications & Microservices",
        "Custom Multi-Account AWS Enclaves",
        "Unlimited Team Members & RBAC",
        "10,000+ Automated Scans",
        "Dedicated Lead Security Consultant",
        "24x7 Critical 30-Min SLA Support",
        "Bespoke MSA, DPA & Security Addendum",
        "5-Year Evidence Retention Hold",
        "Invoice-Only (GST B2B) Billing"
      ],
      ctaText: "Contact Advisory Sales",
      ctaHref: "/signup?plan=ENTERPRISE"
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="font-bold text-lg text-slate-950 tracking-tight">LaunchComply</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <Link href="/" className="hover:text-slate-950 transition-colors">Overview</Link>
            <Link href="/dashboard" className="hover:text-slate-950 transition-colors">Platform</Link>
            <Link href="/status" className="hover:text-slate-950 transition-colors">System Status</Link>
            <Link href="/pricing" className="text-cyan-700 font-bold">Pricing</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-xs font-bold px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-600/20 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>Commercial SaaS Operating System</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
            Transparent Pricing for Real Cloud Businesses
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            From single-application launch to enterprise compliance management. Every tier includes automated AWS infrastructure provisioning, security assurance, and continuous evidence collection.
          </p>

          {/* Toggles: Monthly/Annual and Currency */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-1 flex items-center shadow-xs">
              <button
                onClick={() => setInterval("MONTHLY")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  interval === "MONTHLY" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval("ANNUAL")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  interval === "ANNUAL" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-200">
                  SAVE 17%
                </span>
              </button>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-xl p-1 flex items-center text-xs font-bold shadow-xs">
              <button
                onClick={() => setCurrency("INR")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  currency === "INR" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                INR (₹)
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  currency === "USD" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => {
            const price = currency === "INR" ? p.priceINR : p.priceUSD;
            return (
              <div
                key={p.tier}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative ${
                  p.highlight
                    ? "bg-white border-2 border-cyan-500 shadow-xl shadow-cyan-500/10"
                    : "bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-600 text-white shadow-sm">
                    {p.badge}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[32px] leading-relaxed">
                    {p.tagline}
                  </p>

                  <div className="mt-4 pb-4 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-950 tracking-tight">{price}</span>
                      {price !== "Custom" && <span className="text-xs text-slate-500">/month</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{p.billingNote}</div>
                  </div>

                  <div className="mt-5 space-y-2.5 text-xs text-slate-700">
                    <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                      Included Capabilities
                    </div>
                    {p.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <Link
                    href={p.ctaHref}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      p.highlight
                        ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    <span>{p.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Book Demo Guided CTA Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-slate-950">
              Need a Customized Scope or White-Glove Pilot?
            </h3>
            <p className="text-xs text-slate-600 max-w-lg">
              Book a 20-minute live demonstration. We&apos;ll inspect your stack, estimate your AWS topology, and scope your ISO 27001 / SOC 2 timeline.
            </p>
          </div>
          <button
            onClick={() => {
              setShowDemoModal(true);
              setDemoSubmitted(false);
            }}
            className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 whitespace-nowrap transition-all"
          >
            Book a 20-Min Demo
          </button>
        </div>

        {/* Safety & Compliance Disclaimer Notice */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 max-w-4xl mx-auto space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-cyan-700 font-bold uppercase tracking-wider text-[11px]">
            <Shield className="w-4 h-4 text-cyan-600" />
            <span>LaunchComply Commercial & Legal Safeguards</span>
          </div>
          <p className="leading-relaxed">
            LaunchComply operates the customer’s cloud infrastructure, security testing, and compliance readiness program. LaunchComply provides automated technical evidence and auditor workspaces. LaunchComply does not independently confer accredited ISO 27001 or SOC 2 certifications; formal certifications require an independent external audit from an accredited registrar.
          </p>
        </div>
      </main>

      {/* Book Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950">
                Book a 20-Minute Product Demo
              </h3>
              <button
                onClick={() => setShowDemoModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {demoSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-base font-bold text-slate-950">Demo Request Received</h4>
                <p className="text-xs text-slate-600">
                  Our commercial sales lead will reach out to <strong className="text-cyan-700">{demoForm.email}</strong> within 4 business hours with calendar availability.
                </p>
                <button
                  onClick={() => setShowDemoModal(false)}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-semibold text-white"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={demoForm.name}
                    onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                    placeholder="Aditya Sharma"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={demoForm.email}
                    onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                    placeholder="aditya@company.com"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={demoForm.company}
                    onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                    placeholder="Acme Technologies"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Team Size</label>
                    <select
                      value={demoForm.company_size}
                      onChange={(e) => setDemoForm({ ...demoForm, company_size: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none"
                    >
                      <option value="1-10">1 - 10</option>
                      <option value="11-50">11 - 50</option>
                      <option value="51-200">51 - 200</option>
                      <option value="201+">201+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Target Compliance</label>
                    <select
                      value={demoForm.desired_compliance}
                      onChange={(e) => setDemoForm({ ...demoForm, desired_compliance: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none"
                    >
                      <option value="ISO 27001 / SOC 2">ISO 27001 & SOC 2</option>
                      <option value="AWS Production IaC">AWS Production IaC</option>
                      <option value="VAPT Engagement">VAPT Retainer</option>
                      <option value="DPDP Privacy">India DPDP Privacy</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={demoLoading}
                    className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {demoLoading ? "Logging Demo Request..." : "Request 20-Min Demo"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 bg-white">
        <p>© 2026 LaunchComply Technologies Private Limited. All rights reserved.</p>
        <p className="mt-1">Deploy. Secure. Audit. Comply. • Built for SaaS businesses worldwide.</p>
      </footer>
    </div>
  );
}
