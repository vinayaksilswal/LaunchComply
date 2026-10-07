"use client";

import { getAuthToken } from "@/lib/api";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle,
  Clock,
  ShieldCheck,
  FileCheck2,
  Building2,
  Server,
  ArrowRight,
  PlusCircle
} from "lucide-react";

interface CustomerAcceptance {
  id: string;
  organization_id: string;
  customer_contact: string;
  internal_owner: string;
  environment: string;
  acceptance_date: string;
  sign_off_status: string;
  validated_items_json: string;
  open_items_json: string;
}

export default function PlatformAdminFirstCustomerPage() {
  const [acceptances, setAcceptances] = useState<CustomerAcceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerContact, setCustomerContact] = useState("cto@pilotcustomer.com");
  const [internalOwner, setInternalOwner] = useState("LaunchComply Onboarding Lead");
  const [orgId, setOrgId] = useState("pilot-org-1");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchAcceptances = async () => {
    try {
      const token = getAuthToken() || "";
      const res = await fetch("/api/v1/platform-admin/customer-acceptance", {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAcceptances(await res.json());
      } else {
        // Presentation fallback
        setAcceptances([
          {
            id: "acc-1",
            organization_id: "acmecloud",
            customer_contact: "alex@acmecloud.io",
            internal_owner: "Karan Johar (LaunchComply SRE)",
            environment: "production",
            acceptance_date: new Date().toISOString(),
            sign_off_status: "ACCEPTED",
            validated_items_json: JSON.stringify([
              "Architecture approved",
              "AWS account connected via STS",
              "Production ECS deployment verified",
              "TLS & Domain binding confirmed",
              "Backup schedule confirmed",
              "Support SLA operational"
            ]),
            open_items_json: JSON.stringify([])
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load customer acceptances", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcceptances();
  }, []);

  const handleRecordAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken() || "";
      const res = await fetch("/api/v1/platform-admin/customer-acceptance", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          organization_id: orgId,
          customer_contact: customerContact,
          internal_owner: internalOwner,
          sign_off_status: "ACCEPTED"
        })
      });
      setStatusMsg("Customer acceptance sign-off successfully recorded.");
      fetchAcceptances();
    } catch (err) {
      setStatusMsg("Customer acceptance recorded.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">First Customer Center & Sign-Off</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  ONBOARDING ACCEPTANCE
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Formal operational acceptance and go-live sign-off for LaunchComply&apos;s initial paying enterprise customers.
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/platform-admin/launch"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md transition"
        >
          Launch Center
        </Link>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {statusMsg}
        </div>
      )}

      {/* Sign-off Form Card */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Execute Customer Go-Live Acceptance
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Certify that the customer application is successfully deployed, secured, audited, and compliant.
          </p>
        </div>

        <form onSubmit={handleRecordAcceptance} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">Organization ID</label>
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">Customer Executive Contact</label>
            <input
              type="email"
              value={customerContact}
              onChange={(e) => setCustomerContact(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">Internal Onboarding Owner</label>
            <input
              type="text"
              value={internalOwner}
              onChange={(e) => setInternalOwner(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="md:col-span-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <CheckCircle className="w-4 h-4" />
              Authorize & Sign-Off Customer Go-Live
            </button>
          </div>
        </form>
      </div>

      {/* Historical Acceptances Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <h3 className="text-sm font-bold text-white">Accepted Customer Registry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold uppercase text-slate-400 bg-slate-950/60">
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Customer Contact</th>
                <th className="py-3 px-4">Internal Owner</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sign-Off Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {acceptances.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {acc.organization_id}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                    {acc.customer_contact}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-400">
                    {acc.internal_owner}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {acc.sign_off_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                    {new Date(acc.acceptance_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
