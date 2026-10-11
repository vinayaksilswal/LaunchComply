"use client";
import { RequestHelp } from "./RequestHelp";
import { ServiceRequests } from "./ServiceRequests";
import { ComplianceReadiness } from "./ComplianceReadiness";
export function ComplianceApplications({ applicationId }: { applicationId?: string }) {
  return <section aria-label="Compliance applications" className="space-y-4">
    <ComplianceReadiness applicationId={applicationId} />
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Scope & preparation</h2><p className="mt-1 text-sm text-slate-500">Need another framework or help completing requirements? Submit the scope for your team to review.</p></div><RequestHelp code="COMPLIANCE_HELP" label="Request preparation help" compliancePicker applicationId={applicationId} /></div>
    <ServiceRequests family="compliance" applicationId={applicationId} />
  </section>;
}
