"use client";

import { getAuthToken } from "@/lib/api";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  FileText,
  Sparkles,
  Download,
  Eye,
  X,
  RefreshCw
} from "lucide-react";
import { platformAdminApi, crmApi } from "@/lib/api/modules";

export default function PlatformAdminSalesPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [proposalTemplates, setProposalTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken() || "";
      const [leadsRes, oppsRes, templatesRes] = await Promise.all([
        fetch("/api/v1/platform-admin/leads", { credentials: "include", headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/v1/platform-admin/opportunities", { credentials: "include", headers: { Authorization: `Bearer ${token}` } }),
        crmApi.getProposalTemplates()
      ]);

      if (leadsRes.ok) {
        setLeads(await leadsRes.json());
      }
      if (oppsRes.ok) {
        setOpportunities(await oppsRes.json());
      }
      if (templatesRes) {
        setProposalTemplates(templatesRes);
      }
    } catch (err) {
      console.error("Failed to load sales data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const totalPipelineValue = opportunities.reduce((acc, curr) => acc + (curr.estimated_value || 0), 0);
  const wonDealsValue = opportunities.filter(o => o.stage === "WON").reduce((acc, curr) => acc + (curr.estimated_value || 0), 0);

  const filteredOpps = opportunities.filter(opp => {
    const matchesStage = filterStage === "ALL" || opp.stage === filterStage;
    const matchesSearch = (opp.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (opp.product_or_service || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                <Briefcase className="w-4 h-4" />
                <span>Commercial Deal Operations</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                Sales Pipeline & Proposals Hub
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage commercial leads, qualified demo requests, opportunity stages, and standardized enterprise service proposals (§40–54).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchSalesData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <Link
                href="/platform-admin/customers/first-10"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow transition"
              >
                <span>First 10 Customers</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pipeline Value</span>
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                ₹{totalPipelineValue.toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Active prospective enterprise deals</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Won Revenue</span>
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-700">
                ₹{wonDealsValue.toLocaleString("en-IN")}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Converted orders and active subscriptions</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deals</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {opportunities.length}
              </span>
              <span className="text-xs text-indigo-600 font-semibold">Opportunities</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Across qualification, discovery, and proposal</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inbound Leads</span>
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {leads.length}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Captured</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">From website demo & inquiry funnels</p>
          </div>
        </div>

        {/* 7 Standardized Service Proposal Templates (§50, §51) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Standardized Commercial Proposal Templates (§50, §51)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audited scopes, deliverables, and fixed-fee commercial terms. Human sign-off required prior to contract issue.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {proposalTemplates.length} Ready Templates
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposalTemplates.map((tmpl) => (
              <div
                key={tmpl.template_id}
                className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition flex flex-col justify-between space-y-3 bg-white"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {tmpl.template_id}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {tmpl.price_guidance}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">
                    {tmpl.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {tmpl.scope}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Timeline: {tmpl.timeline}</span>
                  <button
                    onClick={() => setSelectedTemplate(tmpl)}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunities Pipeline */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Commercial Pipeline Deals ({filteredOpps.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Qualified opportunity stages: NEW → DISCOVERY → PROPOSAL → NEGOTIATION → WON
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search deals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white focus:outline-none"
              >
                <option value="ALL">All Stages</option>
                <option value="NEW">New</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="SOLUTION_DESIGN">Solution Design</option>
                <option value="PROPOSAL">Proposal Sent</option>
                <option value="NEGOTIATION">Negotiation</option>
                <option value="WON">Won</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Deal / Prospect</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Product / Scope</th>
                  <th className="px-4 py-3">Estimated Value</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-6 py-3">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredOpps.map((opp) => (
                  <tr key={opp.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {opp.title}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        opp.stage === "WON" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                        opp.stage === "PROPOSAL" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                        "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {opp.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-700">
                      {opp.product_or_service}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 text-xs">
                      ₹{opp.estimated_value?.toLocaleString("en-IN") || 0}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {opp.owner}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">
                      {opp.next_action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inbound Leads Table (§41) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Inbound Leads & Demo Bookings ({leads.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lead Sources: Website Book Demo, VAPT Inquiry, ISO/SOC 2 Assessment, Organic Search (§41, §42).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Lead Contact</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3">Qualification Notes</th>
                  <th className="px-4 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900">{l.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{l.email}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      {l.company || "N/A"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {l.source}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 max-w-sm">
                      {l.notes || "Inbound consultation form submission"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 text-right font-mono">
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Proposal Inspection Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                    {selectedTemplate.template_id}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {selectedTemplate.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-700">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px]">Problem Statement</h4>
                  <p className="mt-0.5 text-slate-600">{selectedTemplate.problem}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px]">Scope of Services</h4>
                  <p className="mt-0.5 text-slate-600">{selectedTemplate.scope}</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px]">Deliverables</h4>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-600">
                    {selectedTemplate.deliverables?.map((d: string, idx: number) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase text-[10px]">Timeline</span>
                    <div className="font-bold text-slate-900 mt-0.5">{selectedTemplate.timeline}</div>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 uppercase text-[10px]">Standard Price Guidance</span>
                    <div className="font-bold text-indigo-600 mt-0.5">{selectedTemplate.price_guidance}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px]">Legal & Statutory Terms</h4>
                  <p className="mt-0.5 text-slate-600">{selectedTemplate.terms}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
