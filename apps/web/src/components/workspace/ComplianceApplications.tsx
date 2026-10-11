"use client";
import Link from "next/link";
import { ServiceRequests } from "./ServiceRequests";
import { ComplianceReadiness } from "./ComplianceReadiness";
export function ComplianceApplications({ applicationId }: { applicationId?: string }) {
  return <section aria-label="Compliance applications" className="space-y-4">
    <ComplianceReadiness applicationId={applicationId} />
    <Link href={`/dashboard/services?service=COMPLIANCE_HELP${applicationId ? `&application=${encodeURIComponent(applicationId)}` : ""}`} className="text-sm font-semibold text-cyan-700">Service requests</Link>
    <ServiceRequests family="compliance" applicationId={applicationId} />
  </section>;
}
