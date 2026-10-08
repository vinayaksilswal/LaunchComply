/**
 * LaunchComply Typed API Modules
 * Direct bindings to backend API v1 endpoints.
 */

import { apiClient, API_BASE_URL, RequestOptions } from "./client";
import { waitForApiReady } from "./readiness.mjs";
import {
  DashboardData,
  SecurityFinding,
  VAPTProject,
  ArchitectureNode,
  ArchitectureEdge,
} from "@/types";

// ==========================================
// 1. AUTH API
// ==========================================
export interface AuthSession {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  full_name: string;
  organization_id: string;
  organization_name: string;
  role: string;
}

export const authApi = {
  login: async (data: { email: string; password: string }) => {
    await waitForApiReady(API_BASE_URL);
    return apiClient<AuthSession>(
      "/auth/login",
      { method: "POST", body: JSON.stringify(data) }
    );
  },
  register: async (data: { email: string; password: string; full_name: string; organization_name: string }) => {
    await waitForApiReady(API_BASE_URL);
    return apiClient<AuthSession>(
      "/auth/register",
      { method: "POST", body: JSON.stringify(data) }
    );
  },
  verifyEmail: (token: string) =>
    apiClient<{ status: string; message: string }>("/commercial/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  getMe: () => apiClient<any>("/auth/me"),
  getOrgUsers: () => apiClient<any[]>("/auth/organization/users"),
  inviteUser: (data: { email: string; role: string }) =>
    apiClient<any>("/auth/organization/users/invite", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ==========================================
// 2. DASHBOARD & ACTIONS API
// ==========================================
export const dashboardApi = {
  getOverview: (options?: RequestOptions) =>
    apiClient<DashboardData>("/dashboard/overview", options),
  getMyActions: (options?: RequestOptions) =>
    apiClient<{ actions: any[]; total_count: number }>("/dashboard/my-actions", options),
};

// ==========================================
// 3. APPLICATIONS & ARCHITECTURE API
// ==========================================
export const applicationsApi = {
  list: (params?: { limit?: number; offset?: number }) =>
    apiClient<any[]>("/applications", { params }),
  get: (id: string) => apiClient<any>(`/applications/${id}`),
  create: (data: { name: string; repository_url?: string; framework?: string }) =>
    apiClient<any>("/applications", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getEnvironments: (appId: string) =>
    apiClient<any[]>(`/applications/${appId}/environments`),
  getReleases: (appId: string) =>
    apiClient<any[]>(`/releases?application_id=${appId}`),
};

export const architectureApi = {
  getLatest: () =>
    apiClient<{
      nodes: ArchitectureNode[];
      edges: ArchitectureEdge[];
      status: string;
      version: string;
      cost_estimate?: string;
    }>("/architecture"),
  approve: (architectureId: string, notes?: string) =>
    apiClient<any>(`/architecture/${architectureId}/approve`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),
};

// ==========================================
// 4. INFRASTRUCTURE & RELEASES API
// ==========================================
export const infrastructureApi = {
  getStacks: () => apiClient<any[]>("/stacks"),
  getStack: (id: string) => apiClient<any>(`/stacks/${id}`),
  getResources: (stackId: string) =>
    apiClient<any[]>(`/stacks/${stackId}/resources`),
  getDrift: (stackId: string) => apiClient<any>(`/stacks/${stackId}/drift`),
  plan: (stackId: string) =>
    apiClient<any>(`/stacks/${stackId}/plan`, { method: "POST" }),
};

export const releasesApi = {
  list: (params?: { application_id?: string; limit?: number }) =>
    apiClient<any[]>("/releases", { params }),
  get: (releaseId: string) => apiClient<any>(`/releases/${releaseId}`),
  build: (releaseId: string) =>
    apiClient<any>(`/releases/${releaseId}/build`, { method: "POST" }),
  deploy: (releaseId: string) =>
    apiClient<any>(`/releases/${releaseId}/deploy`, { method: "POST" }),
  getSbom: (releaseId: string) =>
    apiClient<any>(`/releases/${releaseId}/sbom`),
  getArtifacts: (releaseId: string) =>
    apiClient<any[]>(`/releases/${releaseId}/artifacts`),
};

// ==========================================
// 5. OPERATIONS & INCIDENTS API
// ==========================================
export const operationsApi = {
  getEnvironmentHealth: (envId: string) =>
    apiClient<any>(`/operations/environments/${envId}/health`),
  getMetrics: (envId: string) =>
    apiClient<any>(`/operations/environments/${envId}/metrics`),
  getLogs: (envId: string, params?: { limit?: number; query?: string }) =>
    apiClient<any[]>(`/operations/environments/${envId}/logs`, { params }),
  getAlerts: (params?: { status?: string }) =>
    apiClient<any[]>("/operations/alerts", { params }),
  acknowledgeAlert: (alertId: string) =>
    apiClient<any>(`/operations/alerts/${alertId}/acknowledge`, {
      method: "PATCH",
    }),
  getIncidents: () => apiClient<any[]>("/operations/incidents"),
  createIncident: (data: { title: string; severity: string; description: string }) =>
    apiClient<any>("/operations/incidents", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resolveIncident: (incidentId: string, resolution: string) =>
    apiClient<any>(`/operations/incidents/${incidentId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution }),
    }),
  getBackups: (envId: string) =>
    apiClient<any[]>(`/operations/backups/environments/${envId}`),
  restoreDrill: (backupId: string) =>
    apiClient<any>(`/operations/backups/${backupId}/restore-drill`, {
      method: "POST",
    }),
  getCost: (envId: string) =>
    apiClient<any>(`/operations/cost/environments/${envId}`),
};

// ==========================================
// 6. SECURITY, VAPT & THREAT MODELS API
// ==========================================
export const securityApi = {
  getFindings: (params?: { severity?: string; status?: string }) =>
    apiClient<SecurityFinding[]>("/security/findings", { params }),
  acceptRisk: (findingId: string, reason: string, expiryMonths = 6) =>
    apiClient<any>(`/security/findings/${findingId}/accept-risk`, {
      method: "POST",
      body: JSON.stringify({ justification: reason, expiry_months: expiryMonths }),
    }),
  retestFinding: (findingId: string) =>
    apiClient<any>(`/security/findings/${findingId}/retest`, { method: "POST" }),
  getAssessments: () => apiClient<any[]>("/security/assessments"),
  triggerAssessment: (scopeId: string) =>
    apiClient<any>("/security/assessments/trigger", {
      method: "POST",
      body: JSON.stringify({ scope_id: scopeId }),
    }),
  getScopes: () => apiClient<any[]>("/security/scopes"),
  authorizeScope: (scopeId: string, data: any) =>
    apiClient<any>(`/security/scopes/${scopeId}/authorize`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getDrPlan: () => apiClient<any>("/security/dr/plan"),
  getTrustProfile: () => apiClient<any>("/security/trust/profile"),
};

export const vaptApi = {
  getProjects: () => apiClient<VAPTProject[]>("/vapt/projects"),
  getEngagements: () => apiClient<any[]>("/security/vapt/engagements"),
  generateReport: (projectId: string) =>
    apiClient<any>(`/security/vapt/engagements/${projectId}/report`, {
      method: "POST",
    }),
};

export const threatModelsApi = {
  list: () => apiClient<any[]>("/threat-models"),
  get: (id: string) => apiClient<any>(`/threat-models/${id}`),
  generate: (data: { application_id?: string; scope?: string }) =>
    apiClient<any>("/threat-models/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ==========================================
// 7. COMPLIANCE OS API
// ==========================================
export const complianceApi = {
  getFrameworkReadiness: (frameworkCode: string) =>
    apiClient<any>(`/compliance-os/readiness/${frameworkCode}`),
  getIso27001Status: () => apiClient<any>("/compliance-os/iso27001/status"),
  getSoc2Status: () => apiClient<any>("/compliance-os/soc2/status"),
  getPrivacyStatus: () => apiClient<any>("/compliance-os/privacy/status"),
  getRisks: () => apiClient<any[]>("/compliance-os/risks"),
  createRisk: (data: any) =>
    apiClient<any>("/compliance-os/risks", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  acceptRisk: (riskId: string, rationale: string) =>
    apiClient<any>(`/compliance-os/risks/${riskId}/accept`, {
      method: "POST",
      body: JSON.stringify({ rationale }),
    }),
  getPolicies: () => apiClient<any[]>("/compliance-os/policies"),
  getVendors: () => apiClient<any[]>("/compliance-os/vendors"),
  getTasks: (params?: { status?: string }) =>
    apiClient<any[]>("/compliance-os/tasks", { params }),
  getAudits: () => apiClient<any[]>("/compliance-os/audits"),
  getAuditPackages: () => apiClient<any[]>("/compliance-os/audit-packages"),
  getExport: (format: "csv" | "json") =>
    apiClient<any>(`/compliance-os/export?format=${format}`),
};

// ==========================================
// 8. CONTINUOUS ASSURANCE API (PHASE 11)
// ==========================================
export const assuranceApi = {
  getSummary: () => apiClient<any>("/assurance/summary"),
  getBots: () => apiClient<any[]>("/assurance/bots"),
  runBot: (botId: string) =>
    apiClient<any>(`/assurance/bots/${botId}/run`, { method: "POST" }),
  getControls: (params?: { framework?: string; status?: string }) =>
    apiClient<any[]>("/assurance/controls", { params }),
  getExceptions: () => apiClient<any[]>("/assurance/exceptions"),
  getEvidence: (params?: { framework?: string; limit?: number }) =>
    apiClient<any[]>("/assurance/evidence", { params }),
  getChain: () => apiClient<any>("/assurance/chain/verify"),
  getCustomDomains: () => apiClient<any[]>("/assurance/custom-domains"),
  registerCustomDomain: (hostname: string) =>
    apiClient<any>("/assurance/custom-domains", {
      method: "POST",
      body: JSON.stringify({ hostname }),
    }),
  verifyCustomDomain: (domainId: string) =>
    apiClient<any>(`/assurance/custom-domains/${domainId}/verify`, {
      method: "POST",
    }),
  getBranding: () => apiClient<any>("/assurance/branding"),
  saveBranding: (data: any) =>
    apiClient<any>("/assurance/branding", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getWorkpapers: (params?: { audit_period?: string }) =>
    apiClient<any[]>("/assurance/workpapers", { params }),
  createWorkpaper: (data: any) =>
    apiClient<any>("/assurance/workpapers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getReviewThreads: (evidenceId: string) =>
    apiClient<any[]>(`/assurance/evidence/${evidenceId}/threads`),
};

// ==========================================
// 9. COMMERCIAL, BILLING & SUPPORT API
// ==========================================
export const billingApi = {
  getSubscription: () => apiClient<any>("/commercial/subscription"),
  getInvoices: () => apiClient<any[]>("/commercial/invoices"),
  getUsage: () => apiClient<any>("/commercial/usage"),
  getPlans: () => apiClient<any[]>("/commercial/plans"),
  upgradePlan: (planCode: string) =>
    apiClient<any>("/commercial/upgrade", {
      method: "POST",
      body: JSON.stringify({ plan_code: planCode }),
    }),
  submitCancellationFeedback: (data: { reason: string; feedback?: string; competitor_name?: string }) =>
    apiClient<any>("/commercial/feedback/cancellation", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const crmApi = {
  submitDemoRequest: (data: {
    name: string;
    email: string;
    company: string;
    phone?: string;
    source?: string;
    use_case?: string;
    company_size?: string;
    cloud_provider?: string;
    current_deployment?: string;
    desired_compliance?: string;
    notes?: string;
  }) =>
    apiClient<any>("/commercial/crm/demo-request", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getProposalTemplates: () =>
    apiClient<any[]>("/commercial/services/proposal-templates"),
};

export const supportApi = {
  getTickets: () => apiClient<any[]>("/commercial/support/tickets"),
  createTicket: (data: { subject: string; priority: string; description: string }) =>
    apiClient<any>("/commercial/support/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getTicket: (ticketId: string) =>
    apiClient<any>(`/commercial/support/tickets/${ticketId}`),
};

// ==========================================
// 10. ENTERPRISE IDENTITY & PARTNER API
// ==========================================
export const enterpriseApi = {
  getSsoConfig: () => apiClient<any>("/enterprise/sso/config"),
  configureSso: (data: any) =>
    apiClient<any>("/enterprise/sso/configure", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getScimConfig: () => apiClient<any>("/enterprise/scim/config"),
  getBusinessUnits: () => apiClient<any[]>("/enterprise/business-units"),
  getServiceAccounts: () => apiClient<any[]>("/enterprise/service-accounts"),
  getWebhooks: () => apiClient<any[]>("/enterprise/webhooks"),
  getContracts: () => apiClient<any[]>("/enterprise/contracts"),
};

export const partnerApi = {
  getPortfolio: (partnerId: string) =>
    apiClient<any>(`/partner/${partnerId}/portfolio`),
  register: (data: any) =>
    apiClient<any>("/partner/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  inviteRelationship: (data: { customer_email: string; scope: string }) =>
    apiClient<any>("/partner/relationships/invite", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  approveRelationship: (relId: string) =>
    apiClient<any>(`/partner/relationships/${relId}/approve`, {
      method: "POST",
    }),
  revokeRelationship: (relId: string) =>
    apiClient<any>(`/partner/relationships/${relId}/revoke`, {
      method: "POST",
    }),
};

// ==========================================
// 11. PLATFORM ADMIN API
// ==========================================
export const platformAdminApi = {
  getOverview: () => apiClient<any>("/platform-admin/overview"),
  getCustomers: () => apiClient<any[]>("/platform-admin/customers"),
  getCustomerHealth: (customerId: string) =>
    apiClient<any>(`/platform-admin/customers/${customerId}/health`),
  getLaunchGates: () => apiClient<any>("/platform-admin/launch-gates"),
  getLaunchReadiness: () => apiClient<any>("/platform-admin/launch-readiness"),
  getProvidersMatrix: () => apiClient<any>("/platform-admin/providers-matrix"),
  getSubscriptions: () => apiClient<any[]>("/platform-admin/subscriptions"),
  getTrials: () => apiClient<any[]>("/platform-admin/trials"),
  getSupportQueue: () => apiClient<any[]>("/platform-admin/support"),
  getFeatureFlags: () => apiClient<any[]>("/platform-admin/feature-flags"),
  toggleFeatureFlag: (key: string, enabled: boolean) =>
    apiClient<any>(`/platform-admin/feature-flags/${key}/toggle`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
  getStatusIncidents: () => apiClient<any[]>("/platform-admin/status-incidents"),
  getGaStatus: () => apiClient<any>("/platform-admin/ga/status"),
  getFirstTenCustomers: (realOnly: boolean = false) =>
    apiClient<any[]>("/platform-admin/customers/first-10", { params: { real_only: realOnly } }),
  updateFirstCustomerStage: (orgId: string, data: { stage: string; next_action?: string; internal_owner?: string; notes?: string; onboarding_blocker?: string }) =>
    apiClient<any>(`/platform-admin/customers/first-10/${orgId}`, {
      method: "PATCH",
      params: data,
    }),
  getRevenueDashboard: () => apiClient<any>("/platform-admin/revenue-dashboard"),
  getRevenueDrilldown: () => apiClient<any>("/platform-admin/revenue/drilldown"),
  getRevenueAuditExport: () => apiClient<any>("/platform-admin/revenue/audit-export"),
  getBillingActivation: () => apiClient<any>("/platform-admin/billing/activation"),
  validateBillingProvider: (provider: string) =>
    apiClient<any>("/platform-admin/billing/activation/validate", {
      method: "POST",
      params: { provider },
    }),
  reconcileInvoice: (invoiceId: string, data: { bank_reference: string; amount: number; verified_by?: string; payment_source?: string; notes?: string }) =>
    apiClient<any>(`/platform-admin/invoices/${invoiceId}/reconcile`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getOnboardingBlockers: () => apiClient<any>("/platform-admin/onboarding/blockers"),
  getManualAssistanceTasks: (orgId?: string) =>
    apiClient<any>("/platform-admin/manual-assistance", { params: orgId ? { org_id: orgId } : undefined }),
  logManualAssistanceTask: (data: any) =>
    apiClient<any>("/platform-admin/manual-assistance", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getRoadmapCandidates: (status?: string) =>
    apiClient<any>("/platform-admin/roadmap/candidates", { params: status ? { status } : undefined }),
  createRoadmapCandidate: (data: any) =>
    apiClient<any>("/platform-admin/roadmap/candidates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getSalesIntelligence: () => apiClient<any>("/platform-admin/sales/intelligence"),
  getExperiments: (status?: string) =>
    apiClient<any>("/platform-admin/experiments", { params: status ? { status } : undefined }),
  createExperiment: (data: any) =>
    apiClient<any>("/platform-admin/experiments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getWeeklyOperatingReview: () => apiClient<any>("/platform-admin/operating-review"),
  getCohorts: () => apiClient<any[]>("/platform-admin/cohorts"),
  getActivationFunnel: () => apiClient<any>("/platform-admin/activation-funnel"),
  getPricingCatalog: () => apiClient<any[]>("/platform-admin/pricing-catalog"),
  getEmailHealth: () => apiClient<any>("/platform-admin/email-health"),
  extendTrial: (orgId: string, data: { additional_days?: number; reason?: string }) =>
    apiClient<any>(`/platform-admin/trials/${orgId}/extend`, {
      method: "POST",
      params: data,
    }),
  getCustomerSuccessOverview: () => apiClient<any>("/platform-admin/customer-success/overview"),
  getCustomerSuccessTasks: () => apiClient<any[]>("/platform-admin/customer-success/tasks"),
  createCustomerSuccessTask: (data: { organization_id: string; title: string; days_due?: number; owner?: string }) =>
    apiClient<any>("/platform-admin/customer-success/tasks", {
      method: "POST",
      params: data,
    }),
  getSupportMacros: () => apiClient<any[]>("/platform-admin/support/macros"),
  convertSupportToFeedback: (ticketId: string, data: { category?: string; comment?: string }) =>
    apiClient<any>(`/platform-admin/support/${ticketId}/convert-feedback`, {
      method: "POST",
      params: data,
    }),
  resetDemoTenant: () => apiClient<any>("/platform-admin/demo/reset", { method: "POST" }),
  // Phase 15: Customer Operations & Empirical Conversion
  getCustomerBoard: (realOnly: boolean = true) =>
    apiClient<any[]>("/platform-admin/customers/board", { params: { real_only: realOnly } }),
  transitionCustomerStage: (orgId: string, data: any) =>
    apiClient<any>(`/platform-admin/customers/${orgId}/stage`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getCustomerStageHistory: (orgId: string) =>
    apiClient<any[]>(`/platform-admin/customers/${orgId}/stage-history`),
  getPaidCustomerGate: (orgId: string) =>
    apiClient<any>(`/platform-admin/customers/${orgId}/paid-gate`),
  convertToPaid: (orgId: string, data: any) =>
    apiClient<any>(`/platform-admin/customers/${orgId}/convert-to-paid`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getCustomerInterviews: (orgId?: string) =>
    apiClient<any[]>("/platform-admin/customers/interviews", { params: orgId ? { organization_id: orgId } : undefined }),
  logCustomerInterview: (orgId: string, data: any) =>
    apiClient<any>(`/platform-admin/customers/${orgId}/interviews`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getProductWedgeAnalysis: () => apiClient<any>("/platform-admin/product-wedge-analysis"),
  recordPilotDecision: (orgId: string, data: any) =>
    apiClient<any>(`/platform-admin/customers/${orgId}/pilot-decision`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAwsCloudFormationTemplate: (orgId?: string, region?: string) =>
    apiClient<any>("/platform-admin/aws/cloudformation-template", { params: { organization_id: orgId, region } }),
  getAwsManualIamConfig: (orgId?: string) =>
    apiClient<any>("/platform-admin/aws/manual-iam-config", { params: { organization_id: orgId } }),
  verifyAwsConnection: (data: any) =>
    apiClient<any>("/platform-admin/aws/verify-connection", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  requestAwsSetupHelp: (data: any) =>
    apiClient<any>("/platform-admin/aws/request-help", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAwsFailureAnalytics: () => apiClient<any>("/platform-admin/aws/failure-analytics"),
  getAwsIdentity: (partition?: string) =>
    apiClient<any>("/platform-admin/aws/identity", { params: { partition } }),
  getAwsPermissionsManifest: () =>
    apiClient<any>("/platform-admin/aws/permissions/manifest"),
  generateVersionedAwsTemplate: (data: any) =>
    apiClient<any>("/platform-admin/aws/template/versioned", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  observeAwsStack: (data: any) =>
    apiClient<any>("/platform-admin/aws/stack/observe", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  diffTrustPolicy: (data: any) =>
    apiClient<any>("/platform-admin/aws/trust/diff", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  discoverAwsResources: (data: any) =>
    apiClient<any>("/platform-admin/aws/discover", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getAwsFunnelAnalytics: (includeTestOrgs?: boolean) =>
    apiClient<any>("/platform-admin/aws/funnel", { params: { include_test_orgs: includeTestOrgs } }),
  disconnectAwsAccount: (data: any) =>
    apiClient<any>("/platform-admin/aws/disconnect", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // Phase 17: Production Delivery, Customer Acceptance & Bank Reconciliation
  getDeliveryPreconditions: (orgId: string) =>
    apiClient<any>(`/platform-admin/delivery/preconditions/${orgId}`),
  reviewDeploymentPlan: (data: any) =>
    apiClient<any>("/platform-admin/delivery/plan/review", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  recordDeploymentApproval: (data: any) =>
    apiClient<any>("/platform-admin/delivery/approval", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  executeProductionApply: (data: any) =>
    apiClient<any>("/platform-admin/delivery/apply", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  verifyReleaseHealth: (data: any) =>
    apiClient<any>("/platform-admin/delivery/release/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  verifyDomainTls: (data: any) =>
    apiClient<any>("/platform-admin/delivery/domain/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getMonitoringBackupStatus: (orgId: string) =>
    apiClient<any>(`/platform-admin/delivery/monitoring-backup/${orgId}`),
  getSecurityBaseline: (orgId: string, isProduction: boolean = true) =>
    apiClient<any>(`/platform-admin/delivery/security-baseline/${orgId}`, {
      params: { is_production: isProduction },
    }),
  getReadinessReport: (orgId: string) =>
    apiClient<any>(`/platform-admin/delivery/readiness-report/${orgId}`),
  submitCustomerAcceptance: (data: any) =>
    apiClient<any>("/platform-admin/delivery/acceptance", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  recordValueInterview: (data: any) =>
    apiClient<any>("/platform-admin/delivery/interview", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  reconcileBankPayment: (data: any) =>
    apiClient<any>("/platform-admin/delivery/reconcile-payment", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getDeliveryBoard: () =>
    apiClient<any>("/platform-admin/delivery/board"),
};

// ==========================================
// 11.1 CLOUD ACCOUNTS & ONBOARDING API (Phase 16)
// ==========================================
export const cloudApi = {
  getConnectionState: () => apiClient<any>("/cloud/connection-state"),
  getOnboardingTemplate: () => apiClient<any>("/cloud/aws/onboarding-template"),
  listAccounts: () => apiClient<any[]>("/cloud/accounts"),
  connectAccount: (data: any) =>
    apiClient<any>("/cloud/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  disconnectAccount: (id: string, reason?: string) =>
    apiClient<any>(`/cloud/accounts/${id}/disconnect`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// ==========================================
// 12. AI COPILOT API
// ==========================================
export const copilotApi = {
  query: (data: { prompt: string; mode?: string; context?: any }) =>
    apiClient<{
      answer: string;
      mode: string;
      sources: any[];
      action_proposals?: any[];
      confidence?: number;
    }>("/copilot/query", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  reviewProposal: (proposalId: string, approved: boolean) =>
    apiClient<any>(`/copilot/proposals/${proposalId}/review`, {
      method: "POST",
      body: JSON.stringify({ approved }),
    }),
};
