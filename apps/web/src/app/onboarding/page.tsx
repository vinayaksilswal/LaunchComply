"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Github,
  Server,
  Cloud,
  Layers,
  Lock,
  Terminal,
  Cpu,
  Database,
  Rocket,
  ChevronRight,
  Check
} from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState<number>(1);
  const [appName, setAppName] = useState<string>("My SaaS App");
  const [repoUrl, setRepoUrl] = useState<string>("https://github.com/myorg/saas-platform");
  const [frontendStack, setFrontendStack] = useState<string>("React / Next.js");
  const [backendStack, setBackendStack] = useState<string>("FastAPI (Python 3.11)");
  const [databaseStack, setDatabaseStack] = useState<string>("PostgreSQL");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisDone, setAnalysisDone] = useState<boolean>(false);
  const [awsAccountId, setAwsAccountId] = useState<string>("123456789012");

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisDone(true);
      setStep(4);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="p-6 border-b border-slate-800 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-bold text-white text-base">LaunchComply</span>
        </Link>
        <div className="text-xs text-slate-400 font-mono">
          Step <strong className="text-cyan-400">{step}</strong> of 6 • Guided Production Architecture
        </div>
      </header>

      {/* Main Stepper Card */}
      <div className="max-w-2xl mx-auto w-full px-6 py-8">
        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8">
          {[
            { num: 1, label: "Application" },
            { num: 2, label: "Source Code" },
            { num: 3, label: "Stack Analysis" },
            { num: 4, label: "AWS Architecture" },
            { num: 5, label: "AWS Account" },
            { num: 6, label: "Ready to Deploy" },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > s.num
                    ? "bg-emerald-500 text-slate-950"
                    : step === s.num
                    ? "bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {step > s.num ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: Application Metadata */}
        {step === 1 && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Create New Application Workspace</h2>
              <p className="text-xs text-slate-400 mt-1">
                Name your SaaS application and configure the primary production environment.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Application Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target AWS Region</label>
                <select className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500">
                  <option value="ap-south-1">Asia Pacific (Mumbai) — ap-south-1 (Recommended for DPDP)</option>
                  <option value="us-east-1">US East (N. Virginia) — us-east-1</option>
                  <option value="eu-west-1">EU (Ireland) — eu-west-1</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                Next: Connect Source <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Connect Source Code */}
        {step === 2 && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Connect Code Repository</h2>
              <p className="text-xs text-slate-400 mt-1">
                Select your source code repository for automated framework and dependency analysis.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 border border-cyan-500/40 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Github className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-xs font-bold text-white">GitHub Integration</div>
                    <div className="text-[10px] text-emerald-400">Authenticated as acmecloud-org</div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                  Connected
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Repository URL</label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Default Production Branch</label>
                <input
                  type="text"
                  defaultValue="main"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                Next: Stack Analysis <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Stack Analysis */}
        {step === 3 && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Application Analysis & Technology Profiler</h2>
              <p className="text-xs text-slate-400 mt-1">
                LaunchComply scans the repository for runtimes, databases, background workers, and ports.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Frontend</div>
                  <div className="font-bold text-white text-xs mt-0.5">{frontendStack}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Backend</div>
                  <div className="font-bold text-white text-xs mt-0.5">{backendStack}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Database</div>
                  <div className="font-bold text-white text-xs mt-0.5">{databaseStack}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Detected Requirements:</div>
                <div className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  Docker Multi-Stage Containerization Supported
                </div>
                <div className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  API Health Check Probe: <code className="text-cyan-300 font-mono">/api/v1/health</code>
                </div>
                <div className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  Database Connection Pooling: 10 max connections
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg"
              >
                Back
              </button>
              <button
                disabled={isAnalyzing}
                onClick={handleRunAnalysis}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                {isAnalyzing ? (
                  <>Synthesizing AWS Topology...</>
                ) : (
                  <>Generate Architecture Plan <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review Architecture Plan */}
        {step === 4 && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Recommended Production AWS Topology</h2>
              <p className="text-xs text-slate-400 mt-1">
                Zero exposed databases, private ECS Fargate tasks, automated KMS encryption, and multi-tier subnets.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { name: "Amazon CloudFront + WAF", tier: "Public Edge", desc: "Edge SSL termination & OWASP protection" },
                { name: "Application Load Balancer", tier: "Public Subnet", desc: "Private target group routing" },
                { name: "Amazon ECS Fargate", tier: "Private App VPC", desc: "Auto-scaling serverless containers" },
                { name: "RDS PostgreSQL Multi-AZ", tier: "Isolated DB", desc: "Continuous WAL archiving (5m RPO)" },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase">{item.tier}</div>
                  <div className="font-bold text-white text-xs mt-0.5">{item.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-cyan-950/40 border border-cyan-800/50 rounded-lg flex items-center justify-between text-xs">
              <span className="text-slate-300">Estimated AWS Monthly Infrastructure:</span>
              <span className="text-cyan-400 font-bold font-mono text-sm">₹35,000 - ₹45,000 / mo</span>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg"
              >
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                Approve Architecture & Connect AWS <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Connect AWS Account */}
        {step === 5 && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Connect Customer AWS Account Securely</h2>
              <p className="text-xs text-slate-400 mt-1">
                LaunchComply uses least privilege cross-account IAM roles with cryptographic External IDs. Never root keys.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your AWS 12-Digit Account ID</label>
                <input
                  type="text"
                  value={awsAccountId}
                  onChange={(e) => setAwsAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
                <div className="text-[11px] font-bold text-slate-300">Onboarding CloudFormation Snippet</div>
                <p className="text-slate-400 text-[11px]">
                  Deploy our audited CloudFormation template in your AWS console to create the cross-account role:
                </p>
                <div className="bg-slate-900 p-2 rounded border border-slate-800 font-mono text-[11px] text-cyan-300">
                  Role: arn:aws:iam::{awsAccountId}:role/LaunchComplyCrossAccountAccessRole
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(4)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg"
              >
                Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                Verify & Finalize <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Ready to Deploy */}
        {step === 6 && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Your Production Platform is Ready!</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                LaunchComply has synthesized your AWS architecture plan, configured strict tenant boundaries, and
                initialized your continuous security and compliance monitors.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-400">App Name:</span>
                <span className="text-white font-bold">{appName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">AWS Cross-Account:</span>
                <span className="text-emerald-400 font-mono">VERIFIED (STS)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Production Readiness:</span>
                <span className="text-cyan-400 font-bold">84% INITIALIZED</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/25 hover:opacity-95"
              >
                <Rocket className="w-4 h-4" />
                Launch Application Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-500 border-t border-slate-800">
        © 2026 LaunchComply. All deployment operations are tenant isolated and recorded to immutable audit trails.
      </footer>
    </div>
  );
}
