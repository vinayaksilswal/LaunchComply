"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-slate-950 flex items-center gap-1.5 leading-none">
              LaunchComply
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                SaaS
              </span>
            </span>
            <span className="text-[10px] text-slate-500 tracking-wider mt-0.5">Deploy. Secure. Comply.</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium text-slate-600">
          <Link href="#architecture" className="px-3 py-1.5 rounded-lg hover:text-slate-950 hover:bg-slate-50 transition-colors">
            AWS Architecture
          </Link>
          <Link href="#security" className="px-3 py-1.5 rounded-lg hover:text-slate-950 hover:bg-slate-50 transition-colors">
            Security Center
          </Link>
          <Link href="#vapt" className="px-3 py-1.5 rounded-lg hover:text-slate-950 hover:bg-slate-50 transition-colors">
            VAPT
          </Link>
          <Link href="#compliance" className="px-3 py-1.5 rounded-lg hover:text-slate-950 hover:bg-slate-50 transition-colors">
            Compliance Hub
          </Link>
          <Link href="#services" className="px-3 py-1.5 rounded-lg hover:text-slate-950 hover:bg-slate-50 transition-colors">
            Services
          </Link>
          <Link href="#pricing" className="px-3 py-1.5 rounded-lg hover:text-slate-950 hover:bg-slate-50 transition-colors">
            Pricing
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-cyan-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-lg shadow-sm shadow-cyan-600/20 transition-all flex items-center gap-1.5"
          >
            Deploy My Application
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
