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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-600/20 to-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="text-center max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Enterprise Production & Compliance Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            From Localhost to <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400">
              Real Business.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 font-medium leading-relaxed">
            Deploy, secure, audit and prepare your application for enterprise customers — from one unified platform.
          </p>

          <p className="mt-2 text-sm text-slate-400 max-w-2xl mx-auto">
            Connect your code. Build the right AWS architecture. Deploy to production. Connect your domain. Run security
            assessments. Track VAPT findings. Prepare for privacy and compliance.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="px-6 py-3.5 text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 hover:opacity-95 rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
            >
              Deploy My Application
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3.5 text-sm font-semibold text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              Explore Live Demo Dashboard
            </Link>
          </div>

          {/* Status Badges Row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 text-xs font-mono">
            {[
              { label: "LIVE IN PROD", color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40" },
              { label: "SECURE VPC", color: "text-blue-400 border-blue-500/30 bg-blue-950/40" },
              { label: "MONITORED", color: "text-cyan-400 border-cyan-500/30 bg-cyan-950/40" },
              { label: "BACKED UP & TESTED", color: "text-indigo-400 border-indigo-500/30 bg-indigo-950/40" },
              { label: "VAPT TRACKED", color: "text-amber-400 border-amber-500/30 bg-amber-950/40" },
              { label: "COMPLIANCE READY", color: "text-teal-400 border-teal-500/30 bg-teal-950/40" },
            ].map((badge, i) => (
              <span key={i} className={`px-2.5 py-1 rounded-full border ${badge.color} font-semibold`}>
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
                  ? "bg-slate-800 text-white border border-slate-600 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Terminal className="w-4 h-4" />
              Before: localhost:3000
            </button>
            <div className="text-slate-500 text-xs">→</div>
            <button
              onClick={() => setActiveTab("production")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "production"
                  ? "bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Rocket className="w-4 h-4 text-cyan-400" />
              After: AWS Enterprise Production (LaunchComply)
            </button>
          </div>

          {activeTab === "localhost" ? (
            /* Localhost Terminal View */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl font-mono text-xs">
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
            <div className="glass-panel-glow rounded-2xl p-6 shadow-2xl border border-cyan-500/30">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white font-mono uppercase">
                    app.acmecloud.io • ap-south-1 (Mumbai)
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40">
                  AUDITED & PRODUCTION HEALTHY (84%)
                </span>
              </div>

              {/* Topology Flow Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-cyan-400 mb-1">Edge & DNS</div>
                  <div className="font-bold text-white">Route 53 + WAF</div>
                  <div className="text-slate-400 text-[11px] mt-1">DDoS & OWASP Shield</div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-blue-400 mb-1">CDN & Ingress</div>
                  <div className="font-bold text-white">CloudFront + ALB</div>
                  <div className="text-slate-400 text-[11px] mt-1">Strict TLS 1.3 Terminated</div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-indigo-400 mb-1">Compute Tier</div>
                  <div className="font-bold text-white">ECS Fargate Cluster</div>
                  <div className="text-slate-400 text-[11px] mt-1">Private VPC Subnets</div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1">Database & DR</div>
                  <div className="font-bold text-white">RDS PostgreSQL</div>
                  <div className="text-slate-400 text-[11px] mt-1">Multi-AZ & Continuous WAL</div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span>
                    Compliance: <strong className="text-cyan-300">DPDP 76%</strong>,{" "}
                    <strong className="text-cyan-300">ISO 27001 64%</strong>,{" "}
                    <strong className="text-cyan-300">SOC 2 58%</strong>
                  </span>
                  <span>•</span>
                  <span>
                    VAPT: <strong className="text-emerald-400">Testing Active</strong>
                  </span>
                </div>
                <Link
                  href="/dashboard/architecture"
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                >
                  Open Interactive Visual Canvas <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature Pillar: From Code to Real Enterprise Business */}
      <section id="architecture" className="py-20 bg-slate-900/60 border-t border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white">
              The Missing Bridge Between <br />
              <span className="text-cyan-400">"It Works on My Machine"</span> and Enterprise Procurement
            </h2>
            <p className="mt-4 text-slate-400 text-sm">
              Any developer can run a code server. But selling software to enterprises demands production cloud
              architecture, continuous vulnerability testing, disaster recovery verification, privacy compliance, and
              audit trails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center mb-4">
                <Server className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Multi-Tier AWS Deployment</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated provisioning with least privilege STS cross-account roles. VPC, private subnets, ECS Fargate,
                RDS Multi-AZ, and CloudFront. Zero exposed root credentials.
              </p>
            </div>

            <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-800/60 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Continuous Security & VAPT</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                24 baseline security controls plus full VAPT project workflows with OWASP Top 10 mapping, CVSS 3.1
                scores, and AI-assisted remediation patch previews with human approval.
              </p>
            </div>

            <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-teal-950 border border-teal-800/60 flex items-center justify-center mb-4">
                <FileCheck className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Audit-Ready Compliance Hub</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track real-time readiness for India DPDP Act, ISO/IEC 27001:2022, and SOC 2 Type II. Manage
                subprocessors, evidence vaults, and restore test records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Services Marketplace Teaser */}
      <section id="services" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Expert Advisory</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">SaaS Software + Professional Services</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-xl">
              Software provides automated readiness and continuous monitoring. Our certified cloud and security
              engineers handle high-stakes manual VAPT, ISO 27001 lead audits, and AWS infrastructure hardening.
            </p>
          </div>
          <Link
            href="/dashboard/services"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-cyan-300 flex items-center gap-2 whitespace-nowrap"
          >
            <Briefcase className="w-4 h-4" />
            View Services Marketplace
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {[
            { title: "Deploy My Application", price: "₹45,000+", duration: "3-5 days", desc: "Turnkey AWS ECS & RDS deployment" },
            { title: "Professional VAPT", price: "₹75,000+", duration: "7-10 days", desc: "Certified human penetration testing & report" },
            { title: "DPDP Act Readiness", price: "₹60,000+", duration: "1-2 weeks", desc: "India data protection & privacy workflows" },
            { title: "ISO 27001 Accelerator", price: "₹1,50,000+", duration: "3-4 weeks", desc: "Complete 93-control ISMS preparation" },
          ].map((svc, i) => (
            <div key={i} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-white text-sm">{svc.title}</div>
              <div className="text-slate-400">{svc.desc}</div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-mono">
                <span className="text-cyan-400 font-bold">{svc.price}</span>
                <span className="text-slate-500 text-[10px]">{svc.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Transparent Software Pricing</h2>
          <p className="mt-2 text-xs text-slate-400">
            Predictable recurring SaaS platform fees. AWS infrastructure billed directly to your own AWS account.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
            {/* Starter */}
            <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">Starter</div>
                <div className="text-2xl font-extrabold text-white mt-2">₹9,999 <span className="text-xs font-normal text-slate-400">/ mo</span></div>
                <p className="text-xs text-slate-400 mt-2">For early-stage startups taking first MVP to production.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ 1 Application in AWS</li>
                  <li className="flex items-center gap-2">✓ Interactive Architecture Canvas</li>
                  <li className="flex items-center gap-2">✓ Automated Security Scans</li>
                  <li className="flex items-center gap-2">✓ Download Architecture Package</li>
                  <li className="flex items-center gap-2">✓ Baseline Production Readiness</li>
                </ul>
              </div>
              <Link href="/onboarding" className="mt-8 block text-center py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white">
                Get Started
              </Link>
            </div>

            {/* Growth (Featured) */}
            <div className="p-6 bg-slate-950/90 rounded-2xl border border-cyan-500/50 shadow-xl shadow-cyan-500/10 flex flex-col justify-between relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-extrabold uppercase">
                Most Popular
              </div>
              <div>
                <div className="text-xs font-bold text-cyan-400 uppercase">Growth</div>
                <div className="text-2xl font-extrabold text-white mt-2">₹24,999 <span className="text-xs font-normal text-slate-400">/ mo</span></div>
                <p className="text-xs text-slate-400 mt-2">For growing SaaS companies selling to enterprise clients.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ 3 Applications / Multi-Environment</li>
                  <li className="flex items-center gap-2">✓ VAPT Project Tracker & AI Remediation</li>
                  <li className="flex items-center gap-2">✓ DPDP Act (India) Readiness Suite</li>
                  <li className="flex items-center gap-2">✓ ISO 27001 & SOC 2 Readiness Hub</li>
                  <li className="flex items-center gap-2">✓ Automated Backup Restore Testing</li>
                  <li className="flex items-center gap-2">✓ Subprocessor Registry & DPA Vault</li>
                </ul>
              </div>
              <Link href="/onboarding" className="mt-8 block text-center py-2.5 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 text-xs font-bold">
                Deploy Growth Stack
              </Link>
            </div>

            {/* Enterprise */}
            <div className="p-6 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">Enterprise</div>
                <div className="text-2xl font-extrabold text-white mt-2">₹59,999 <span className="text-xs font-normal text-slate-400">/ mo</span></div>
                <p className="text-xs text-slate-400 mt-2">Full compliance monitoring and dedicated security architect.</p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Unlimited Applications</li>
                  <li className="flex items-center gap-2">✓ Included Annual VAPT by OSCP Testers</li>
                  <li className="flex items-center gap-2">✓ Custom Compliance Frameworks</li>
                  <li className="flex items-center gap-2">✓ Dedicated DevSecOps Engineer</li>
                  <li className="flex items-center gap-2">✓ 99.99% SLA & 15-min Incident Response</li>
                </ul>
              </div>
              <Link href="/dashboard/services" className="mt-8 block text-center py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white">
                Contact Enterprise Advisory
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 bg-slate-950 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-white text-sm">LaunchComply</span>
            <span>— From Localhost to Real Business.</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            © 2026 LaunchComply. All rights reserved. LaunchComply provides technical readiness and evidence automation.
            External accredited auditing bodies are required for formal ISO/SOC certification.
          </div>
        </div>
      </footer>
    </div>
  );
}
