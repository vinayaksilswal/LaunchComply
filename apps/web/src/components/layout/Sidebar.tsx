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
  { name: "My business assets", href: "/dashboard/applications", icon: Boxes },
  { name: "Business architecture", href: "/dashboard/architecture", icon: Network },
  { name: "Deployments", href: "/dashboard/deployments", icon: Rocket },
  { name: "Service requests", href: "/dashboard/services", icon: LifeBuoy },
  { name: "Security", href: "/dashboard/security", icon: ShieldCheck },
  { name: "Compliance", href: "/dashboard/compliance", icon: FileCheck2 },
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Billing", href: "/dashboard/billing", icon: DollarSign },
  { name: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];
const groups = [
  {
    name: "Monitor your assets",
    items: [
      { name: "Service health", href: "/dashboard/operations", icon: Activity },
      { name: "Activity log", href: "/dashboard/logs", icon: Activity },
      { name: "Incidents", href: "/dashboard/incidents", icon: AlertTriangle },
      { name: "Backups", href: "/dashboard/backups", icon: DatabaseBackup },
      { name: "Cloud costs", href: "/dashboard/cost", icon: DollarSign },
    ],
  },
  {
    name: "Protect your business",
    items: [
      {
        name: "Evidence & controls",
        href: "/dashboard/assurance",
        icon: ShieldCheck,
      },
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
  const item = (entry: { name: string; href: string; icon: typeof Boxes }, rail = false) => {
    const active =
      entry.href === "/dashboard"
        ? pathname === entry.href
        : pathname === entry.href || pathname.startsWith(`${entry.href}/`);
    const Icon = entry.icon;
    return (
      <Link
        key={entry.href}
        href={entry.href}
        aria-label={entry.name}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobile(false)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${rail ? "h-9 whitespace-nowrap" : ""} ${active ? "bg-cyan-50 text-cyan-900 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
      >
        <Icon
          className={`w-[18px] h-[18px] shrink-0 ${active ? "text-cyan-700" : "text-slate-400"}`}
        />
        <span className={rail ? "hidden group-hover/sidebar:inline group-focus-within/sidebar:inline" : ""}>{entry.name}</span>
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
        <div className="space-y-1">{MAIN_NAV.map(entry => item(entry))}</div>
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
            <div className="space-y-0.5 mt-2">{group.items.map(entry => item(entry))}</div>
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
                href="/dashboard/settings"
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
      <aside aria-label="Workspace navigation" className="group/sidebar hidden lg:flex flex-col fixed inset-y-0 left-0 w-16 hover:w-72 focus-within:w-72 transition-[width] duration-200 motion-reduce:transition-none overflow-hidden border-r border-slate-200 z-40 bg-white hover:shadow-xl focus-within:shadow-xl">
        <Link href="/dashboard" aria-label="LaunchComply home" className="m-3 flex items-center gap-3 whitespace-nowrap font-bold text-lg"><span className="p-2 rounded-xl bg-slate-900 text-white shrink-0"><ShieldCheck className="w-6 h-6" /></span><span className="hidden group-hover/sidebar:inline group-focus-within/sidebar:inline">LaunchComply</span></Link>
        <div className="invisible group-hover/sidebar:visible group-focus-within/sidebar:visible h-16 shrink-0 mx-3 mb-3 rounded-lg border px-3 py-2">
          <p className="uppercase text-[9px] tracking-wider text-slate-400">Your business</p>
          {user && user.organizations.length > 1 ? <select aria-label="Active business" value={organization?.id || ""} onChange={event => chooseOrganization(event.target.value)} className="mt-1 w-full bg-white text-sm font-semibold">{user.organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select> : <p className="mt-1 text-sm font-semibold truncate">{organization?.name || "Your business"}</p>}
        </div>
        <nav aria-label="Main navigation" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-3">
          <div className="space-y-1">{MAIN_NAV.map(entry => item(entry, true))}</div>
          <div className="mx-3 border-t border-slate-100" />
          {groups.map((group, index) => {
            const Icon = [Activity, ShieldCheck, Settings][index];
            return <details key={group.name} className="group/section" open={group.items.some(entry => pathname === entry.href || pathname.startsWith(`${entry.href}/`)) ? true : undefined}>
              <summary aria-label={group.name} className="list-none cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-50 whitespace-nowrap"><Icon className="w-[18px] h-[18px] shrink-0" /><span className="hidden group-hover/sidebar:inline group-focus-within/sidebar:inline text-[11px] font-semibold uppercase tracking-wide">{group.name}</span><ChevronDown className="hidden group-hover/sidebar:block group-focus-within/sidebar:block ml-auto w-3.5 h-3.5 group-open/section:rotate-180" /></summary>
              <div className="hidden group-hover/sidebar:block group-focus-within/sidebar:block space-y-0.5 mt-1">{group.items.map(entry => item(entry, true))}</div>
            </details>;
          })}
          {user?.is_platform_admin && <div className="border-t pt-2">{item({name:"Platform administration",href:"/platform-admin",icon:Settings},true)}</div>}
        </nav>
        <div className="border-t p-2 space-y-2">
          <button aria-label="Find a page" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))} className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 whitespace-nowrap"><Search className="w-[18px] h-[18px] shrink-0" /><span className="hidden group-hover/sidebar:inline group-focus-within/sidebar:inline text-xs">Find a page · Ctrl+K</span></button>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings" aria-label="Signed-in account" className="flex items-center gap-2 min-w-0 flex-1"><span className="ml-1 flex w-9 h-9 shrink-0 rounded-full bg-cyan-50 text-cyan-800 items-center justify-center text-xs font-semibold">{initials || <Users className="w-4 h-4" />}</span><span className="hidden group-hover/sidebar:block group-focus-within/sidebar:block min-w-0"><strong className="block text-xs truncate">{user?.full_name || "Business account"}</strong><span className="block text-[11px] truncate text-slate-500">{user?.email}</span></span></Link>
            <button aria-label="Sign out" onClick={logout} className="hidden group-hover/sidebar:block group-focus-within/sidebar:block p-2 text-slate-400 hover:text-slate-900"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
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
