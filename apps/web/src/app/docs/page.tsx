"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  Rocket,
  Shield,
  FileCheck2,
  Activity,
  Layers,
  Users,
  Terminal,
  Code2,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Building2,
  ArrowRight,
} from "lucide-react";

interface DocSection {
  id: string;
  title: string;
  category: string;
  content: string;
  codeSnippet?: {
    lang: string;
    code: string;
  };
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Platform Overview & Quickstart",
    category: "GETTING STARTED",
    content: `LaunchComply bridges the gap between localhost prototype and a compliant enterprise cloud. It ingests your application source code, automatically generates multi-tier Terraform and AWS architecture blueprints, builds and deploys ECS Fargate container releases, performs continuous security scanning, and maps evidence directly to SOC 2, ISO 27001, and India DPDP compliance criteria.`,
  },
  {
    id: "connect-aws",
    title: "AWS Cloud Role Delegation",
    category: "GETTING STARTED",
    content: `LaunchComply does not store long-lived root credentials or static AWS access keys. Integration is accomplished strictly via AWS IAM AssumeRole cross-account delegation with an external ID and restricted IAM Permissions Boundary. All database instances, VPC subnets, and KMS keys remain under customer ownership in their designated AWS region (e.g. ap-south-1).`,
    codeSnippet: {
      lang: "json",
      code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::LAUNCHCOMPLY_ACCOUNT:role/LaunchComplyOperator" },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": { "sts:ExternalId": "lc-org-customer-external-id" }
      }
    }
  ]
}`,
    },
  },
  {
    id: "architecture-topology",
    title: "Architecture Blueprinting & Plan Approval",
    category: "BUILD & DEPLOY",
    content: `Once repository manifests are analyzed, LaunchComply proposes a reference topology consisting of CloudFront Edge, AWS WAF, Application Load Balancers, ECS Fargate tasks, and Multi-AZ RDS PostgreSQL. Human approval is required before any cloud infrastructure mutations or Terraform applies occur.`,
  },
  {
    id: "continuous-assurance-bots",
    title: "Autonomous Audit Bots & Evidence Chaining",
    category: "SECURE & ASSURE",
    content: `Five autonomous audit bots (AWS Infrastructure, GitHub Source, Disaster Recovery, Identity & Access, Release Security) inspect operational configuration on schedule. Evidence observations are cryptographically hashed using SHA-256 and chained sequentially into a tamper-evident integrity log.`,
    codeSnippet: {
      lang: "bash",
      code: `# Verify evidence chain integrity via Public Enterprise API
curl -X GET "https://app.launchcomply.io/api/v1/public/v1/assurance/evidence?framework=SOC2" \\
  -H "Authorization: Bearer LC_API_TOKEN" \\
  -H "X-Organization-ID: org-acmecloud-987"`,
    },
  },
  {
    id: "iso27001-isms",
    title: "ISO 27001:2022 Statement of Applicability",
    category: "COMPLY",
    content: `The Compliance OS module tracks all 93 controls from Annex A of ISO/IEC 27001:2022 across Organizational, People, Physical, and Technological domains. Statement of Applicability (SoA) revisions can be version-locked and exported as formal auditor evidence packages.`,
  },
  {
    id: "public-api",
    title: "Enterprise Public REST API",
    category: "API & DEVELOPER",
    content: `Enterprise accounts can integrate LaunchComply assurance streams directly into internal dashboards, GRC systems, or customer trust pages via our public API. Responses include standardized error codes, ISO-8601 timestamps, and correlation IDs.`,
    codeSnippet: {
      lang: "python",
      code: `import requests

url = "https://app.launchcomply.io/api/v1/public/v1/assurance/summary"
headers = {
    "Authorization": "Bearer YOUR_SERVICE_TOKEN",
    "Accept": "application/json"
}
response = requests.get(url, headers=headers)
print(response.json())`,
    },
  },
];

export default function DocsPage() {
  const [activeSectionId, setActiveSectionId] = useState<string>("getting-started");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const activeDoc =
    DOC_SECTIONS.find((d) => d.id === activeSectionId) || DOC_SECTIONS[0];

  const filteredSections = DOC_SECTIONS.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 text-base">
                LaunchComply Documentation
              </span>
            </Link>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 hidden sm:inline">
              v1.0 GA
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              Dashboard
            </Link>
            <Link
              href="/signup"
              className="text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-lg shadow-2xs"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Documentation Container */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 shrink-0 space-y-5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <nav className="space-y-4 text-xs">
            {["GETTING STARTED", "BUILD & DEPLOY", "SECURE & ASSURE", "COMPLY", "API & DEVELOPER"].map(
              (cat) => {
                const itemsInCat = filteredSections.filter(
                  (s) => s.category === cat
                );
                if (itemsInCat.length === 0) return null;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="font-bold text-[10px] uppercase tracking-wider text-slate-400 px-2">
                      {cat}
                    </div>
                    {itemsInCat.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSectionId(item.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors ${
                          activeSectionId === item.id
                            ? "bg-slate-900 text-white font-semibold"
                            : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </div>
                );
              }
            )}
          </nav>
        </aside>

        {/* Article Body */}
        <main className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {activeDoc.category}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              {activeDoc.title}
            </h1>
          </div>

          <div className="prose prose-slate max-w-none text-sm text-slate-600 leading-relaxed space-y-4">
            <p>{activeDoc.content}</p>
          </div>

          {activeDoc.codeSnippet && (
            <div className="space-y-2 mt-6">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-mono uppercase font-bold text-[11px]">
                  {activeDoc.codeSnippet.lang}
                </span>
                <button
                  onClick={() => handleCopy(activeDoc.codeSnippet!.code)}
                  className="flex items-center gap-1 hover:text-slate-900 font-medium transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner">
                <pre>{activeDoc.codeSnippet.code}</pre>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need direct engineering assistance?</span>
            <Link
              href="/dashboard/support"
              className="font-semibold text-slate-900 hover:underline flex items-center gap-1"
            >
              <span>Open Support Ticket</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        LaunchComply Documentation Center • Deploy. Secure. Audit. Comply.
      </footer>
    </div>
  );
}
