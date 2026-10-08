import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy } from "lucide-react";
import {
  PublicShell,
  PublicCTA,
  container,
} from "@/components/marketing/PublicShell";
import { SERVICES } from "@/lib/public-site";

export const metadata: Metadata = {
  title: "Business services | LaunchComply",
  description:
    "Explore deployment, architecture, security, VAPT, compliance, and cloud operations support. Apply, track progress, and read actual delivered reports.",
};

export default function ServicesPage() {
  return (
    <PublicShell>
      <section className={`${container} py-16 sm:py-20`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
          Help for the next stage
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Choose the help your business needs.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
          Start with an application or a business-wide request. Operations
          reviews the scope, tracks delivery, and publishes the actual outcome
          to your workspace.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-slate-200 p-6 transition hover:border-cyan-300 hover:shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                <LifeBuoy className="h-5 w-5" />
              </span>
              <h2 className="mt-6 text-lg font-semibold">{item.title}</h2>
              <p className="mt-3 min-h-14 text-sm leading-7 text-slate-500">
                {item.description}
              </p>
              <span className="mt-6 flex items-center gap-2 text-sm font-semibold text-cyan-700">
                What to expect
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50/60">
        <div className={`${container} grid gap-6 py-12 sm:grid-cols-3`}>
          {[
            {
              title: "Apply",
              text: "Choose a service and submit a short request. You can add context without sharing secret keys.",
            },
            {
              title: "Review & track",
              text: "Operations reviews the scope. Follow actual delivery status from your workspace.",
            },
            {
              title: "Read the result",
              text: "Open and download the report published to your request after the agreed work.",
            },
          ].map((item, index) => (
            <div key={item.title}>
              <p className="text-xs font-semibold text-cyan-700">
                0{index + 1}
              </p>
              <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>
      <PublicCTA
        title="Start with what you want to achieve."
        destination="/dashboard/services"
        action="Open service requests"
      />
    </PublicShell>
  );
}
