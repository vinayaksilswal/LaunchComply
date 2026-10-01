"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Bell, Sparkles, ChevronRight, ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* Enterprise Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0 bg-slate-50">
        {/* Top Header */}
        <header className="h-14 bg-white/90 border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
          {/* Breadcrumb / Context */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">AcmeCloud SaaS</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-900">Production (ap-south-1)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold">
              LIVE
            </span>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-3">
            {/* Demo Mode Badge */}
            <div className="px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-medium flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              <span>Demo Mode: Preloaded Acme SaaS</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            </button>

            {/* Quick Public Site Link */}
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-cyan-700 flex items-center gap-1 pl-2 border-l border-slate-200"
            >
              Public Portal <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </header>

        {/* Child Pages */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
