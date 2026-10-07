"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import {
  ShieldCheck,
  Rocket,
  Server,
  Terminal,
  ArrowRight,
  CheckCircle2,
  Lock,
  Globe,
  Database,
  Cpu,
  Zap,
  Sparkles,
  FileCheck,
  ChevronRight,
  Building2,
  HardDrive,
  Eye,
  AlertTriangle,
  Briefcase,
  Play
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"localhost" | "production">("production");

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-500 selection:text-white relative">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle background ambient mesh */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[380px] bg-gradient-to-tr from-cyan-100/60 via-teal-50/40 to-blue-100/50 blur-[110px] rounded-full pointer-events-none -z-10" />

        <div className="text-center max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200/80 text-cyan-800 text-xs font-semibold mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>The Enterprise Production & Compliance Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-950 leading-tight">
            From Localhost to <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600">
              Real Business.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-700 font-medium leading-relaxed">
            Deploy, secure, audit and prepare your application for enterprise customers — from one unified platform.
          </p>

          <p className="mt-3 text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Connect your code. Build the right AWS architecture. Deploy to production. Connect your domain. Run security
            assessments. Track VAPT findings. Prepare for privacy and compliance.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="px-6 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-600 hover:from-cyan-500 hover:to-teal-500 rounded-xl shadow-lg shadow-cyan-600/20 hover:shadow-cyan-600/30 transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              Deploy My Application
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3.5 text-sm font-semibold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <Eye className="w-4 h-4 text-cyan-600" />
              Explore Live Demo Dashboard
            </Link>
          </div>

          {/* Status Badges Row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 text-xs font-mono">
            {[
              { label: "LIVE IN PROD", color: "text-emerald-700 border-emerald-200 bg-emerald-50" },
              { label: "SECURE VPC", color: "text-blue-700 border-blue-200 bg-blue-50" },
              { label: "MONITORED", color: "text-cyan-700 border-cyan-200 bg-cyan-50" },
              { label: "BACKED UP & TESTED", color: "text-indigo-700 border-indigo-200 bg-indigo-50" },
              { label: "VAPT TRACKED", color: "text-amber-800 border-amber-200 bg-amber-50" },
              { label: "COMPLIANCE READY", color: "text-teal-700 border-teal-200 bg-teal-50" },
            ].map((badge, i) => (
              <span key={i} className={`px-2.5 py-1 rounded-full border ${badge.color} font-semibold shadow-xs`}>
                ✓ {badge.label}
              </span>
            ))}
          </div>
        </div>

        {/* HERO VISUAL TRANSFORMATION: Localhost vs Production Architecture */}
        <div className="mt-14 max-w-5xl mx-auto relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <button
              onClick={() => setActiveTab("localhost")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "localhost"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <Terminal className="w-4 h-4 text-amber-400" />
              Before: localhost:3000
            </button>
            <div className="text-slate-400 text-xs font-mono">→</div>
            <button
              onClick={() => setActiveTab("production")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "production"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              <Rocket className="w-4 h-4 text-white" />
              After: AWS Enterprise Production (LaunchComply)
            </button>
          </div>

          {activeTab === "localhost" ? (
            /* Localhost Terminal View */
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl font-mono text-xs text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-slate-400 ml-2">bash — localhost:3000</span>
                </div>
                <span className="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                  NOT ENTERPRISE READY
                </span>
              </div>
              <div className="space-y-2 text-slate-300">
                <p className="text-slate-500">$ npm run dev</p>
                <p className="text-emerald-400">Ready in 654ms on http://localhost:3000</p>
                <p className="text-amber-300">⚠ Warning: No SSL / TLS Certificate configured</p>
                <p className="text-rose-400">✕ No multi-tier network isolation (DB exposed on local port 5432)</p>
                <p className="text-rose-400">✕ Zero backup or disaster recovery policy</p>
                <p className="text-rose-400">✕ Secrets in local .env plaintext file</p>
                <p className="text-rose-400">✕ No VAPT or vulnerability assessment</p>
                <p className="text-rose-400">✕ Enterprise procurement compliance missing (DPDP, ISO 27001, SOC 2)</p>
              </div>
            </div>
          ) : (
            /* Production Topology Showcase */
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-900 font-mono uppercase">
                    app.acmecloud.io • ap-south-1 (Mumbai)
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  AUDITED & PRODUCTION HEALTHY (84%)
                </span>
              </div>

              {/* Topology Flow Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-cyan-700 mb-1">Edge & DNS</div>
                  <div className="font-bold text-slate-900">Route 53 + WAF</div>
                  <div className="text-slate-500 text-[11px] mt-1">DDoS & OWASP Shield</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-blue-700 mb-1">CDN & Ingress</div>
                  <div className="font-bold text-slate-900">CloudFront + ALB</div>
                  <div className="text-slate-500 text-[11px] mt-1">Strict TLS 1.3 Terminated</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-indigo-700 mb-1">Compute Tier</div>
                  <div className="font-bold text-slate-900">ECS Fargate Cluster</div>
                  <div className="text-slate-500 text-[11px] mt-1">Private VPC Subnets</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 mb-1">Database & DR</div>
                  <div className="font-bold text-slate-900">RDS PostgreSQL</div>
                  <div className="text-slate-500 text-[11px] mt-1">Multi-AZ & Continuous WAL</div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span>
                    Compliance: <strong className="text-slate-800">DPDP 76%</strong>,{" "}
                    <strong className="text-slate-800">ISO 27001 64%</strong>,{" "}
                    <strong className="text-slate-800">SOC 2 58%</strong>
                  </span>
                  <span>•</span>
                  <span>
                    VAPT: <strong className="text-emerald-700">Testing Active</strong>
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  className="text-cyan-700 hover:text-cyan-800 font-semibold flex items-center gap-1"
                >
                  Open Interactive Visual Canvas <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature Pillar: From Code to Real Enterprise Business */}
      <section id="architecture" className="py-20 bg-slate-50/70 border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
              The Missing Bridge Between <br />
              <span className="text-cyan-700">&quot;It Works on My Machine&quot;</span> and Enterprise Procurement
            </h2>
            <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              Any developer can run a code server. But selling software to enterprises demands production cloud
              architecture, continuous vulnerability testing, disaster recovery verification, privacy compliance, and
              audit trails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-cyan-400 hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-200/80 flex items-center justify-center mb-4">
                <Server className="w-5 h-5 text-cyan-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Multi-Tier AWS Deployment</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated provisioning with least privilege STS cross-account roles. VPC, private subnets, ECS Fargate,
                RDS Multi-AZ, and CloudFront. Zero exposed root credentials.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-400 hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5 text-blue-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Continuous Security & VAPT</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                24 baseline security controls plus full VAPT project workflows with OWASP Top 10 mapping, CVSS 3.1
                scores, and AI-assisted remediation patch previews with human approval.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-teal-400 hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center mb-4">
                <FileCheck className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Audit-Ready Compliance Hub</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Track real-time readiness for India DPDP Act, ISO/IEC 27001:2022, and SOC 2 Type II. Manage
                subprocessors, evidence vaults, and restore test records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Services Marketplace Teaser */}
      <section id="services" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div>
            <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Expert Advisory</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 mt-1">SaaS Software + Professional Services</h2>
            <p className="text-sm text-slate-600 mt-2 max-w-xl">
              Software provides automated readiness and continuous monitoring. Our certified cloud and security
              engineers handle high-stakes manual VAPT, ISO 27001 lead audits, and AWS infrastructure hardening.
            </p>
          </div>
          <Link
            href="/dashboard/services"
            className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 hover:text-cyan-700 shadow-xs flex items-center gap-2 whitespace-nowrap transition-colors"
          >
            <Briefcase className="w-4 h-4 text-cyan-600" />
            View Services Marketplace
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {[
            { title: "Deploy My Application", price: "₹45,000+", duration: "3-5 days", desc: "Turnkey AWS ECS & RDS deployment" },
            { title: "Professional VAPT", price: "₹75,000+", duration: "7-10 days", desc: "Certified human penetration testing & report" },
            { title: "DPDP Act Readiness", price: "₹60,000+", duration: "1-2 weeks", desc: "India data protection & privacy workflows" },
            { title: "ISO 27001 Accelerator", price: "₹1,50,000+", duration: "3-4 weeks", desc: "Complete 93-control ISMS preparation" },
          ].map((svc, i) => (
            <div key={i} className="p-5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200 space-y-2.5 hover:shadow-md transition-all">
              <div className="font-bold text-slate-900 text-sm">{svc.title}</div>
              <div className="text-slate-600 leading-relaxed text-xs">{svc.desc}</div>
              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between font-mono">
                <span className="text-cyan-700 font-bold">{svc.price}</span>
                <span className="text-slate-500 text-[11px]">{svc.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-50/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950">Transparent Software Pricing</h2>
          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
            Predictable recurring SaaS platform fees. AWS infrastructure billed directly to your own AWS account.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6 text-left max-w-6xl mx-auto">
            {/* Starter */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Starter</div>
                <div className="text-2xl font-extrabold text-slate-950 mt-2">₹4,999 <span className="text-xs font-normal text-slate-500">/ mo</span></div>
                <p className="text-xs text-slate-600 mt-2">For early startups deploying their first production application.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 1 Application in AWS</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Interactive Architecture Canvas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 10 Monthly Security Scans</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Standard CloudWatch Monitoring</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Community & Email Support</li>
                </ul>
              </div>
              <Link href="/signup?plan=STARTER" className="mt-8 block text-center py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors">
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Growth (Featured) */}
            <div className="p-6 bg-white rounded-2xl border-2 border-cyan-500 shadow-xl shadow-cyan-500/10 flex flex-col justify-between relative hover:shadow-2xl transition-all">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                Most Popular
              </div>
              <div>
                <div className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Growth</div>
                <div className="text-2xl font-extrabold text-slate-950 mt-2">₹19,999 <span className="text-xs font-normal text-slate-500">/ mo</span></div>
                <p className="text-xs text-slate-600 mt-2">For scaling cloud teams requiring continuous security & DR.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 5 Applications / 3 Environments</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 1 Professional VAPT Scope</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Continuous DR Restore Drills</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> ISO 27001 & SOC 2 Workspaces</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Public Trust Center Profile</li>
                </ul>
              </div>
              <Link href="/signup?plan=GROWTH" className="mt-8 block text-center py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm shadow-cyan-600/20 transition-all">
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Business */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business</div>
                <div className="text-2xl font-extrabold text-slate-950 mt-2">₹49,999 <span className="text-xs font-normal text-slate-500">/ mo</span></div>
                <p className="text-xs text-slate-600 mt-2">For mature SaaS teams selling to enterprise & regulated buyers.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 20 Applications / 10 Environments</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Auditor Portal & Scoped Grants</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Immutable Audit Packages</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 4 Professional VAPT Scopes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Priority 2-Hour SLA Support</li>
                </ul>
              </div>
              <Link href="/signup?plan=BUSINESS" className="mt-8 block text-center py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors">
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enterprise</div>
                <div className="text-2xl font-extrabold text-slate-950 mt-2">Custom <span className="text-xs font-normal text-slate-500">Annual</span></div>
                <p className="text-xs text-slate-600 mt-2">Custom architecture limits, dedicated advisory, and custom paper.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Unlimited Applications & Audits</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Dedicated vCISO & Cloud Architect</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Custom DPA & Master Services Agreement</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Multi-Region High Availability</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> 1-Hour SLA & Phone Support</li>
                </ul>
              </div>
              <Link href="/pricing" className="mt-8 block text-center py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 border border-slate-200 transition-colors">
                Contact Enterprise Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 bg-white text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-600" />
            <span className="font-bold text-slate-900 text-sm">LaunchComply</span>
            <span className="text-slate-500">— From Localhost to Real Business.</span>
          </div>
          <div className="text-slate-500 text-[11px] text-center sm:text-right">
            © 2026 LaunchComply. All rights reserved. LaunchComply provides technical readiness and evidence automation.
            External accredited auditing bodies are required for formal ISO/SOC certification.
          </div>
        </div>
      </footer>
    </div>
  );
}
