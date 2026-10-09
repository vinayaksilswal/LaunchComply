"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import {
  Bell,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Search,
} from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "@/components/auth/AccountProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fixedWorkspace = usePathname() === "/dashboard/architecture";
  const { organization, loading, error } = useAccount();
  return (
    <div className={`${fixedWorkspace ? "h-dvh overflow-hidden" : "min-h-screen"} bg-white flex text-slate-900`}>
      <a href="#workspace-content" className="skip-link">
        Skip to workspace
      </a>
      {/* Enterprise Sidebar */}
      <Sidebar />

      {/* Global Command Palette */}
      <CommandPalette />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0 min-h-0 bg-slate-50/40 pt-14 lg:pt-0">
        {/* Top Header */}
        <header className="h-14 shrink-0 bg-white/95 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
          {/* Breadcrumb / Context */}
          <div className="flex items-center gap-2 text-xs truncate">
            <span className="text-slate-500 font-medium hidden sm:inline">
              {organization?.name ||
                (loading ? "Loading business…" : "Your business")}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            <span className="font-semibold text-slate-900 truncate">
              Workspace
            </span>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Search Trigger */}
            <button
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
                );
              }}
              className="hidden md:flex items-center gap-2 px-2.5 py-1 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find a page</span>
              <kbd className="px-1 py-0.2 bg-white rounded font-mono text-[9px] border border-slate-200">
                Ctrl+K
              </kbd>
            </button>

            {/* Notifications */}
            <Link
              href="/dashboard/notifications"
              className="relative p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
            </Link>

            {/* Quick Help Link */}
            <Link
              href="/dashboard/support"
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 pl-2 border-l border-slate-200"
            >
              <span className="hidden sm:inline">Help</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </header>

        {/* Child Pages */}
        <main
          id="workspace-content"
          tabIndex={-1}
          className={`flex-1 min-h-0 ${fixedWorkspace ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          {loading ? (
            <div role="status" className="p-8 text-sm text-slate-500">
              Loading your business account…
            </div>
          ) : error ? (
            <div
              role="alert"
              className="m-8 p-6 rounded-xl border border-rose-200 text-rose-800"
            >
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 text-sm underline"
              >
                Retry account connection
              </button>
            </div>
          ) : organization ? (
            <Fragment key={organization.id}>{children}</Fragment>
          ) : (
            <div className="p-8 text-sm text-slate-500">
              No business membership is available for this account.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
