"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Compass } from "lucide-react";
import {
  PublicShell,
  primaryLink,
  secondaryLink,
} from "@/components/marketing/PublicShell";

export default function NotFound() {
  const pathname = usePathname();
  const internal = [
    "/dashboard",
    "/platform-admin",
    "/partner",
    "/audit-portal",
  ].some((prefix) => pathname?.startsWith(prefix));
  const content = (
    <section className="mx-auto max-w-xl px-6 py-24 text-center">
      <Compass className="mx-auto h-10 w-10 text-cyan-700" />
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Page not found
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        Let�s get you back on track.
      </h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        This link may have changed. Choose a destination below to continue.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={internal ? "/dashboard" : "/"} className={primaryLink}>
          <ArrowLeft className="h-4 w-4" />
          {internal ? "Back to workspace" : "Back to home"}
        </Link>
        <Link href="/docs" className={secondaryLink}>
          Getting started
        </Link>
      </div>
    </section>
  );
  return internal ? content : <PublicShell>{content}</PublicShell>;
}
