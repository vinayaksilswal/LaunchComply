"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Key,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Eye,
  DatabaseBackup,
  Layers
} from "lucide-react";

export default function PublicSecurityPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="font-bold text-lg text-slate-950 tracking-tight">LaunchComply</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/pricing" className="text-slate-600 hover:text-slate-950 transition">Pricing</Link>
            <Link href="/status" className="text-slate-600 hover:text-slate-950 transition">Status</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold transition">
              Sign In
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-sm shadow-cyan-600/20 transition">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold uppercase tracking-wider shadow-xs">
          <ShieldCheck className="w-4 h-4 text-cyan-600" />
          Enterprise Trust & Security Architecture
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight">
          Security Built into Every Layer. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600">
            From Localhost to Real Business.
          </span>
        </h1>
        <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
          LaunchComply is architected with defense-in-depth, cryptographic tenant isolation, zero-knowledge secrets management, and automated continuous evidence collection.
        </p>
      </section>

      {/* Security Pillars Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Cryptographic Data Isolation</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Strict multi-tenancy enforced at row, database, and object storage boundaries. Cross-tenant data leakage is prevented via deterministic scoping and automated IDOR negative test suites.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Key className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Encryption & Secrets Protection</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              All data in transit is encrypted using TLS 1.3 with HSTS enabled. Data at rest is secured via AES-256 KMS encryption. Raw customer database credentials and API secrets are never stored in plaintext.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Zero-Destruction Cloud Guarantee</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              LaunchComply connects via ephemeral, bounded AWS IAM STS assume-role policies. SaaS subscription cancellations or billing pauses never trigger automated destruction of customer production infrastructure.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Continuous Security & VAPT</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every production commit undergoes SAST, SCA dependency vulnerability analysis, container image SBOM scanning, and authorized penetration testing with auditable digital approvals.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <DatabaseBackup className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Resilience & DR Rehearsals</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-region disaster recovery architecture with automated hourly database backups and verified, non-destructive restore rehearsals with measured RTO under 300 seconds.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Auditor Portal Transparency</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Exportable compliance packages mapped directly to ISO 27001 ISMS and SOC 2 Trust Services Criteria, backed by time-stamped, tamper-evident cryptographic evidence logs.
            </p>
          </div>
        </div>
      </section>

      {/* Vulnerability Disclosure Policy */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-slate-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-600">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Vulnerability Disclosure Policy</h2>
            <p className="text-xs text-slate-500">Commitment to responsible security research and coordinated disclosure</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            We take the security of our platform and our customers&apos; production workloads seriously. If you believe you have discovered a vulnerability in LaunchComply, please disclose it to us responsibly.
          </p>
          <div className="space-y-2">
            <div className="font-semibold text-slate-900">Reporting Channel:</div>
            <div className="p-3 rounded-lg bg-white border border-slate-200 font-mono text-cyan-700 font-semibold text-sm">
              security@launchcomply.com
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-900">Our Commitments:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>We will acknowledge receipt of your vulnerability report within 24 hours.</li>
              <li>We will not initiate legal action against researchers acting in good faith according to these guidelines.</li>
              <li>We will work cooperatively to validate, remediate, and coordinate public disclosure of confirmed issues.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 bg-white">
        <p>© 2026 LaunchComply Technologies Private Limited. All rights reserved.</p>
        <p className="mt-1">Deploy. Secure. Audit. Comply. • Built for SaaS businesses worldwide.</p>
      </footer>
    </div>
  );
}
