"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { Bell, Sparkles, ChevronRight, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {/* Enterprise Sidebar */}
      <Sidebar />

      {/* Global Command Palette */}
      <CommandPalette />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0 bg-slate-50 pt-14 lg:pt-0">
        {/* Top Header */}
        <header className="h-14 bg-white/95 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
          {/* Breadcrumb / Context */}
          <div className="flex items-center gap-2 text-xs truncate">
            <span className="text-slate-500 font-medium hidden sm:inline">AcmeCloud SaaS</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            <span className="font-semibold text-slate-900 truncate">Production (ap-south-1)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold shrink-0">
              LIVE
            </span>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Search Trigger */}
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
              }}
              className="hidden md:flex items-center gap-2 px-2.5 py-1 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search...</span>
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            </Link>

            {/* Quick Public Site Link */}
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 pl-2 border-l border-slate-200"
            >
              <span className="hidden sm:inline">Public Site</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </header>

        {/* Child Pages */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
