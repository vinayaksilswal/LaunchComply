"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  Users,
  Globe,
  Lock,
  Server,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldAlert,
  FileCode,
  Sliders,
  Trash2,
} from "lucide-react";

export default function EnterpriseSSOPage() {
  const [activeTab, setActiveTab] = useState<"sso" | "scim" | "domains" | "policies" | "service_accounts">("sso");

  // Domain verification state
  const [domains, setDomains] = useState([
    {
      id: "dom-1",
      domain: "globalcorp.com",
      method: "DNS_TXT",
      token: "lc-verify-8f92b714c3e1a029",
      verified: true,
      verifiedAt: "2026-10-02 14:32 UTC",
    },
    {
      id: "dom-2",
      domain: "acmecloud.io",
      method: "DNS_TXT",
      token: "lc-verify-3e4a90b1c782d44f",
      verified: true,
      verifiedAt: "2026-10-01 09:15 UTC",
    },
  ]);
  const [newDomain, setNewDomain] = useState("");

  // SSO Config state
  const [ssoProvider, setSsoProvider] = useState("SAML");
  const [entityId, setEntityId] = useState("https://app.launchcomply.com/saml/metadata");
  const [acsUrl, setAcsUrl] = useState("https://app.launchcomply.com/saml/acs");
  const [idpSsoUrl, setIdpSsoUrl] = useState("https://globalcorp.okta.com/app/sso/saml");
  const [idpIssuer, setIdpIssuer] = useState("http://www.okta.com/exk920194819");
  const [ssoMode, setSsoMode] = useState<"OPTIONAL" | "REQUIRED" | "REQUIRED_EXCEPT_BREAK_GLASS">("OPTIONAL");
  const [testLoginDone, setTestLoginDone] = useState(true);
  const [testSuccessNotice, setTestSuccessNotice] = useState(false);

  // Group Mappings
  const [groupMappings, setGroupMappings] = useState([
    { idpGroup: "LaunchComply-DevOps", role: "DEVOPS" },
    { idpGroup: "LaunchComply-Security", role: "SECURITY" },
    { idpGroup: "LaunchComply-Compliance", role: "COMPLIANCE" },
    { idpGroup: "LaunchComply-Auditors", role: "AUDITOR" },
  ]);

  // SCIM state
  const [scimEndpoint] = useState("https://api.launchcomply.com/scim/v2");
  const [scimToken, setScimToken] = useState("lc_scim_9a7b3c2d1e0f485761a29384c5d6e7f8");
  const [copiedToken, setCopiedToken] = useState(false);
  const [syncStatus] = useState({
    active: true,
    usersSynced: 42,
    groupsSynced: 6,
    deprovisionedUsers: 3,
    lastSync: "2 minutes ago",
    errors: [],
  });

  // Access Policies
  const [policies, setPolicies] = useState({
    requireMfa: true,
    sessionDuration: 720,
    maxIdleTime: 60,
    allowedDomains: "globalcorp.com, acmecloud.io",
    approvedIpRanges: "103.21.244.0/24, 198.51.100.0/24",
  });

  // Service Accounts
  const [serviceAccounts, setServiceAccounts] = useState([
    {
      id: "sa-1",
      name: "CI/CD Deployment Bot",
      purpose: "Automated GitHub Actions container builds and ECS rollouts",
      scopes: ["applications.read", "deployments.execute"],
      status: "ACTIVE",
      prefix: "lc_live_...",
      expiresAt: "2027-01-01",
    },
    {
      id: "sa-2",
      name: "SIEM & SOC Telemetry Ingestion",
      purpose: "Read-only access for Splunk / Datadog audit event streaming",
      scopes: ["security.read", "evidence.read"],
      status: "ACTIVE",
      prefix: "lc_live_...",
      expiresAt: "2026-12-31",
    },
  ]);
  const [showTokenModal, setShowTokenModal] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleTestLogin = () => {
    setTestLoginDone(true);
    setTestSuccessNotice(true);
    setTimeout(() => setTestSuccessNotice(false), 4000);
  };

  const handleEnforceSSO = (mode: "OPTIONAL" | "REQUIRED" | "REQUIRED_EXCEPT_BREAK_GLASS") => {
    if (mode === "REQUIRED" && !testLoginDone) {
      alert("Lockout protection safeguard: You must execute a successful test SSO login before enforcing REQUIRED SSO mode.");
      return;
    }
    setSsoMode(mode);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Enterprise Identity & Access</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-300">
              PHASE 10 ENTERPRISE
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Provider-neutral SAML 2.0, OIDC SSO, SCIM 2.0 user directory provisioning, access policies, and scoped API tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestLogin}
            className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Test SSO Connection
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            SSO Ready
          </div>
        </div>
      </div>

      {testSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">SAML 2.0 Test Login Succeeded</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Verified IdP signature, issuer, audience, and time skew window. Identity mapped to role: <strong>SECURITY</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("sso")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "sso"
              ? "border-cyan-600 text-cyan-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Single Sign-On (SSO)
        </button>

        <button
          onClick={() => setActiveTab("scim")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "scim"
              ? "border-cyan-600 text-cyan-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          SCIM Directory Sync
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
            42 Users
          </span>
        </button>

        <button
          onClick={() => setActiveTab("domains")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "domains"
              ? "border-cyan-600 text-cyan-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Globe className="w-4 h-4" />
          Verified Domains
        </button>

        <button
          onClick={() => setActiveTab("policies")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "policies"
              ? "border-cyan-600 text-cyan-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Access Policies
        </button>

        <button
          onClick={() => setActiveTab("service_accounts")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "service_accounts"
              ? "border-cyan-600 text-cyan-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Server className="w-4 h-4" />
          Service Accounts & API Keys
        </button>
      </div>

      {/* Tab 1: SSO */}
      {activeTab === "sso" && (
        <div className="space-y-6">
          {/* Enforcement Mode Alert */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">SSO Enforcement Policy: {ssoMode}</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  {ssoMode === "REQUIRED"
                    ? "Normal password login is strictly blocked for verified corporate domains. Break-glass admin bypass is enabled."
                    : "SSO is currently optional. Employees can sign in using password or SAML 2.0."}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEnforceSSO("OPTIONAL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  ssoMode === "OPTIONAL" ? "bg-white border-amber-400 font-semibold shadow-sm" : "bg-transparent border-transparent text-amber-800"
                }`}
              >
                Optional
              </button>
              <button
                onClick={() => handleEnforceSSO("REQUIRED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  ssoMode === "REQUIRED" ? "bg-amber-600 text-white font-semibold shadow-sm" : "bg-transparent border-amber-300 text-amber-800"
                }`}
              >
                Enforce Required
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SP Metadata */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-600" />
                Service Provider (LaunchComply) Configuration
              </h3>
              <p className="text-xs text-slate-500">Provide these URLs to your Identity Provider (Okta, Entra ID, PingIdentity).</p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Entity ID / Audience URI</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={entityId}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
                    />
                    <button onClick={() => handleCopy(entityId)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">ACS URL (Assertion Consumer Service)</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={acsUrl}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
                    />
                    <button onClick={() => handleCopy(acsUrl)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* IdP Metadata */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-600" />
                Identity Provider (IdP) Settings
              </h3>
              <p className="text-xs text-slate-500">Enter SAML 2.0 metadata supplied by your enterprise IdP.</p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">IdP SSO Target URL</label>
                  <input
                    value={idpSsoUrl}
                    onChange={(e) => setIdpSsoUrl(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">IdP Issuer / Entity ID</label>
                  <input
                    value={idpIssuer}
                    onChange={(e) => setIdpIssuer(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Group to Role Mapping */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Directory Group to LaunchComply RBAC Mapping</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Employees belonging to IdP groups automatically receive mapped permissions on JIT provisioning.
                </p>
              </div>
              <button className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                Add Mapping
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {groupMappings.map((m, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between bg-white text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-800 font-semibold">{m.idpGroup}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 font-bold border border-cyan-200">
                      {m.role}
                    </span>
                  </div>
                  <button className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: SCIM 2.0 */}
      {activeTab === "scim" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">SCIM 2.0 Automated User Provisioning</h3>
              <p className="text-xs text-slate-500 mt-1">
                Synchronize employee accounts, roles, and safe deprovisioning in real-time from Okta, Azure AD, or OneLogin.
              </p>
            </div>

            {/* Sync Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Status</span>
                <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-4 h-4" /> Active & Synced
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Users Synced</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">{syncStatus.usersSynced}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Groups Mapped</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">{syncStatus.groupsSynced}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Deprovisioned (Preserved)</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">{syncStatus.deprovisionedUsers}</span>
              </div>
            </div>

            {/* Endpoints & Bearer Token */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">SCIM 2.0 Base URL</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={scimEndpoint}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
                  />
                  <button onClick={() => handleCopy(scimEndpoint)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">SCIM Bearer Token (Stored as SHA-256 Hash)</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    type="password"
                    value={scimToken}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
                  />
                  <button onClick={() => handleCopy(scimToken)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  When an employee leaves in IdP, SCIM immediately disables LaunchComply access while retaining evidence and audit logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Verified Domains */}
      {activeTab === "domains" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm">Corporate Domain Discovery & DNS Verification</h3>
            <p className="text-xs text-slate-500">
              LaunchComply discovers enterprise SSO by inspecting the employee&apos;s corporate email domain. Domains must be verified via DNS TXT records.
            </p>

            <div className="flex gap-3 pt-2">
              <input
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-80 text-xs px-3 py-2 border border-slate-300 rounded-lg"
              />
              <button className="px-4 py-2 text-xs font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                Register Domain
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden mt-4">
              {domains.map((d) => (
                <div key={d.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{d.domain}</span>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      TXT: <code>{d.token}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Verified {d.verifiedAt}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Access Policies */}
      {activeTab === "policies" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm">Enterprise Access Policy Configuration</h3>
            <p className="text-xs text-slate-500">
              Enforce rigorous session life-cycles, IP allowlists, and MFA compliance across all corporate users.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Session Duration (Minutes)</label>
                <input
                  type="number"
                  value={policies.sessionDuration}
                  onChange={(e) => setPolicies({ ...policies, sessionDuration: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Max Idle Timeout (Minutes)</label>
                <input
                  type="number"
                  value={policies.maxIdleTime}
                  onChange={(e) => setPolicies({ ...policies, maxIdleTime: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600 block mb-1">Approved IP CIDR Ranges</label>
                <input
                  value={policies.approvedIpRanges}
                  onChange={(e) => setPolicies({ ...policies, approvedIpRanges: e.target.value })}
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2">
              <button className="px-4 py-2 text-xs font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                Save Access Policies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Service Accounts */}
      {activeTab === "service_accounts" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Service Accounts & Machine-to-Machine API Tokens</h3>
                <p className="text-xs text-slate-500">
                  Non-human automated credentials prefixed with <code>lc_live_</code>. Tokens are displayed once and stored hashed in DB.
                </p>
              </div>
              <button className="px-3.5 py-1.5 text-xs font-medium bg-cyan-600 text-white hover:bg-cyan-700 rounded-lg flex items-center gap-1 shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                New Service Account
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden mt-4">
              {serviceAccounts.map((sa) => (
                <div key={sa.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{sa.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">{sa.prefix}</span>
                    </div>
                    <p className="text-slate-500 mt-1">{sa.purpose}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {sa.scopes.map((scope, sidx) => (
                        <span key={sidx} className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 font-mono text-[10px] border border-cyan-200">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium">
                      Roll Token
                    </button>
                    <button className="text-rose-600 hover:text-rose-700 font-medium">
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
