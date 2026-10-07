"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Network,
  Rocket,
  Activity,
  ScrollText,
  AlertTriangle,
  DatabaseBackup,
  DollarSign,
  ShieldAlert,
  Target,
  FileCheck2,
  ShieldCheck,
  FileText,
  Users,
  LifeBuoy,
  CreditCard,
  Building2,
  Settings,
  ChevronDown,
  ChevronRight,
  Server,
  Briefcase,
  Sliders,
  TrendingUp,
  Lock,
  Sparkles,
  Bot,
  CheckCircle2,
  Palette,
  Globe,
  Menu,
  X,
  Search,
  CheckSquare,
} from "lucide-react";
import { useState } from "react";

interface NavGroup {
  title: string;
  items: {
    name: string;
    href: string;
    icon: any;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "BUILD",
    items: [
      { name: "Applications", href: "/dashboard/applications", icon: Boxes },
      { name: "Architecture", href: "/dashboard/architecture", icon: Network },
      { name: "Deployments", href: "/dashboard/deployments", icon: Rocket },
    ],
  },
  {
    title: "OPERATE",
    items: [
      { name: "Operations", href: "/dashboard/operations", icon: Activity },
      { name: "Logs & Traces", href: "/dashboard/logs", icon: ScrollText },
      { name: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
      { name: "Backups", href: "/dashboard/backups", icon: DatabaseBackup },
      { name: "Cost FinOps", href: "/dashboard/cost", icon: DollarSign },
    ],
  },
  {
    title: "SECURE",
    items: [
      { name: "Security Findings", href: "/dashboard/security", icon: ShieldAlert },
      { name: "Threat Models", href: "/dashboard/security/threat-models", icon: Target, badge: "AI" },
      { name: "VAPT Pentesting", href: "/dashboard/vapt", icon: Target },
      { name: "Disaster Recovery", href: "/dashboard/dr", icon: DatabaseBackup },
    ],
  },
  {
    title: "COMPLY",
    items: [
      { name: "Compliance Hub", href: "/dashboard/compliance", icon: FileCheck2 },
      { name: "Policies", href: "/dashboard/compliance/policies", icon: FileText },
      { name: "Risk Register", href: "/dashboard/compliance/risks", icon: ShieldAlert },
      { name: "Contracts & SLAs", href: "/dashboard/contracts", icon: FileText },
      { name: "Trust Center", href: "/dashboard/trust", icon: ShieldCheck },
    ],
  },
  {
    title: "ASSURE",
    items: [
      { name: "Continuous Assurance", href: "/dashboard/assurance", icon: ShieldCheck, badge: "LIVE" },
      { name: "Audit Readiness", href: "/dashboard/compliance/audit-readiness", icon: CheckCircle2 },
      { name: "Audit Workpapers", href: "/audit/workpapers", icon: Lock },
    ],
  },
  {
    title: "ORGANIZATION",
    items: [
      { name: "My Actions", href: "/dashboard/my-actions", icon: CheckSquare, badge: "ACTION" },
      { name: "Team & Invites", href: "/dashboard/team", icon: Users },
      { name: "Enterprise Identity", href: "/dashboard/settings/security/sso", icon: Lock, badge: "SSO" },
      { name: "Support Center", href: "/dashboard/support", icon: LifeBuoy },
      { name: "Billing & Invoices", href: "/dashboard/billing", icon: CreditCard },
      { name: "AI Copilot", href: "/dashboard/copilot", icon: Sparkles, badge: "AI" },
    ],
  },
];

const MSP_ITEMS = [
  { name: "Partner Portfolio", href: "/partner", icon: Briefcase },
  { name: "White-Label Branding", href: "/partner/settings/branding", icon: Palette },
  { name: "Vanity Domains", href: "/partner/settings/domain", icon: Globe },
];

const PLATFORM_ADMIN_ITEMS = [
  { name: "Launch Gates", href: "/platform-admin/launch", icon: Rocket },
  { name: "Providers Matrix", href: "/platform-admin/providers", icon: Server },
  { name: "Customers 360", href: "/platform-admin/customers", icon: Users },
  { name: "Delivery Board", href: "/platform-admin/delivery", icon: CheckCircle2, badge: "P17" },
  { name: "Subscriptions", href: "/platform-admin/subscriptions", icon: CreditCard },
  { name: "Support Queue", href: "/platform-admin/support", icon: LifeBuoy },
  { name: "System Settings", href: "/platform-admin/system", icon: Sliders },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isMspOpen, setIsMspOpen] = useState(pathname.startsWith("/partner"));
  const [isAdminOpen, setIsAdminOpen] = useState(pathname.startsWith("/platform-admin"));

  const navContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Brand & Workspace Switcher */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 tracking-tight leading-none">
                LaunchComply
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Enterprise Suite</div>
            </div>
          </Link>
          <button
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tenant selector card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-900 truncate">AcmeCloud SaaS</div>
              <div className="text-[10px] text-slate-500">Production (ap-south-1)</div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </div>

      {/* Main Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-xs font-medium">
        {/* Global Overview Link */}
        <div>
          <Link
            href="/dashboard"
            onClick={() => setIsOpenMobile(false)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              pathname === "/dashboard"
                ? "bg-slate-900 text-white font-semibold shadow-xs"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard Overview</span>
            </div>
          </Link>
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {group.title}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpenMobile(false)}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold border-l-2 border-slate-900 pl-2.5"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Collapsible MSP Partner Section */}
        <div className="pt-2 border-t border-slate-200 space-y-1">
          <button
            onClick={() => setIsMspOpen(!isMspOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-900"
          >
            <span>MSP & Partners</span>
            {isMspOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {isMspOpen && (
            <div className="space-y-0.5 pl-2">
              {MSP_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpenMobile(false)}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${
                      isActive ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Collapsible Platform Admin Section */}
        <div className="pt-2 border-t border-slate-200 space-y-1">
          <button
            onClick={() => setIsAdminOpen(!isAdminOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-900"
          >
            <span>Platform Admin</span>
            {isAdminOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {isAdminOpen && (
            <div className="space-y-0.5 pl-2">
              {PLATFORM_ADMIN_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpenMobile(false)}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${
                      isActive ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer shortcut helper */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          <span>Quick Find</span>
        </span>
        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] shadow-2xs">
          Ctrl+K
        </kbd>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Trigger Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
          <ShieldCheck className="w-5 h-5 text-slate-900" />
          <span>LaunchComply</span>
        </div>
        <button
          onClick={() => setIsOpenMobile(true)}
          className="p-2 text-slate-600 hover:text-slate-900"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-slate-200 flex-col h-screen fixed left-0 top-0 z-40 bg-white shadow-2xs">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setIsOpenMobile(false)}
          />
          <div className="relative w-72 max-w-full h-full z-10 shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
