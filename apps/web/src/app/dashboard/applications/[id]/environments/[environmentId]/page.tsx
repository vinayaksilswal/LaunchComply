"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Server,
  Cloud,
  Globe,
  Lock,
  Shield,
  Activity,
  Archive,
  Key,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Cpu,
  Layers,
  Terminal,
  RefreshCw,
  Database
} from "lucide-react";

export default function EnvironmentDetailPage() {
  const params = useParams();
  const envId = params?.environmentId || "production";
  const [activeTab, setActiveTab] = useState<"infrastructure" | "secrets" | "networking" | "monitoring">("infrastructure");

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/dashboard/applications" className="hover:text-cyan-400">Applications</Link>
            <span>/</span>
            <Link href="/dashboard/applications/acme-saas" className="hover:text-cyan-400">Acme SaaS Platform</Link>
            <span>/</span>
            <span className="text-slate-200 uppercase">Environments</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Production Environment</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              READY FOR APPLICATION DEPLOYMENT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span>AWS Account: <strong className="text-slate-200 font-mono">012345678901</strong></span>
            <span>•</span>
            <span>Region: <strong className="text-slate-200 font-mono">ap-south-1</strong></span>
            <span>•</span>
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Domain: <strong className="text-slate-200 font-mono">app.acmecloud.io</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/architecture"
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
          >
            View Architecture Map →
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("infrastructure")}
          className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "infrastructure"
              ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Server className="w-4 h-4 text-cyan-400" />
          Infrastructure State (32 Resources)
        </button>

        <button
          onClick={() => setActiveTab("secrets")}
          className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "secrets"
              ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Key className="w-4 h-4 text-amber-400" />
          Secrets & Runtime Variables
        </button>

        <button
          onClick={() => setActiveTab("networking")}
          className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "networking"
              ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          VPC & Domain DNS
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "infrastructure" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Stack Status</div>
              <div className="text-lg font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4" /> READY
              </div>
              <div className="text-xs text-slate-400">All 32 AWS resources operational</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Drift Audit</div>
              <div className="text-lg font-bold text-cyan-400 flex items-center gap-1.5 mt-0.5">
                <RefreshCw className="w-4 h-4" /> NO DRIFT
              </div>
              <div className="text-xs text-slate-400">Desired state matches AWS actuals</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Monthly Projection</div>
              <div className="text-lg font-bold text-slate-100 font-mono mt-0.5">₹38,500 / mo</div>
              <div className="text-xs text-slate-400">$460 USD in ap-south-1</div>
            </div>
          </div>

          {/* Core Resources */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Materialized Cloud Resources in Production
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {[
                { name: "VPC (10.0.0.0/16)", id: "vpc-0a4b8c9d1e", desc: "Multi-AZ subnets with isolated database tier", icon: Server },
                { name: "ALB Load Balancer", id: "acme-prod-alb", desc: "TLS 1.3 Terminated Ingress with ACM Certificate", icon: Globe },
                { name: "ECS Fargate API & Worker", id: "acme-prod-cluster", desc: "Serverless container compute (2 tasks minimum)", icon: Cpu },
                { name: "RDS PostgreSQL 16 Multi-AZ", id: "acme-prod-postgres-primary", desc: "KMS encrypted tablespace with 35-day backup", icon: Database },
                { name: "ElastiCache Redis", id: "acme-prod-redis-001", desc: "Private subnet session & rate-limiting cache", icon: Activity },
                { name: "S3 KMS Document Vault", id: "launchcomply-acme-saas-production-vault", desc: "Block Public Access with Cross-Region Replication", icon: Archive },
              ].map((res, i) => (
                <div key={i} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
                  <div className="p-2 rounded bg-slate-800 text-cyan-400">
                    <res.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-200">{res.name}</div>
                    <div className="font-mono text-[10px] text-cyan-400">{res.id}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{res.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Secrets Tab */}
      {activeTab === "secrets" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="font-bold text-white uppercase tracking-wider">AWS Secrets Manager Synchronization</div>
              <p className="text-slate-400 text-[11px]">Secrets are injected directly into container memory at task startup.</p>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono text-[10px]">
              6 Secrets Configured
            </span>
          </div>

          <div className="space-y-2">
            {[
              { key: "DATABASE_URL", status: "Managed by LaunchComply (Auto-rotated)", icon: Database },
              { key: "JWT_SECRET", status: "Injected via Secrets Manager ARN", icon: Lock },
              { key: "STRIPE_SECRET_KEY", status: "Injected via Secrets Manager ARN", icon: Key },
              { key: "REDIS_URL", status: "Managed by LaunchComply", icon: Activity },
              { key: "RESEND_API_KEY", status: "Injected via Secrets Manager ARN", icon: Key },
              { key: "OPENAI_API_KEY", status: "Injected via Secrets Manager ARN", icon: Key },
            ].map((s, idx) => (
              <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <s.icon className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono font-bold text-slate-200">{s.key}</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Networking & Domain Tab */}
      {activeTab === "networking" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 text-xs">
          <div className="font-bold text-white uppercase tracking-wider">DNS & Ingress Routing Configuration</div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 font-mono">
            <div className="text-slate-400">CNAME Record for app.acmecloud.io:</div>
            <div className="text-cyan-400 bg-slate-900 p-2 rounded border border-slate-800 truncate">
              acme-prod-alb-1294829.ap-south-1.elb.amazonaws.com
            </div>
            <div className="text-emerald-400 text-[11px] flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> TLS 1.3 ACM Certificate Validated & Bound
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
