"use client";

import { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Sparkles,
  Lock,
  Clock,
  Play,
  GitPullRequest,
  Check,
  X,
  FileCode,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  AlertCircle
} from "lucide-react";

interface Finding {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "ACCEPTED_RISK" | "RESOLVED";
  cvss: string;
  cwe: string;
  asset: string;
  file?: string;
  line?: number;
  slaDue: string;
  slaBreached: boolean;
  description: string;
  remediation: string;
  diff?: string;
  retestStatus?: string;
}

const INITIAL_FINDINGS: Finding[] = [
  {
    id: "fnd-001",
    title: "Hardcoded Stripe Secret API Key in Celery Worker Configuration",
    severity: "CRITICAL",
    status: "OPEN",
    cvss: "9.4",
    cwe: "CWE-798",
    asset: "apps/worker/tasks.py",
    file: "apps/worker/tasks.py",
    line: 14,
    slaDue: "21h remaining",
    slaBreached: false,
    description: "A live Stripe secret key 'sk_live_...' was committed in plain text within worker task configuration.",
    remediation: "Inject STRIPE_API_KEY from AWS Secrets Manager using ECS task definition secret injection.",
    diff: `--- a/apps/worker/tasks.py
+++ b/apps/worker/tasks.py
@@ -13,3 +13,3 @@
-STRIPE_API_KEY = "sk_live_51M..."
+import os
+STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]`,
  },
  {
    id: "fnd-002",
    title: "Permissive Wildcard CORS Access-Control-Allow-Origin on Auth Endpoints",
    severity: "HIGH",
    status: "OPEN",
    cvss: "7.8",
    cwe: "CWE-942",
    asset: "apps/api/app/main.py",
    file: "apps/api/app/main.py",
    line: 25,
    slaDue: "6d 14h remaining",
    slaBreached: false,
    description: "The API CORS policy allows '*' origins with credentials permitted on session token endpoints.",
    remediation: "Configure explicit origin whitelist for https://app.acmecloud.io and reject unverified origins.",
    diff: `--- a/apps/api/app/main.py
+++ b/apps/api/app/main.py
@@ -24,4 +24,6 @@
-    allow_origins=["*"],
+    allow_origins=[
+        "https://app.acmecloud.io",
+        "https://api.acmecloud.io"
+    ],`,
  },
  {
    id: "fnd-003",
    title: "Reflected URL Query Parameter in Internal Admin Debug Console",
    severity: "MEDIUM",
    status: "ACCEPTED_RISK",
    cvss: "5.4",
    cwe: "CWE-79",
    asset: "https://api.acmecloud.io/internal/debug",
    file: "apps/api/app/debug.py",
    line: 42,
    slaDue: "Accepted until Nov 15",
    slaBreached: false,
    description: "Debug param reflected in dev mode internal console. Blocked by AWS WAF in production.",
    remediation: "Sanitize debug input and escape HTML entities prior to reflection.",
  },
  {
    id: "fnd-004",
    title: "Deprecated TLS 1.0/1.1 Negotiation Enabled on Legacy Ingress ALB",
    severity: "MEDIUM",
    status: "RESOLVED",
    cvss: "5.0",
    cwe: "CWE-326",
    asset: "AWS ALB Ingress Listener :443",
    slaDue: "Remediated",
    slaBreached: false,
    description: "Security policy ELBSecurityPolicy-2016-08 allows legacy TLS 1.0 connections.",
    remediation: "Upgrade ALB SSL policy to ELBSecurityPolicy-TLS13-1-2-2021-06.",
    retestStatus: "FIXED (Automated)",
  },
];

export default function SecurityCenterPage() {
  const [activeTab, setActiveTab] = useState<"findings" | "scopes" | "assessments">("findings");
  const [findings, setFindings] = useState<Finding[]>(INITIAL_FINDINGS);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [remediationModal, setRemediationModal] = useState<Finding | null>(null);
  const [riskModal, setRiskModal] = useState<Finding | null>(null);
  const [triggerModal, setTriggerModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [retestLoading, setRetestLoading] = useState<string | null>(null);

  // Filter state
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
    if (statusFilter !== "ALL" && f.status !== statusFilter) return false;
    return true;
  });

  const handleRetest = (fndId: string) => {
    setRetestLoading(fndId);
    setTimeout(() => {
      setFindings((prev) =>
        prev.map((f) =>
          f.id === fndId
            ? { ...f, status: "RESOLVED", retestStatus: "FIXED (Verified Just Now)" }
            : f
        )
      );
      setRetestLoading(null);
    }, 1200);
  };

  const handleAcceptRisk = (justification: string) => {
    if (!riskModal) return;
    setFindings((prev) =>
      prev.map((f) =>
        f.id === riskModal.id
          ? { ...f, status: "ACCEPTED_RISK", slaDue: "Risk Accepted (45 Days)" }
          : f
      )
    );
    setRiskModal(null);
  };

  const handleApprovePR = (fndId: string) => {
    setFindings((prev) =>
      prev.map((f) =>
        f.id === fndId ? { ...f, status: "IN_PROGRESS" } : f
      )
    );
    setRemediationModal(null);
  };

  const handleRunAssessment = (type: string) => {
    setIsScanning(true);
    setTriggerModal(false);
    setScanNotice(`Running authorized ${type} assessment across verified assets...`);
    setTimeout(() => {
      setIsScanning(false);
      setScanNotice(`Assessment completed successfully! All assets verified, zero regressions detected.`);
      setTimeout(() => setScanNotice(null), 5000);
    }, 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-cyan-600" />
            Enterprise Security Assurance & VAPT Automation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Continuous authorized vulnerability assessments, SLA countdown tracking, review-gated AI remediation, and automated retesting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTriggerModal(true)}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Trigger Authorized Assessment
          </button>
        </div>
      </div>

      {/* Real-time Notification Banner */}
      {scanNotice && (
        <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-xs text-cyan-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-600 animate-spin" />
            <span>{scanNotice}</span>
          </div>
          <button onClick={() => setScanNotice(null)} className="text-cyan-600 hover:text-cyan-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-medium">Critical Findings</div>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">
            {findings.filter((f) => f.severity === "CRITICAL" && f.status !== "RESOLVED").length}
          </div>
          <div className="text-[11px] text-rose-600 mt-1 font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" /> SLA: 24 Hours
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-medium">High Severity</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {findings.filter((f) => f.severity === "HIGH" && f.status !== "RESOLVED").length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> SLA: 7 Days
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-medium">Accepted Risks</div>
          <div className="text-2xl font-extrabold text-indigo-600 mt-1">
            {findings.filter((f) => f.status === "ACCEPTED_RISK").length}
          </div>
          <div className="text-[11px] text-indigo-600 mt-1 font-medium">WAF/VPN Mitigated</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-medium">Remediated / Verified</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {findings.filter((f) => f.status === "RESOLVED").length}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">Automated Retest Pass</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 font-medium">Scope Legal Auth</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">ACTIVE</div>
          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> CISO Signed
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("findings")}
          className={`pb-3 transition-colors ${
            activeTab === "findings"
              ? "text-cyan-700 border-b-2 border-cyan-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Security Findings ({findings.length})
        </button>
        <button
          onClick={() => setActiveTab("scopes")}
          className={`pb-3 transition-colors ${
            activeTab === "scopes"
              ? "text-cyan-700 border-b-2 border-cyan-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Assessment Scopes & Assets (3 Verified)
        </button>
        <button
          onClick={() => setActiveTab("assessments")}
          className={`pb-3 transition-colors ${
            activeTab === "assessments"
              ? "text-cyan-700 border-b-2 border-cyan-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Assessment History & Scanners
        </button>
      </div>

      {/* Tab 1: Findings */}
      {activeTab === "findings" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs shadow-sm">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Filter by Severity:</span>
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    severityFilter === sev
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Status:</span>
              {["ALL", "OPEN", "ACCEPTED_RISK", "RESOLVED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    statusFilter === st
                      ? "bg-cyan-700 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            {filteredFindings.map((fnd) => (
              <div
                key={fnd.id}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${
                        fnd.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : fnd.severity === "HIGH"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : fnd.severity === "MEDIUM"
                          ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {fnd.severity} • CVSS {fnd.cvss}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">{fnd.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-mono">
                        <span>{fnd.cwe}</span>
                        <span>•</span>
                        <span>{fnd.asset}</span>
                        {fnd.line && <span>(Line {fnd.line})</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        fnd.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : fnd.status === "ACCEPTED_RISK"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {fnd.status}
                    </span>
                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                      {fnd.slaDue}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600">{fnd.description}</p>

                {fnd.retestStatus && (
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Retest Outcome: {fnd.retestStatus}</span>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 font-medium">
                    <strong>Fix:</strong> {fnd.remediation}
                  </div>
                  <div className="flex items-center gap-2">
                    {fnd.diff && fnd.status === "OPEN" && (
                      <button
                        onClick={() => setRemediationModal(fnd)}
                        className="px-3 py-1.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-800 font-semibold hover:bg-cyan-100 flex items-center gap-1.5 transition-colors"
                      >
                        <GitPullRequest className="w-3.5 h-3.5 text-cyan-600" />
                        AI Remediation PR
                      </button>
                    )}
                    {fnd.status === "OPEN" && (
                      <button
                        onClick={() => setRiskModal(fnd)}
                        className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                      >
                        Accept Risk
                      </button>
                    )}
                    {fnd.status !== "RESOLVED" && (
                      <button
                        disabled={retestLoading === fnd.id}
                        onClick={() => handleRetest(fnd.id)}
                        className="px-3 py-1.5 rounded bg-slate-900 text-white font-medium hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${retestLoading === fnd.id ? "animate-spin" : ""}`} />
                        Retest Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Scopes & Assets */}
      {activeTab === "scopes" && (
        <div className="space-y-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">AcmeCloud Production Security Scope</h3>
                <p className="text-xs text-slate-500">Legal Authorization: CISO Elena Rostova (Valid for 85 days)</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-semibold">
                LEGAL AUTHORIZATION ACTIVE
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">app.acmecloud.io</div>
                  <div className="text-slate-500">Type: DOMAIN • Ownership: Route53 DNS TXT Verified</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] border border-emerald-200">
                  VERIFIED ASSET
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">https://api.acmecloud.io</div>
                  <div className="text-slate-500">Type: API_ENDPOINT • Ownership: AWS Connected Account Role</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] border border-emerald-200">
                  VERIFIED ASSET
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">launchcomply/apps</div>
                  <div className="text-slate-500">Type: REPOSITORY • Ownership: GitHub App Installation Token</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] border border-emerald-200">
                  VERIFIED ASSET
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200">
              <strong>Rules of Engagement:</strong> Testing window Mon-Fri 02:00-05:00 UTC. Max 100 RPS. Denial-of-Service and data exfiltration tests strictly prohibited.
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Assessment History */}
      {activeTab === "assessments" && (
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900">Configured Security Scanner Engines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-cyan-600" />
                SAST & SCA Scanner (Bandit, Semgrep, Trivy)
              </div>
              <p className="text-slate-500">Analyzes source code, package vulnerabilities, and insecure dependencies.</p>
              <div className="text-[11px] text-emerald-700 font-medium">Status: ACTIVE ON EVERY PUSH</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-cyan-600" />
                Secret Scanner & Cloud Config (Gitleaks, Prowler)
              </div>
              <p className="text-slate-500">Detects committed API keys, tokens, and AWS CIS benchmark misconfigurations.</p>
              <div className="text-[11px] text-emerald-700 font-medium">Status: CONTINUOUS SCANNING</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-600" />
                Container & DAST Scanner (ECR Inspector, OWASP ZAP)
              </div>
              <p className="text-slate-500">Analyzes container images and executes safe dynamic application attacks.</p>
              <div className="text-[11px] text-emerald-700 font-medium">Status: RATE-LIMITED (SSRF GUARD ACTIVE)</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-cyan-600" />
                TLS & Route53 Health Validator
              </div>
              <p className="text-slate-500">Validates TLS 1.3 ciphers, HSTS headers, and DNS failover readiness.</p>
              <div className="text-[11px] text-emerald-700 font-medium">Status: DAILY VERIFICATION</div>
            </div>
          </div>
        </div>
      )}

      {/* AI Remediation Review Gate Modal */}
      {remediationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-600" />
                <h3 className="font-bold text-slate-900 text-sm">AI Remediation Proposal (Human Review Gate)</h3>
              </div>
              <button onClick={() => setRemediationModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-800">{remediationModal.title}</div>
              <p className="text-slate-600">{remediationModal.remediation}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre">
              {remediationModal.diff}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span><strong>Safety Gate:</strong> This proposal will create branch <code className="font-bold">security/remediate-cors</code>. It will NOT auto-merge or auto-deploy without senior engineer sign-off.</span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRemediationModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Reject / Close
              </button>
              <button
                onClick={() => handleApprovePR(remediationModal.id)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                Approve & Create GitHub PR #104
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Acceptance Modal */}
      {riskModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Accept Security Risk with Justification</h3>
            <p className="text-xs text-slate-500">
              Risk acceptances are time-bound (max 90 days), logged to immutable audit trails, and presented to third-party auditors.
            </p>
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700">Compensating Control / Business Justification</label>
              <textarea
                rows={3}
                defaultValue="Mitigated by AWS WAF Rate Limiting and Strict IP Whitelist. Scheduled for fix in Sprint 48."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRiskModal(null)}
                className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAcceptRisk("Justified")}
                className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold"
              >
                Confirm Risk Acceptance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Assessment Modal */}
      {triggerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Trigger Authorized Vulnerability Assessment</h3>
            <p className="text-xs text-slate-500">
              Executes non-destructive security scans strictly within the pre-approved scope and rate limits.
            </p>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => handleRunAssessment("Full Automated Pipeline")}
                className="w-full p-3 text-left rounded-lg border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/50 transition-all font-semibold text-slate-800"
              >
                <div>Full Assessment (SAST + SCA + Secrets + DAST)</div>
                <span className="text-[11px] text-slate-500 font-normal">Scans monorepo code, dependencies, and public HTTPS endpoints.</span>
              </button>
              <button
                onClick={() => handleRunAssessment("DAST & API Security")}
                className="w-full p-3 text-left rounded-lg border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50/50 transition-all font-semibold text-slate-800"
              >
                <div>DAST & API Security Only</div>
                <span className="text-[11px] text-slate-500 font-normal">Checks TLS 1.3, CORS, rate-limiting, and OWASP Top 10 web injection.</span>
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTriggerModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
