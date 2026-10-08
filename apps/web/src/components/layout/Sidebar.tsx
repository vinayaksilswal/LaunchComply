"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Boxes,
  Network,
  Rocket,
  Activity,
  AlertTriangle,
  DatabaseBackup,
  DollarSign,
  ShieldCheck,
  FileCheck2,
  Users,
  Settings,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Search,
  LifeBuoy,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useAccount } from "@/components/auth/AccountProvider";

export const MAIN_NAV = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "My apps", href: "/dashboard/applications", icon: Boxes },
  { name: "App design", href: "/dashboard/architecture", icon: Network },
  { name: "Deployments", href: "/dashboard/deployments", icon: Rocket },
  { name: "Service requests", href: "/dashboard/services", icon: LifeBuoy },
];
const groups = [
  {
    name: "Monitor your apps",
    items: [
      { name: "App health", href: "/dashboard/operations", icon: Activity },
      { name: "Activity log", href: "/dashboard/logs", icon: Activity },
      { name: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
      { name: "Backups", href: "/dashboard/backups", icon: DatabaseBackup },
      { name: "Cloud costs", href: "/dashboard/cost", icon: DollarSign },
    ],
  },
  {
    name: "Protect your business",
    items: [
      { name: "Security", href: "/dashboard/security", icon: ShieldCheck },
      { name: "Compliance", href: "/dashboard/compliance", icon: FileCheck2 },
      {
        name: "Evidence & controls",
        href: "/dashboard/assurance",
        icon: ShieldCheck,
      },
    ],
  },
  {
    name: "Business settings",
    items: [
      { name: "Team", href: "/dashboard/team", icon: Users },
      { name: "Business account", href: "/dashboard/account", icon: Settings },
      { name: "Billing", href: "/dashboard/billing", icon: DollarSign },
      { name: "Support", href: "/dashboard/support", icon: LifeBuoy },
    ],
  },
];
export function Sidebar() {
  const { user, organization, loading, error, chooseOrganization, logout } =
    useAccount();
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const close = () => {
      if (media.matches) setMobile(false);
    };
    media.addEventListener("change", close);
    return () => media.removeEventListener("change", close);
  }, []);
  const initials =
    user?.full_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "";
  const item = (entry: { name: string; href: string; icon: typeof Boxes }) => {
    const active =
      entry.href === "/dashboard"
        ? pathname === entry.href
        : pathname === entry.href || pathname.startsWith(`${entry.href}/`);
    const Icon = entry.icon;
    return (
      <Link
        key={entry.href}
        href={entry.href}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobile(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-cyan-50 text-cyan-900 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
      >
        <Icon
          className={`w-[18px] h-[18px] shrink-0 ${active ? "text-cyan-700" : "text-slate-400"}`}
        />
        {entry.name}
      </Link>
    );
  };
  const content = (
    <div className="h-full flex flex-col bg-white">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold tracking-tight text-lg text-slate-950"
          >
            <span className="rounded-xl bg-slate-900 text-white p-2">
              <ShieldCheck className="w-5 h-5" />
            </span>
            LaunchComply
          </Link>
          <button
            aria-label="Close sidebar"
            onClick={() => setMobile(false)}
            className="lg:hidden p-1 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-5 rounded-lg border border-slate-200 px-3 py-2.5">
          <p className="uppercase tracking-wider text-[9px] font-semibold text-slate-400 mb-1">
            Your business
          </p>
          {user && user.organizations.length > 1 ? (
            <select
              aria-label="Active business"
              value={organization?.id || ""}
              onChange={(event) => chooseOrganization(event.target.value)}
              className="w-full bg-white text-sm font-semibold text-slate-900"
            >
              {user.organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          ) : (
            <p
              className="text-sm font-semibold truncate text-slate-900"
              title={organization?.name}
            >
              {organization?.name ||
                (loading ? "Loading…" : "Business unavailable")}
            </p>
          )}
        </div>
      </div>
      <nav
        aria-label="Main navigation"
        className="flex-1 min-h-0 overflow-auto p-3 space-y-5"
      >
        <div className="space-y-1">{MAIN_NAV.map(item)}</div>
        {groups.map((group) => (
          <details
            key={group.name}
            open={
              group.items.some(
                (entry) =>
                  pathname === entry.href ||
                  pathname.startsWith(`${entry.href}/`),
              )
                ? true
                : undefined
            }
            className="group"
          >
            <summary className="list-none cursor-pointer px-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>{group.name}</span>
              <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180" />
            </summary>
            <div className="space-y-0.5 mt-2">{group.items.map(item)}</div>
          </details>
        ))}
        {user?.is_platform_admin && (
          <div className="border-t border-slate-100 pt-3">
            {item({
              name: "Platform administration",
              href: "/platform-admin",
              icon: Settings,
            })}
          </div>
        )}
      </nav>
      <div className="border-t border-slate-100 p-3 space-y-3">
        <button
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
            )
          }
          className="flex w-full gap-2 items-center text-xs text-slate-500 rounded-lg border border-slate-200 px-3 py-2"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Find a page</span>
          <kbd className="ml-auto text-[9px]">Ctrl K</kbd>
        </button>
        <div aria-label="Signed-in account" className="flex gap-2 items-center">
          {user ? (
            <>
              <Link
                href="/dashboard/account"
                className="flex items-center gap-2 min-w-0 flex-1"
              >
                <span className="w-9 h-9 rounded-full bg-cyan-50 text-cyan-800 flex justify-center items-center text-xs font-semibold shrink-0">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    title={user.full_name}
                  >
                    {user.full_name}
                  </p>
                  <p
                    className="text-xs text-slate-500 truncate"
                    title={user.email}
                  >
                    {user.email}
                  </p>
                </div>
              </Link>
              <button
                aria-label="Sign out"
                onClick={logout}
                className="p-2 text-slate-400 hover:text-slate-900"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              {loading ? "Checking account…" : error || "Sign in to continue."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
  return (
    <>
      <div className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 border-b bg-white px-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm font-bold">
          LaunchComply
        </Link>
        <button
          aria-label="Open navigation menu"
          aria-haspopup="dialog"
          aria-expanded={mobile}
          onClick={() => setMobile(true)}
          className="p-2"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 border-r border-slate-200 z-40">
        {content}
      </aside>
      {mobile && (
        <Dialog
          label="Workspace navigation"
          onDismiss={() => setMobile(false)}
          className="m-0 h-dvh max-h-none w-full max-w-none rounded-none border-0 bg-transparent"
        >
          <div className="relative flex h-full">
            <button
              aria-label="Close navigation overlay"
              onClick={() => setMobile(false)}
              className="absolute inset-0 bg-slate-900/30"
            />
            <aside className="relative w-72 h-full shadow-xl">{content}</aside>
          </div>
        </Dialog>
      )}
    </>
  );
}
