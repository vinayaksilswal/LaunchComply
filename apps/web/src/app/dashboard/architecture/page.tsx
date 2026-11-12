"use client";

import { ArchitectureCanvas } from "@/components/architecture/ArchitectureCanvas";
import { HostingWorkspace } from "@/components/architecture/HostingWorkspace";
import { AppOverview } from "@/components/architecture/AppOverview";
import { Suspense, useEffect, useState } from "react";
import { useAccount } from "@/components/auth/AccountProvider";

type Mode = "overview" | "proposal" | "hosting";
const TABS: [Mode, string, string][] = [
  ["overview", "Overview", "Your app in plain words: what it is made of, whether it works, and what to do next."],
  ["proposal", "Technical diagram", "Detailed AWS design for engineers. Changing it does not change your live app."],
  ["hosting", "Live hosting", "Everything running on Vercel, Render, Neon and Cloudinary, with health checks and controls."],
];

export default function ArchitecturePage() {
  const { organization } = useAccount();
  const [mode, setMode] = useState<Mode>("overview");
  useEffect(() => {
    // A link to a specific app's design ("View architecture") opens the diagram;
    // otherwise show the plain Overview, or the tab the person last used.
    const params = new URLSearchParams(window.location.search);
    if (params.get("application") || params.get("step")) { setMode("proposal"); return; }
    try {
      const saved = localStorage.getItem("architecture-mode");
      if (saved === "hosting" || saved === "proposal" || saved === "overview") setMode(saved);
    } catch {}
  }, []);
  const choose = (next: Mode) => {
    setMode(next);
    try { localStorage.setItem("architecture-mode", next); } catch {}
  };
  return (
    <div className="w-full h-full min-h-0 overflow-hidden flex flex-col">
      <div role="tablist" aria-label="Architecture view" className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 px-3 py-1.5">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={mode === id} onClick={() => choose(id)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${mode === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{label}</button>
          ))}
        </div>
        <p className="hidden text-xs text-slate-500 md:block">{TABS.find(([id]) => id === mode)![2]}</p>
      </div>
      {/* All views stay mounted and laid out so unsaved diagram edits and the
          canvas's measured positions survive switching; inactive ones are inert. */}
      <div className="relative flex-1 min-h-0">
        <div inert={mode !== "overview"} aria-hidden={mode !== "overview"} className={`absolute inset-0 ${mode === "overview" ? "" : "invisible pointer-events-none"}`}>
          <AppOverview active={mode === "overview"} onOpenDiagram={() => choose("proposal")} onOpenHosting={() => choose("hosting")} />
        </div>
        <div inert={mode !== "proposal"} aria-hidden={mode !== "proposal"} className={`absolute inset-0 flex flex-col ${mode === "proposal" ? "" : "invisible pointer-events-none"}`}>
          <Suspense fallback={<p className="p-8 text-slate-500">Loading app design…</p>}><ArchitectureCanvas key={organization?.id} /></Suspense>
        </div>
        <div inert={mode !== "hosting"} aria-hidden={mode !== "hosting"} className={`absolute inset-0 flex flex-col bg-white ${mode === "hosting" ? "" : "invisible pointer-events-none"}`}>
          <HostingWorkspace key={organization?.id} active={mode === "hosting"} />
        </div>
      </div>
    </div>
  );
}
