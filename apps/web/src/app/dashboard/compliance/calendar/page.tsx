"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  Building2,
  DatabaseBackup,
  Target,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Flame,
  BadgeCheck
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  type: "AUDIT" | "POLICY" | "RISK" | "VENDOR" | "MGMT_REVIEW" | "DR_DRILL" | "TRAINING" | "ASSURANCE";
  date: string;
  time?: string;
  frequency: "ANNUAL" | "QUARTERLY" | "MONTHLY" | "BI_ANNUAL" | "ONE_OFF";
  owner: string;
  status: "UPCOMING" | "DUE_SOON" | "COMPLETED" | "OVERDUE";
  href: string;
  framework: string;
  description: string;
}

const EVENTS: CalendarEvent[] = [
  {
    id: "CAL-01",
    title: "SOC 2 Type II External Audit Fieldwork Begins",
    type: "AUDIT",
    date: "2026-10-18",
    time: "09:30 AM IST",
    frequency: "ANNUAL",
    owner: "Alex Mercer / Grant Thornton",
    status: "DUE_SOON",
    href: "/dashboard/compliance/audit-readiness",
    framework: "SOC 2 Type II",
    description: "External auditor fieldwork kickoff covering CC1–CC9 criteria over the 90-day operating period."
  },
  {
    id: "CAL-02",
    title: "Resend SaaS Vendor Security Renewal",
    type: "VENDOR",
    date: "2026-10-20",
    frequency: "ANNUAL",
    owner: "Security Lead",
    status: "DUE_SOON",
    href: "/dashboard/compliance/vendors",
    framework: "ISO 27001 A.15",
    description: "Annual verification of transactional email SOC 2 Type II report and bilateral DPA terms."
  },
  {
    id: "CAL-03",
    title: "Q4 Automated Cross-Region DR Restore Drill",
    type: "DR_DRILL",
    date: "2026-10-25",
    time: "11:00 AM IST",
    frequency: "QUARTERLY",
    owner: "Platform Team",
    status: "UPCOMING",
    href: "/dashboard/dr",
    framework: "ISO 27001 A.17 / SOC 2 A1.2",
    description: "Automated test restoring RDS snapshot from ap-south-1 to ap-southeast-1 with RTO/RPO measurement."
  },
  {
    id: "CAL-04",
    title: "Annual Information Security Policy Review",
    type: "POLICY",
    date: "2026-11-01",
    frequency: "ANNUAL",
    owner: "Compliance Manager",
    status: "UPCOMING",
    href: "/dashboard/compliance/policies",
    framework: "ISO 27001 Clause 5.2",
    description: "Annual clause 5.2 policy recertification and distribution to all active staff."
  },
  {
    id: "CAL-05",
    title: "Executive ISMS Management Review (Clause 9.3)",
    type: "MGMT_REVIEW",
    date: "2026-11-12",
    time: "03:00 PM IST",
    frequency: "BI_ANNUAL",
    owner: "CEO & CISO",
    status: "UPCOMING",
    href: "/dashboard/compliance/audits",
    framework: "ISO 27001 Clause 9.3",
    description: "Executive review of objectives, internal audit findings, CAPA status, and resource allocation."
  },
  {
    id: "CAL-06",
    title: "Semi-Annual Risk Register Comprehensive Review",
    type: "RISK",
    date: "2026-11-20",
    frequency: "BI_ANNUAL",
    owner: "Risk Committee",
    status: "UPCOMING",
    href: "/dashboard/compliance/risks",
    framework: "ISO 27001 Clause 6.1 / 8.2",
    description: "Re-evaluation of threat landscape, residual risk acceptance renewals, and asset criticality."
  },
  {
    id: "CAL-07",
    title: "Annual Security Awareness & DPDP Training Campaign",
    type: "TRAINING",
    date: "2026-12-05",
    frequency: "ANNUAL",
    owner: "HR & Security",
    status: "UPCOMING",
    href: "/dashboard/compliance/policies",
    framework: "DPDP Act / ISO 27001 Clause 7.2",
    description: "Mandatory refresher on social engineering, credential hygiene, and personal data handling."
  },
  {
    id: "CAL-08",
    title: "External ISO/IEC 27001:2022 Stage 2 Certification Audit",
    type: "ASSURANCE",
    date: "2026-12-15",
    time: "09:00 AM IST",
    frequency: "ANNUAL",
    owner: "Lead Implementer & BSI Auditor",
    status: "UPCOMING",
    href: "/dashboard/compliance/audit-readiness",
    framework: "ISO/IEC 27001:2022",
    description: "Formal Stage 2 independent accredited certification audit covering ISMS scope and Annex A controls."
  }
];

export default function ComplianceCalendarPage() {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [currentMonth, setCurrentMonth] = useState("October 2026");

  const filteredEvents = EVENTS.filter(e => filterType === "ALL" || e.type === filterType);

  const getEventIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "AUDIT": return Shield;
      case "POLICY": return FileText;
      case "RISK": return AlertTriangle;
      case "VENDOR": return Building2;
      case "MGMT_REVIEW": return Users;
      case "DR_DRILL": return DatabaseBackup;
      case "TRAINING": return Target;
      case "ASSURANCE": return BadgeCheck;
      default: return CalendarIcon;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <CalendarIcon className="w-4 h-4" />
            <span>Compliance Cadence & Schedule</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Compliance Calendar & Operating Timelines</h1>
          <p className="text-sm text-slate-400 mt-1">
            Master lifecycle schedule for internal audits, recurring control testing, policy renewals, vendor assessments, and executive reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-bold text-slate-200">
            {currentMonth}
          </div>
          <button className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "ALL", label: "All Cadences" },
          { id: "AUDIT", label: "Audits" },
          { id: "POLICY", label: "Policies" },
          { id: "RISK", label: "Risk Reviews" },
          { id: "VENDOR", label: "Vendors" },
          { id: "MGMT_REVIEW", label: "Management Reviews" },
          { id: "DR_DRILL", label: "DR Drills" },
          { id: "TRAINING", label: "Training" },
          { id: "ASSURANCE", label: "Certification" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterType === tab.id
                ? "bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline View */}
      <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
        {filteredEvents.map(evt => {
          const Icon = getEventIcon(evt.type);
          const isDueSoon = evt.status === "DUE_SOON";

          return (
            <div key={evt.id} className="relative group">
              {/* Timeline marker */}
              <div
                className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-slate-950 flex items-center justify-center ${
                  isDueSoon ? "border-amber-400 bg-amber-400/20" : "border-cyan-400 bg-cyan-400/20"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isDueSoon ? "bg-amber-400" : "bg-cyan-400"}`} />
              </div>

              {/* Card */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-cyan-400 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-slate-400">{evt.date}</span>
                        {evt.time && <span className="text-[11px] text-slate-500">• {evt.time}</span>}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                          {evt.framework}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800/80 text-slate-400">
                          {evt.frequency}
                        </span>
                        {isDueSoon && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due in &lt; 20 Days
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                        {evt.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                        {evt.description}
                      </p>

                      <div className="text-[11px] text-slate-500 mt-2">
                        Owner: <strong className="text-slate-300">{evt.owner}</strong>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={evt.href}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 self-end md:self-center transition-colors shrink-0"
                  >
                    <span>View Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cadence Rules Info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Continuous Cadence Governance:</strong> ISO 27001 (Clause 9.2, 9.3) and SOC 2 Type II operating period requirements mandate strict recurrence rules. Missed drills, delayed policy reviews, or unreviewed vendor DPAs immediately trigger stale evidence warnings in the Audit Readiness Center.
        </div>
      </div>
    </div>
  );
}
