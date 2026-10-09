"use client";

import { ArchitectureCanvas } from "@/components/architecture/ArchitectureCanvas";
import { Suspense } from "react";
import { useAccount } from "@/components/auth/AccountProvider";

export default function ArchitecturePage() {
  const { organization } = useAccount();
  return (
    <div className="w-full h-full min-h-0 overflow-hidden">
      <Suspense fallback={<p className="p-8 text-slate-500">Loading app design…</p>}><ArchitectureCanvas key={organization?.id} /></Suspense>
    </div>
  );
}
