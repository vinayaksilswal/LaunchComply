"use client";

import { ArchitectureCanvas } from "@/components/architecture/ArchitectureCanvas";
import { HostingWorkspace } from "@/components/architecture/HostingWorkspace";
import { Suspense, useEffect, useState } from "react";
import { useAccount } from "@/components/auth/AccountProvider";

type Mode = "proposal" | "hosting";

export default function ArchitecturePage() {
  const { organization } = useAccount();
  const [mode, setMode] = useState<Mode>("proposal");
  useEffect(() => {
    try { if (localStorage.getItem("architecture-mode") === "hosting") setMode("hosting"); } catch {}
  }, []);
  const choose = (next: Mode) => {
    setMode(next);
    try { localStorage.setItem("architecture-mode", next); } catch {}
  };
  return (
    <div className="w-full h-full min-h-0 overflow-hidden flex flex-col">
      <div role="tablist" aria-label="Architecture view" className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-3 py-1.5">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {([["proposal", "AWS proposal"], ["hosting", "Current hosting"]] as [Mode, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={mode === id} onClick={() => choose(id)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${mode === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{label}</button>
          ))}
        </div>
        <p className="hidden text-xs text-slate-500 md:block">
          {mode === "proposal" ? "Planned AWS design. Saved versions are unchanged by the hosting view." : "Live Vercel, Render, Neon and Cloudinary resources from your connected accounts."}
        </p>
      </div>
      {/* Both views stay mounted and laid out so unsaved diagram edits and the
          canvas's measured positions survive switching; the inactive one is inert. */}
      <div className="relative flex-1 min-h-0">
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
