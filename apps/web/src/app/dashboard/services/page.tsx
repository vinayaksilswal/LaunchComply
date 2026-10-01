"use client";

import { useState } from "react";
import { Briefcase, ArrowRight, CheckCircle2, Clock, ShieldCheck, Sparkles, Send } from "lucide-react";

interface ServiceCard {
  code: string;
  title: string;
  category: string;
  price: string;
  duration: string;
  description: string;
  deliverables: string[];
}

const SERVICES: ServiceCard[] = [
  {
    code: "DEPLOY_APP",
    title: "Deploy My Application",
    category: "Cloud Architecture",
    price: "₹45,000 - ₹90,000",
    duration: "3 - 5 business days",
    description: "Complete turnkey deployment of your local code into production AWS with least privilege cross-account role.",
    deliverables: ["VPC Multi-AZ Setup", "ECS Fargate & ECR", "RDS PostgreSQL Multi-AZ", "CloudFront CDN + WAF", "CI/CD Pipeline Setup"]
  },
  {
    code: "ARCH_REVIEW",
    title: "AWS Architecture & Well-Architected Review",
    category: "Cloud Architecture",
    price: "₹35,000 - ₹65,000",
    duration: "2 - 4 business days",
    description: "In-depth review against the 6 AWS Well-Architected Framework pillars with prioritized risk remediation.",
    deliverables: ["Pillar-by-Pillar Gap Analysis", "High-Risk Issue (HRI) Report", "Terraform Refactoring Guidance", "Cost Optimization Roadmap"]
  },
  {
    code: "VAPT_PRO",
    title: "Professional Web API & Infrastructure VAPT",
    category: "Security & VAPT",
    price: "₹75,000 - ₹1,50,000",
    duration: "7 - 10 business days",
    description: "Rigorous human penetration testing by OSCP & CRTP certified offensive security engineers.",
    deliverables: ["OWASP Top 10 Assessment", "API Business Logic Testing", "Executive Attestation Letter", "Remediation Retesting Window"]
  },
  {
    code: "DPDP_READINESS",
    title: "India DPDP Act (2023) Privacy Readiness",
    category: "Privacy & Legal",
    price: "₹60,000 - ₹1,20,000",
    duration: "1 - 2 weeks",
    description: "Data inventory mapping, lawful basis review, consent notice implementation, and subprocessor DPA audits.",
    deliverables: ["Data Processing Inventory", "Privacy Policy & Notice", "Data Principal Request Workflow", "DPA Standard Template"]
  },
  {
    code: "ISO27001_ACCEL",
    title: "ISO/IEC 27001:2022 Accelerator",
    category: "Compliance Advisory",
    price: "₹1,50,000 - ₹3,00,000",
    duration: "3 - 4 weeks",
    description: "Hands-on preparation for external ISO 27001 Stage 1 & 2 certification audits across 93 Annex A controls.",
    deliverables: ["ISMS Scope Document", "Statement of Applicability (SoA)", "Risk Treatment Plan", "Internal Audit Execution"]
  },
  {
    code: "SOC2_READINESS",
    title: "SOC 2 Type II Enterprise Preparation",
    category: "Compliance Advisory",
    price: "₹1,80,000 - ₹3,50,000",
    duration: "4 - 6 weeks",
    description: "Build an audit-ready control environment to satisfy enterprise client vendor security assessments.",
    deliverables: ["Trust Services Criteria Scoping", "Control Monitoring Automation", "Evidence Vault Population", "Auditor Walkthrough Dry Run"]
  },
  {
    code: "AWS_HARDENING",
    title: "AWS Security Hardening & DevSecOps",
    category: "Security Engineering",
    price: "₹50,000 - ₹85,000",
    duration: "3 - 5 business days",
    description: "Zero-trust hardening: IAM boundary lockdown, GuardDuty, KMS CMK enforcement, and AWS WAF rate-limiting.",
    deliverables: ["IAM Permissions Boundaries", "WAF Custom Managed Rules", "CloudTrail S3 Object Locking", "Secret Rotation Automation"]
  },
  {
    code: "MANAGED_COMPLY",
    title: "Managed Cloud & Continuous Compliance",
    category: "Retainer Advisory",
    price: "₹35,000 / month",
    duration: "Ongoing monthly retainer",
    description: "Continuous compliance monitoring, quarterly restore testing, subprocessor reviews, and monthly security scans.",
    deliverables: ["Dedicated Security Architect", "Quarterly Restore Testing", "Subprocessor Risk Audits", "1-Hour Critical SLA Support"]
  }
];

export default function ServicesPage() {
  const [selectedService, setSelectedService] = useState<ServiceCard | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmitRequest = async () => {
    try {
      await fetch("/api/backend/services/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_code: selectedService?.code,
          title: selectedService?.title,
          customer_notes: notes
        })
      });
    } catch {
      // Offline fallback
    }
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedService(null);
      setNotes("");
    }, 2000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-cyan-400" />
            Professional Services Marketplace
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Certified cloud architects, offensive security engineers (OSCP), and compliance consultants on demand.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {SERVICES.map((s) => (
          <div
            key={s.code}
            className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-cyan-500/40 transition-all hover:bg-slate-850/60"
          >
            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider font-mono">
                  {s.category}
                </span>
                <h3 className="font-bold text-white text-sm mt-0.5">{s.title}</h3>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>

              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Key Deliverables:</div>
                <ul className="text-[11px] text-slate-300 space-y-1">
                  {s.deliverables.slice(0, 3).map((d, i) => (
                    <li key={i} className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white font-mono">{s.price}</div>
                <div className="text-[10px] text-slate-400">{s.duration}</div>
              </div>
              <button
                onClick={() => setSelectedService(s)}
                className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/50 text-xs font-semibold transition-colors"
              >
                Request Service
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Service Request Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 font-mono">Service Engagement</span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedService.title}</h3>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Engagement Request Submitted!</h4>
                <p className="text-xs text-slate-400">
                  Our lead architect will contact you within 2 business hours with a preliminary scope and proposal.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Cost:</span>
                    <span className="text-white font-bold font-mono">{selectedService.price}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-slate-400">Timeline:</span>
                    <span className="text-slate-300 font-mono">{selectedService.duration}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Application Details & Requirements
                  </label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe your timeline, current AWS architecture, compliance deadline, or specific enterprise questionnaire requirements..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setSelectedService(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitRequest}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 hover:opacity-95 text-slate-950 font-bold shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
