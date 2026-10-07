/**
 * LaunchComply Consolidated API Export
 * Seamlessly exposes the central client, typed domain modules, and backwards-compatible helpers.
 */

export * from "./api/index";

import { DashboardData } from "@/types";
import { dashboardApi } from "./api/modules";

export const fallbackDemoData: DashboardData = {
  organization_id: "demo-org-acmecloud-987",
  organization_name: "AcmeCloud SaaS",
  application_name: "Acme SaaS Web Platform",
  environment: "Production",
  application_status: "HEALTHY",
  production_readiness: "84%",
  security_posture: "81%",
  compliance_readiness: "67%",
  backup_status: "HEALTHY",
  domain: "app.acmecloud.io",
  domain_verified: true,
  https_active: true,
  critical_findings: 1,
  high_findings: 3,
  medium_findings: 8,
  aws_monthly_estimate: "₹38,500",
  frameworks: ["React / Vite", "FastAPI (Python 3.11)", "PostgreSQL 16 Multi-AZ"],
  infrastructure: ["CloudFront", "AWS WAF", "ALB", "ECS Fargate", "RDS Multi-AZ", "Redis", "S3 KMS"],
  compliance_scores: [
    { framework_code: "DPDP", framework_name: "India DPDP Act (2023)", readiness_percentage: "76%", passing_controls: "38", total_controls: "50" },
    { framework_code: "ISO27001", framework_name: "ISO/IEC 27001:2022", readiness_percentage: "64%", passing_controls: "60", total_controls: "93" },
    { framework_code: "SOC2", framework_name: "SOC 2 Type II", readiness_percentage: "58%", passing_controls: "41", total_controls: "71" },
  ],
  recent_findings: [
    {
      id: "sec-01",
      title: "PostgreSQL Public Accessibility Risk in Backup Subnet Route Table",
      severity: "CRITICAL",
      status: "OPEN",
      cvss_score: "9.1",
      category: "Database Security",
      owasp_mapping: "A05:2021-Security Misconfiguration",
      description: "The secondary DB subnet has a legacy 0.0.0.0/0 route via an Internet Gateway instead of exclusively communicating over Private NAT.",
      suggested_fix: "Revoke 0.0.0.0/0 route in rt-08992a. Ensure DB Subnet Group is exclusively associated with isolated private route table.",
      affected_asset: "AWS RouteTable / RDS Subnet Group",
    },
    {
      id: "sec-02",
      title: "CORS Policy Allows Wildcard Origin on Sensitive Authentication Endpoints",
      severity: "HIGH",
      status: "OPEN",
      cvss_score: "7.8",
      category: "API Security",
      owasp_mapping: "A01:2021-Broken Access Control",
      description: "FastAPI CORS middleware is currently permitting Access-Control-Allow-Origin: * for /api/v1/auth and /api/v1/billing routes.",
      suggested_fix: "Restrict allowed origins strictly to ['https://app.acmecloud.io'] in app/core/config.py.",
      affected_asset: "FastAPI /api/v1/* routes",
    },
  ],
};

export async function fetchDashboardData(): Promise<DashboardData> {
  return dashboardApi.getOverview();
}
