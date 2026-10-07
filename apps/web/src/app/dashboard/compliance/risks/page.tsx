"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Shield,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Filter,
  Search,
  Check,
  X
} from "lucide-react";

export default function EnterpriseRiskRegisterPage() {
  const [viewMode, setViewMode] = useState<"residual" | "inherent">("residual");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRiskToAccept, setSelectedRiskToAccept] = useState<any | null>(null);
  const [acceptJustification, setAcceptJustification] = useState("");
  const [acceptApprover, setAcceptApprover] = useState("ciso@acmecloud.io");

  const [risks, setRisks] = useState([
    {
      id: "RSK-001",
      title: "Production credential leakage via third-party telemetry",
      category: "TECHNICAL",
      asset: "FastAPI Worker & Third-Party Logs",
      threat: "API tokens or database secrets inadvertently logged in stdout and transmitted to cloud monitoring.",
      vulnerability: "Unsanitized log formatters in background task worker queues.",
      likelihood: 4,
      impact: 4,
      inherentScore: 16,
      inherentLevel: "CRITICAL",
      residualLikelihood: 2,
      residualImpact: 3,
      residualScore: 6,
      residualLevel: "MEDIUM",
      owner: "ciso@acmecloud.io",
      treatment: "MITIGATE",
      status: "TREATED",
    },
    {
      id: "RSK-002",
      title: "Stale subprocessor DPA terms for transactional notification dispatcher",
      category: "THIRD_PARTY",
      asset: "Resend Inc. Email Dispatcher",
      threat: "Customer data processed under click-through terms lacking required statutory DPDP SCC safeguards.",
      vulnerability: "Informal developer onboarding of SaaS trial accounts.",
      likelihood: 3,
      impact: 3,
      inherentScore: 9,
      inherentLevel: "MEDIUM",
      residualLikelihood: 1,
      residualImpact: 2,
      residualScore: 2,
      residualLevel: "LOW",
      owner: "legal@acmecloud.io",
      treatment: "MITIGATE",
      status: "ASSESSED",
    },
    {
      id: "RSK-003",
      title: "Single-Region Cloud Outage Disruption to Customer API",
      category: "OPERATIONAL",
      asset: "AWS Mumbai (ap-south-1) Infrastructure Stack",
      threat: "Catastrophic regional fiber cut or AWS facility impairment causing API unavailability.",
      vulnerability: "Primary application cluster operating primarily within ap-south-1.",
      likelihood: 3,
      impact: 5,
      inherentScore: 15,
      inherentLevel: "HIGH",
      residualLikelihood: 1,
      residualImpact: 3,
      residualScore: 3,
      residualLevel: "LOW",
      owner: "devops@acmecloud.io",
      treatment: "MITIGATE",
      status: "TREATED",
    },
    {
      id: "RSK-004",
      title: "Reflected Query Parameter in Staging Debug Console",
      category: "TECHNICAL",
      asset: "Internal Debug Endpoint",
      threat: "Cross-site scripting on internal admin portal session.",
      vulnerability: "Debug query string reflected without HTML escaping.",
      likelihood: 2,
      impact: 3,
      inherentScore: 6,
      inherentLevel: "MEDIUM",
      residualLikelihood: 1,
      residualImpact: 2,
      residualScore: 2,
      residualLevel: "LOW",
      owner: "developer@acmecloud.io",
      treatment: "ACCEPT",
      status: "ACCEPTED",
    }
  ]);

  const [newRisk, setNewRisk] = useState({
    title: "",
    category: "TECHNICAL",
    asset: "",
    threat: "",
    vulnerability: "",
    likelihood: 3,
    impact: 3,
    owner: "security@acmecloud.io"
  });

  const handleCreateRisk = (e: React.FormEvent) => {
    e.preventDefault();
    const l = Number(newRisk.likelihood);
    const i = Number(newRisk.impact);
    const r: any = {
      id: `RSK-${String(risks.length + 1).padStart(3, "0")}`,
      title: newRisk.title,
      category: newRisk.category,
      asset: newRisk.asset,
      threat: newRisk.threat,
      vulnerability: newRisk.vulnerability,
      likelihood: l,
      impact: i,
      inherentScore: l * i,
      inherentLevel: l * i >= 16 ? "CRITICAL" : l * i >= 10 ? "HIGH" : l * i >= 5 ? "MEDIUM" : "LOW",
      residualLikelihood: Math.max(1, l - 1),
      residualImpact: Math.max(1, i - 1),
      residualScore: Math.max(1, l - 1) * Math.max(1, i - 1),
      residualLevel: "LOW",
      owner: newRisk.owner,
      treatment: "MITIGATE",
      status: "IDENTIFIED",
    };
    setRisks([r, ...risks]);
    setShowAddModal(false);
  };

  const handleConfirmAccept = () => {
    if (!selectedRiskToAccept) return;
    setRisks(
      risks.map((r) =>
        r.id === selectedRiskToAccept.id
          ? { ...r, treatment: "ACCEPT", status: "ACCEPTED" }
          : r
      )
    );
    setSelectedRiskToAccept(null);
    setAcceptJustification("");
  };

  // Build 5x5 heatmap data
  const heatmapData = Array(5).fill(0).map(() => Array(5).fill(0));
  risks.forEach((r) => {
    const l = viewMode === "residual" ? r.residualLikelihood : r.likelihood;
    const i = viewMode === "residual" ? r.residualImpact : r.impact;
    if (l >= 1 && l <= 5 && i >= 1 && i <= 5) {
      heatmapData[5 - l][i - 1] += 1;
    }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard/compliance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Compliance Command Center
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Enterprise Risk Register</span>
      </div>

      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              ISO 27001 CLAUSE 6.1 & 8.2 ALIGNED
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              5x5 Configurable Matrix
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Enterprise Risk Register & Heatmap
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Identify, assess, treat, and monitor information security and privacy risks.
            Formal risk acceptance gates require justification, executive sign-off, and review expiration.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold text-slate-950 transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" /> Add Risk
        </button>
      </div>

      {/* 5x5 Heatmap Matrix */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              5x5 Risk Matrix ({viewMode === "residual" ? "Residual Risk Post-Treatment" : "Inherent Risk Baseline"})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Likelihood (1–5) × Impact (1–5). Click toggle to compare inherent vs residual posture.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode("residual")}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                viewMode === "residual" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Residual Risk
            </button>
            <button
              onClick={() => setViewMode("inherent")}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                viewMode === "inherent" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Inherent Risk
            </button>
          </div>
        </div>

        {/* The 5x5 Grid */}
        <div className="grid grid-cols-6 gap-2 text-center text-xs font-mono max-w-2xl mx-auto pt-2">
          {/* Header row */}
          <div className="text-[10px] text-slate-400 flex items-center justify-center font-bold">Likelihood \ Impact</div>
          <div className="text-[10px] text-slate-400 font-bold">1 - Minor</div>
          <div className="text-[10px] text-slate-400 font-bold">2 - Low</div>
          <div className="text-[10px] text-slate-400 font-bold">3 - Moderate</div>
          <div className="text-[10px] text-slate-400 font-bold">4 - Major</div>
          <div className="text-[10px] text-slate-400 font-bold">5 - Critical</div>

          {/* Rows from Likelihood 5 down to 1 */}
          {[5, 4, 3, 2, 1].map((lVal, rIdx) => (
            <>
              <div key={`label-${lVal}`} className="text-[10px] text-slate-400 font-bold flex items-center justify-center">
                {lVal} - {lVal === 5 ? "Certain" : lVal === 4 ? "Likely" : lVal === 3 ? "Possible" : lVal === 2 ? "Unlikely" : "Rare"}
              </div>
              {[1, 2, 3, 4, 5].map((iVal, cIdx) => {
                const count = heatmapData[rIdx][cIdx];
                const score = lVal * iVal;
                const cellBg =
                  score >= 16
                    ? "bg-rose-950/80 border-rose-600/60 text-rose-300"
                    : score >= 10
                    ? "bg-orange-950/70 border-orange-600/50 text-orange-300"
                    : score >= 5
                    ? "bg-amber-950/50 border-amber-600/40 text-amber-300"
                    : "bg-emerald-950/40 border-emerald-600/30 text-emerald-300";

                return (
                  <div
                    key={`cell-${rIdx}-${cIdx}`}
                    className={`h-12 rounded border flex flex-col items-center justify-center font-bold transition-all ${cellBg}`}
                  >
                    <span className="text-sm">{count > 0 ? count : "-"}</span>
                    <span className="text-[9px] opacity-60">Score {score}</span>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Risk Register Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Risk Register ({risks.length} Logged)
          </h3>
          <span className="text-xs text-slate-400">Quarterly Review Cycle</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Risk ID</th>
                <th className="py-3 px-4">Title & Description</th>
                <th className="py-3 px-4">Asset & Category</th>
                <th className="py-3 px-4">Inherent Risk</th>
                <th className="py-3 px-4">Residual Risk</th>
                <th className="py-3 px-4">Treatment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {risks.map((r) => (
                <tr key={r.id} className="hover:bg-slate-850/40">
                  <td className="py-3 px-4 font-mono font-bold text-cyan-400">{r.id}</td>
                  <td className="py-3 px-4 max-w-sm">
                    <div className="font-bold text-white">{r.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{r.threat}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-white font-medium">{r.asset}</div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase">{r.category}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      r.inherentLevel === "CRITICAL"
                        ? "text-rose-400 bg-rose-950/60 border-rose-500/30"
                        : r.inherentLevel === "HIGH"
                        ? "text-orange-400 bg-orange-950/60 border-orange-500/30"
                        : "text-amber-400 bg-amber-950/60 border-amber-500/30"
                    }`}>
                      {r.inherentScore} • {r.inherentLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      r.residualLevel === "HIGH"
                        ? "text-orange-400 bg-orange-950/60 border-orange-500/30"
                        : r.residualLevel === "MEDIUM"
                        ? "text-amber-400 bg-amber-950/60 border-amber-500/30"
                        : "text-emerald-400 bg-emerald-950/60 border-emerald-500/30"
                    }`}>
                      {r.residualScore} • {r.residualLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      {r.treatment}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {r.treatment !== "ACCEPT" ? (
                      <button
                        onClick={() => setSelectedRiskToAccept(r)}
                        className="text-xs text-amber-400 hover:underline font-semibold"
                      >
                        Accept Risk
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">Accepted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accept Risk Drawer / Modal */}
      {selectedRiskToAccept && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Formal Risk Acceptance Gate</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accepting risk for <strong className="text-white">{selectedRiskToAccept.title}</strong> requires formal
              compensating control justification, CISO approval, and mandatory 90-day review expiration.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Executive Approver</label>
                <input
                  type="email"
                  value={acceptApprover}
                  onChange={(e) => setAcceptApprover(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Compensating Control Justification</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe why risk is accepted and what compensating controls exist..."
                  value={acceptJustification}
                  onChange={(e) => setAcceptJustification(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedRiskToAccept(null)}
                className="px-3 py-1.5 text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!acceptJustification}
                onClick={handleConfirmAccept}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg text-slate-950 font-bold text-xs"
              >
                Sign Off & Accept Risk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Risk Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Register Enterprise Risk</h3>
            <form onSubmit={handleCreateRisk} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Risk Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inadequate log retention under CERT-In"
                  value={newRisk.title}
                  onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Likelihood (1–5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRisk.likelihood}
                    onChange={(e) => setNewRisk({ ...newRisk, likelihood: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Impact (1–5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRisk.impact}
                    onChange={(e) => setNewRisk({ ...newRisk, impact: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Affected Asset</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS CloudTrail Log Archive"
                  value={newRisk.asset}
                  onChange={(e) => setNewRisk({ ...newRisk, asset: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-slate-950 font-bold"
                >
                  Record Risk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
