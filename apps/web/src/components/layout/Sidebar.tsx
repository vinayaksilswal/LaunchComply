"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Network,
  Rocket,
  Cloud,
  Globe,
  ShieldAlert,
  Target,
  FileCheck2,
  Lock,
  FileText,
  DatabaseBackup,
  AlertTriangle,
  Building2,
  Vault,
  FileSpreadsheet,
  Activity,
  DollarSign,
  Briefcase,
  Users,
  ScrollText,
  Plug,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Server,
  CreditCard,
  LifeBuoy
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Applications", href: "/dashboard/applications", icon: Boxes },
  { name: "Architecture", href: "/dashboard/architecture", icon: Network },
  { name: "Deployments", href: "/dashboard/deployments", icon: Rocket },
  { name: "Cloud", href: "/dashboard/cloud", icon: Cloud },
  { name: "Domains", href: "/dashboard/domains", icon: Globe },
  { name: "Security", href: "/dashboard/security", icon: ShieldAlert },
  { name: "VAPT", href: "/dashboard/vapt", icon: Target },
  { name: "Compliance", href: "/dashboard/compliance", icon: FileCheck2 },
  { name: "Privacy", href: "/dashboard/privacy", icon: Lock },
  { name: "Contracts", href: "/dashboard/contracts", icon: FileText },
  { name: "Backup & DR", href: "/dashboard/backups", icon: DatabaseBackup },
  { name: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
  { name: "Subprocessors", href: "/dashboard/subprocessors", icon: Building2 },
  { name: "Evidence", href: "/dashboard/evidence", icon: Vault },
  { name: "Reports", href: "/dashboard/reports", icon: FileSpreadsheet },
  { name: "Monitoring", href: "/dashboard/monitoring", icon: Activity },
  { name: "Cost", href: "/dashboard/cost", icon: DollarSign },
  { name: "Services", href: "/dashboard/services", icon: Briefcase },
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Audit Logs", href: "/dashboard/audit-logs", icon: ScrollText },
  { name: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const ADMIN_ITEMS = [
  { name: "Customers", href: "/admin/customers", icon: Users },
  { name: "Organizations", href: "/admin/organizations", icon: Building2 },
  { name: "Service Requests", href: "/admin/service-requests", icon: Briefcase },
  { name: "VAPT Projects", href: "/admin/vapt-projects", icon: Target },
  { name: "Compliance Projects", href: "/admin/compliance-projects", icon: FileCheck2 },
  { name: "Platform Health", href: "/admin/health", icon: Server },
  { name: "System Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 select-none z-40">
      {/* Brand & Workspace Switcher */}
      <div className="p-4 border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <ShieldCheck className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-tight leading-none">LaunchComply</div>
            <div className="text-[10px] text-cyan-400 font-medium">Enterprise Suite</div>
          </div>
        </Link>

        {/* Tenant selector pill */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">AcmeCloud SaaS</div>
              <div className="text-[10px] text-slate-400">Production (ap-south-1)</div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 text-xs font-medium">
        <div className="px-2 pb-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          Workspace Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}

        {/* Platform Admin Area */}
        <div className="pt-4 pb-1">
          <button
            onClick={() => setIsAdminOpen(!isAdminOpen)}
            className="w-full flex items-center justify-between px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider hover:text-slate-300"
          >
            <span>Platform Admin</span>
            {isAdminOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {isAdminOpen && (
            <div className="mt-1 space-y-0.5">
              {ADMIN_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-[11px] font-bold text-white flex items-center justify-center flex-shrink-0">
            AM
          </div>
          <div className="truncate">
            <div className="text-xs font-semibold text-slate-200 truncate">Alex Mercer</div>
            <div className="text-[10px] text-cyan-400">ORGANIZATION OWNER</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
