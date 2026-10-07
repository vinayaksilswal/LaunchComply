"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  Play,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Zap,
} from "lucide-react";

interface BotItem {
  id: string;
  code: string;
  name: string;
  category: string;
  controlCode: string;
  schedule: string;
  status: "ENABLED" | "RUNNING" | "DISABLED";
  lastRun: string;
  lastStatus: "PASS" | "PARTIAL" | "FAIL";
  description: string;
}

const INITIAL_BOTS: BotItem[] = [
  {
    id: "bot-1",
    code: "BOT_AWS_RDS_ENCRYPTION",
    name: "AWS RDS Storage Encryption Bot",
    category: "AWS",
    controlCode: "LC-CR-001",
    schedule: "DAILY (02:00 UTC)",
    status: "ENABLED",
    lastRun: "12 mins ago",
    lastStatus: "PASS",
    description: "Inspects all RDS cluster and instance resources for active KMS customer-managed key encryption at rest.",
  },
  {
    id: "bot-2",
    code: "BOT_AWS_S3_PUBLIC_ACCESS",
    name: "AWS S3 Public Access Block Bot",
    category: "AWS",
    controlCode: "LC-AC-001",
    schedule: "HOURLY",
    status: "ENABLED",
    lastRun: "48 mins ago",
    lastStatus: "PASS",
    description: "Verifies account-level PublicAccessBlock and individual bucket ACLs and policies to prevent accidental exposure.",
  },
  {
    id: "bot-3",
    code: "BOT_AWS_BACKUP_RETENTION",
    name: "AWS Automated Backup Retention Bot",
    category: "AWS",
    controlCode: "LC-BC-001",
    schedule: "DAILY (01:00 UTC)",
    status: "ENABLED",
    lastRun: "1 hour ago",
    lastStatus: "PASS",
    description: "Evaluates automated daily snapshot generation and minimum 7-day retention across critical database engines.",
  },
  {
    id: "bot-4",
    code: "BOT_AWS_CLOUDTRAIL",
    name: "AWS CloudTrail Multi-Region Audit Bot",
    category: "AWS",
    controlCode: "LC-AU-001",
    schedule: "DAILY (04:00 UTC)",
    status: "ENABLED",
    lastRun: "3 hours ago",
    lastStatus: "PASS",
    description: "Ensures multi-region CloudTrail logging is enabled with KMS log file encryption and CloudWatch log streaming.",
  },
  {
    id: "bot-5",
    code: "BOT_GITHUB_BRANCH_PROTECTION",
    name: "GitHub Enterprise Branch Protection Bot",
    category: "GITHUB",
    controlCode: "LC-CH-001",
    schedule: "DAILY (00:00 UTC)",
    status: "ENABLED",
    lastRun: "4 hours ago",
    lastStatus: "PASS",
    description: "Audits repository master branches to ensure pull request reviews, force push blocking, and linear history.",
  },
  {
    id: "bot-6",
    code: "BOT_DR_RESTORE_FRESHNESS",
    name: "Disaster Recovery Drill Freshness Bot",
    category: "DR",
    controlCode: "LC-DR-001",
    schedule: "WEEKLY",
    status: "ENABLED",
    lastRun: "Yesterday",
    lastStatus: "PASS",
    description: "Verifies that secondary-region restore rehearsals have completed successfully within the required 90-day window.",
  },
  {
    id: "bot-7",
    code: "BOT_IDENTITY_MFA_COVERAGE",
    name: "Enterprise Identity & MFA Coverage Bot",
    category: "IDENTITY",
    controlCode: "LC-IA-001",
    schedule: "DAILY (06:00 UTC)",
    status: "ENABLED",
    lastRun: "Yesterday",
    lastStatus: "PASS",
    description: "Synchronizes directory accounts from Okta/Google Workspace and verifies mandatory MFA credential enrollment.",
  },
  {
    id: "bot-8",
    code: "BOT_SECURITY_VULN_SLA",
    name: "Security Vulnerability Remediation SLA Bot",
    category: "SECURITY",
    controlCode: "LC-VM-001",
    schedule: "DAILY (08:00 UTC)",
    status: "ENABLED",
    lastRun: "Yesterday",
    lastStatus: "PASS",
    description: "Checks SAST, SCA, and container security findings to ensure critical and high issues are treated within SLAs.",
  },
];

export default function AuditBotsPage() {
  const [bots, setBots] = useState<BotItem[]>(INITIAL_BOTS);
  const [runningBotId, setRunningBotId] = useState<string | null>(null);
  const [lastExecutedMessage, setLastExecutedMessage] = useState<string | null>(null);

  const handleRunBot = (bot: BotItem) => {
    setRunningBotId(bot.id);
    setTimeout(() => {
      setRunningBotId(null);
      setLastExecutedMessage(`Audit bot ${bot.name} executed successfully. Generated evidence for control ${bot.controlCode}.`);
      setBots((prev) =>
        prev.map((b) => (b.id === bot.id ? { ...b, lastRun: "Just now", lastStatus: "PASS" } : b))
      );
    }, 900);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard/assurance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Continuous Assurance
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Autonomous Audit Bots</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Continuous Autonomous Audit Bots
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              8 Standard Bots Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Autonomous inspectors collecting verifiable evidence across cloud infrastructure, repositories, identity, and resilience drills.
          </p>
        </div>
      </div>

      {/* Execution Alert Banner */}
      {lastExecutedMessage && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{lastExecutedMessage}</span>
          </div>
          <button onClick={() => setLastExecutedMessage(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Audit Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {bots.map((bot) => (
          <div
            key={bot.id}
            className="p-6 bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl flex flex-col justify-between space-y-5 transition"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {bot.category}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {bot.lastStatus}
                </span>
              </div>

              <h3 className="font-bold text-base text-white mt-3 flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                {bot.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{bot.description}</p>
            </div>

            <div className="space-y-3 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
              <div className="flex items-center justify-between">
                <span>Target Control:</span>
                <span className="font-mono text-slate-200 font-semibold">{bot.controlCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cadence:</span>
                <span className="text-slate-200">{bot.schedule}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Inspection:</span>
                <span className="text-slate-200">{bot.lastRun}</span>
              </div>
            </div>

            <button
              onClick={() => handleRunBot(bot)}
              disabled={runningBotId === bot.id}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition"
            >
              {runningBotId === bot.id ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  Running Inspection...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                  Run Bot Now
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
