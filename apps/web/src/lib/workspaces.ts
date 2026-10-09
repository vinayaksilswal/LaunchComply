export interface WorkspaceModule { key: string; title: string; description: string; empty: string; group: string; }
export const MODULES: WorkspaceModule[] = [
  { key: "deployments", title: "Deployments", description: "Prepare your business architecture for deployment and request a review.", empty: "Your recorded deployment history will appear here. Complete the preparation steps and request an infrastructure review to continue.", group: "Launch" },
  { key: "releases", title: "App releases", description: "The release history recorded for this application.", empty: "This app has no recorded releases yet.", group: "Launch" },
  { key: "environments", title: "App environments", description: "The environments saved for this application.", empty: "No environments have been configured for this app.", group: "Launch" },
  { key: "operations", title: "App health", description: "See connected cloud accounts and monitoring observations.", empty: "Live AWS monitoring is not connected. Availability, response times, and service health cannot be verified yet.", group: "Operate" },
  { key: "logs", title: "Activity log", description: "Events recorded by LaunchComply for your business. Cloud runtime logs are not connected.", empty: "Your workspace events will appear here as you work.", group: "Operate" },
  { key: "incidents", title: "Incidents", description: "Track reported issues affecting your applications.", empty: "No incidents have been recorded. This does not confirm that your app has been monitored.", group: "Operate" },
  { key: "backups", title: "Backups", description: "Review backup observations recorded for your applications.", empty: "No backup observations are available. Connect a backup provider before relying on recovery coverage.", group: "Operate" },
  { key: "cost", title: "Cloud costs", description: "Review recorded cloud cost snapshots.", empty: "Your AWS billing data is not connected. No spending or savings figures are available yet.", group: "Operate" },
  { key: "security", title: "Security findings", description: "Review recorded issues and their current handling status.", empty: "No security findings have been recorded. A security assessment is needed before your app can be considered assessed.", group: "Protect" },
  { key: "threat-models", title: "Threat models", description: "Review recorded security design assessments.", empty: "No threat models have been recorded for this business.", group: "Protect" },
  { key: "vapt", title: "Security assessments", description: "Review assessment projects for your applications.", empty: "No security assessment projects have been recorded. Testing requires an agreed scope and authorization.", group: "Protect" },
  { key: "dr", title: "Recovery tests", description: "Review recorded restore and disaster recovery tests.", empty: "No recovery tests have been recorded. Recovery readiness has not been verified.", group: "Protect" },
  { key: "compliance", title: "Compliance", description: "Manage the evidence and records needed for business compliance.", empty: "Your business has no recorded compliance assessments. No compliance score is available.", group: "Govern" },
  { key: "policies", title: "Policies", description: "Your business policy library and recorded approval status.", empty: "No business policies have been recorded.", group: "Govern" },
  { key: "risks", title: "Risk register", description: "Review risks recorded for your business.", empty: "No risks have been recorded. This does not mean a risk assessment has been completed.", group: "Govern" },
  { key: "vendors", title: "Vendors", description: "Review the vendors recorded by your business.", empty: "No vendors have been recorded.", group: "Govern" },
  { key: "privacy", title: "Privacy", description: "Review recorded personal data inventory items.", empty: "Your business has no recorded data inventory yet.", group: "Govern" },
  { key: "actions", title: "Tasks", description: "The compliance tasks recorded for your business.", empty: "You have no recorded compliance tasks.", group: "Govern" },
  { key: "calendar", title: "Task calendar", description: "Review recorded compliance tasks and their details.", empty: "No compliance tasks have been recorded yet.", group: "Govern" },
  { key: "audits", title: "Audits", description: "Review audit projects recorded for your business.", empty: "No audits have been recorded.", group: "Govern" },
  { key: "audit-packages", title: "Audit packages", description: "Review recorded collections of audit evidence.", empty: "No audit packages have been recorded. Reports are not generated until evidence is available.", group: "Govern" },
  { key: "audit-readiness", title: "Control records", description: "Review recorded control implementation status.", empty: "No control implementation records are available. Audit readiness has not been assessed.", group: "Govern" },
  { key: "iso27001", title: "ISO 27001 records", description: "Review your recorded statement of applicability entries.", empty: "No statement of applicability entries have been recorded.", group: "Govern" },
  { key: "soc2", title: "Control implementations", description: "Recorded business controls. Framework mapping must be reviewed separately.", empty: "No control implementations have been recorded.", group: "Govern" },
  { key: "contracts", title: "Contracts", description: "Review business contracts and their recorded status.", empty: "No contracts have been recorded.", group: "Govern" },
  { key: "trust", title: "Assurance records", description: "Review recorded external assurance documents.", empty: "No external assurance records have been recorded. No certification is claimed.", group: "Govern" },
  { key: "assurance", title: "Evidence & controls", description: "Review the control monitoring records saved for your business.", empty: "No control monitoring records are available. Continuous monitoring is not verified.", group: "Govern" },
  { key: "bots", title: "Evidence collectors", description: "Review the evidence collector configurations recorded for your business.", empty: "No evidence collectors have been configured.", group: "Govern" },
  { key: "controls", title: "Control monitoring", description: "Review recorded control monitoring status.", empty: "No control monitors have been recorded.", group: "Govern" },
  { key: "evidence", title: "Evidence records", description: "Review evidence observations recorded for your business.", empty: "No evidence observations have been recorded.", group: "Govern" },
  { key: "exceptions", title: "Control exceptions", description: "Review exceptions recorded against business controls.", empty: "No control exceptions have been recorded.", group: "Govern" },
  { key: "notifications", title: "Notifications", description: "Customer updates and published reports from your service applications.", empty: "No service delivery updates have been recorded for your business yet.", group: "Business" },
  { key: "team", title: "Your team", description: "People with active membership in this business.", empty: "No active team members are available.", group: "Business" },
  { key: "billing", title: "Billing", description: "Review invoices recorded for your business.", empty: "No invoices have been recorded. Online payment collection is not enabled in this workspace.", group: "Business" },
  { key: "usage", title: "Usage records", description: "Review recorded product usage events.", empty: "No product usage events have been recorded.", group: "Business" },
  { key: "services", title: "Service requests", description: "Review business service requests and their recorded status.", empty: "No service requests have been recorded.", group: "Business" },
  { key: "support", title: "Support requests", description: "Review support tickets recorded for your business.", empty: "No support tickets have been recorded.", group: "Business" },
  { key: "business-units", title: "Business units", description: "Review organizational groups recorded for your business.", empty: "No business units have been recorded.", group: "Business" },
  { key: "sso", title: "Single sign-on", description: "Review business identity provider configurations.", empty: "No identity provider configuration has been recorded. Single sign-on is not enabled.", group: "Business" },
  { key: "workpapers", title: "Audit workpapers", description: "Review workpapers recorded for your business.", empty: "No audit workpapers have been recorded.", group: "Govern" },
];
export const modulePath = (key: string) => {
  if (["policies", "risks", "vendors", "privacy", "actions", "calendar", "audits", "audit-packages", "audit-readiness", "iso27001", "soc2"].includes(key)) return `/dashboard/compliance/${key}`;
  if (["bots", "controls", "evidence", "exceptions"].includes(key)) return `/dashboard/assurance/${key}`;
  if (key === "threat-models") return "/dashboard/security/threat-models";
  if (key === "sso") return "/dashboard/settings/security/sso";
  if (key === "workpapers") return "/audit/workpapers";
  return `/dashboard/${key}`;
};
