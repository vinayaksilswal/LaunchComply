"use client";

import Link from "next/link";
import { ShieldCheck, Cloud, Cpu, Lock, ArrowRight, Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              LaunchComply
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                SaaS
              </span>
            </span>
            <span className="text-[10px] text-slate-400 tracking-wider">Deploy. Secure. Comply.</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link href="#architecture" className="hover:text-cyan-400 transition-colors">AWS Architecture</Link>
          <Link href="#security" className="hover:text-cyan-400 transition-colors">Security Center</Link>
          <Link href="#vapt" className="hover:text-cyan-400 transition-colors">VAPT</Link>
          <Link href="#compliance" className="hover:text-cyan-400 transition-colors">Compliance Hub</Link>
          <Link href="#services" className="hover:text-cyan-400 transition-colors">Services</Link>
          <Link href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing</Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/50 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Live Demo
          </Link>
          <Link
            href="/onboarding"
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-lg shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5 font-sans"
          >
            Deploy My Application
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
