"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RequestProgress } from "@/components/workspace/RequestProgress";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
    <Link href="/dashboard/services" className="inline-flex items-center gap-2 text-sm text-slate-600"><ArrowLeft className="h-4 w-4" />Service requests</Link>
    <div className="rounded-2xl border bg-white p-5 sm:p-7"><RequestProgress key={id} requestId={id} fullPage /></div>
  </div>;
}
