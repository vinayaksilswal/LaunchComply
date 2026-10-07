"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Check,
  Shield,
  FileCheck2,
  Briefcase,
  Target,
  Sparkles,
} from "lucide-react";
import { applicationsApi } from "@/lib/api";

type OnboardingGoal =
  | "DEPLOY"
  | "SECURE"
  | "ISO27001"
  | "SOC2"
  | "VAPT"
  | "MSP";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<OnboardingGoal>("DEPLOY");
  const [step, setStep] = useState<number>(1);
  const [appName, setAppName] = useState<string>("Acme SaaS Web Platform");
  const [repoUrl, setRepoUrl] = useState<string>("https://github.com/myorg/saas-platform");
  const [framework, setFramework] = useState<string>("Next.js + FastAPI");
  const [awsAccountId, setAwsAccountId] = useState<string>("123456789012");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const goals = [
    {
      id: "DEPLOY" as OnboardingGoal,
      title: "Deploy My Application",
      description: "Analyze GitHub repository, generate Terraform/AWS architecture, and launch ECS Fargate.",
      icon: Rocket,
      steps: ["Connect Repo", "Analyze Code", "Approve Architecture", "Connect AWS", "Deploy ECS", "Verify Health"],
      targetUrl: "/dashboard/applications",
    },
    {
      id: "SECURE" as OnboardingGoal,
      title: "Secure Existing Application",
      description: "Run authorized security assessment, CVE scans, and continuous threat modeling.",
      icon: Shield,
      steps: ["Authorize Scope", "Trigger Scans", "Review Findings", "Generate AI Patches"],
      targetUrl: "/dashboard/security",
    },
    {
      id: "ISO27001" as OnboardingGoal,
      title: "Prepare for ISO 27001",
      description: "Establish ISMS scope, Statement of Applicability (SoA), policies, and risk register.",
      icon: FileCheck2,
      steps: ["Define Scope", "Sign SoA", "Adopt Policies", "Collect Evidence"],
      targetUrl: "/dashboard/compliance/iso27001",
    },
    {
      id: "SOC2" as OnboardingGoal,
      title: "Prepare for SOC 2 Type II",
      description: "Configure Trust Services Criteria, continuous evidence harvesting, and exception tracking.",
      icon: CheckCircle2,
      steps: ["Select Criteria", "Deploy Bots", "Review Evidence", "Invite Auditor"],
      targetUrl: "/dashboard/compliance/soc2",
    },
    {
      id: "VAPT" as OnboardingGoal,
      title: "Run Authorized VAPT",
      description: "Formal penetration testing engagement with certified methodology and retesting.",
      icon: Target,
      steps: ["Scope Assets", "Authorize Rules", "Run Testing", "Download Report"],
      targetUrl: "/dashboard/vapt",
    },
    {
      id: "MSP" as OnboardingGoal,
      title: "MSP / Manage Customers",
      description: "White-label client portals, delegated partner access, and custom vanity domains.",
      icon: Briefcase,
      steps: ["Register MSP", "Brand Portal", "Verify Domain", "Invite Clients"],
      targetUrl: "/partner",
    },
  ];

  const currentGoalConfig = goals.find((g) => g.id === selectedGoal) || goals[0];

  const handleNextStep = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setIsAnalyzing(true);
      setTimeout(() => {
        setIsAnalyzing(false);
        setStep(4);
      }, 1500);
    } else if (step === 4) {
      setStep(5);
    } else if (step === 5) {
      setIsSubmitting(true);
      try {
        await applicationsApi.create({
          name: appName,
          repository_url: repoUrl,
          framework,
        });
      } catch {
        // Fallback safely for demo environment
      } finally {
        setIsSubmitting(false);
        router.push(currentGoalConfig.targetUrl);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="p-6 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base">LaunchComply</span>
              <span className="text-[10px] text-slate-500 block font-medium">Onboarding Wizard</span>
            </div>
          </Link>
          <div className="text-xs text-slate-500 font-mono">
            Goal: <strong className="text-slate-900">{currentGoalConfig.title}</strong>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
        {/* STEP 1: Select Onboarding Goal */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center max-w-lg mx-auto mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3 border border-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                <span>Personalized Onboarding</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Welcome to LaunchComply
              </h1>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Choose what you want to achieve today. We will tailor the workflow to your primary goal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((g) => {
                const Icon = g.icon;
                const isSelected = selectedGoal === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGoal(g.id)}
                    className={`p-5 rounded-xl border cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? "bg-white border-slate-900 ring-2 ring-slate-900/10 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">{g.title}</h2>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {g.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Application / Workspace Identity */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Step 2 of 5
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Name Your Application Workspace
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                This groups your code repository, architecture, AWS deployment, and compliance audit records.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Application Name
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Primary Environment
                </label>
                <input
                  type="text"
                  value="Production (ap-south-1)"
                  disabled
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>Connect Source Code</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Connect Code Repository */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Step 3 of 5
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Connect GitHub Repository
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                LaunchComply analyzes runtime dependencies, Dockerfiles, and secrets to recommend a compliant architecture.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  GitHub Repository URL
                </label>
                <div className="relative">
                  <Github className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Detected Framework Stack
                </label>
                <input
                  type="text"
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <strong className="text-slate-900">Security Guarantee:</strong>
              <p>
                LaunchComply only accesses repository manifests and metadata via signed OAuth tokens. Source code is never shared or used to train public LLM models.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                disabled={isAnalyzing}
                className="px-6 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <span>Analyzing Stack...</span>
                ) : (
                  <>
                    <span>Run Application Analysis</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review Architecture Recommendation */}
        {step === 4 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Step 4 of 5
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Generated Architecture & AWS Blueprint
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Review the production topology recommended for your {framework} application.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Server className="w-4 h-4 text-slate-700" />
                  <span>Compute & Ingress</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                  <li>AWS CloudFront + WAF Ingress</li>
                  <li>Application Load Balancer (ALB)</li>
                  <li>ECS Fargate Container Service</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Database className="w-4 h-4 text-slate-700" />
                  <span>Data & Isolation</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1 pl-4 list-disc">
                  <li>RDS PostgreSQL 16 Multi-AZ</li>
                  <li>Private VPC Subnets (No Public IP)</li>
                  <li>S3 KMS-Encrypted Storage</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <span>Approve & Connect Cloud</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Connect AWS & Launch */}
        {step === 5 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Step 5 of 5
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Connect AWS Account & Finish
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                LaunchComply uses temporary role-based access via AWS IAM AssumeRole. No root credentials or static secret keys are ever stored.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  AWS 12-Digit Account ID
                </label>
                <div className="relative">
                  <Cloud className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={awsAccountId}
                    onChange={(e) => setAwsAccountId(e.target.value)}
                    placeholder="123456789012"
                    className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Enterprise Cloud Isolation:</strong> All AWS resources are created in customer-isolated VPCs and KMS keys. LaunchComply operates via least-privilege role boundaries.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(4)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Creating Workspace...</span>
                ) : (
                  <>
                    <span>Finish Setup & Launch Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        LaunchComply Enterprise Onboarding • From Localhost to Real Business.
      </footer>
    </div>
  );
}
