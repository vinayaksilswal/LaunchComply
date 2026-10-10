import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import {
  PublicShell,
  FAQ,
  PublicCTA,
  container,
  primaryLink,
  signupFor,
} from "@/components/marketing/PublicShell";
export const metadata: Metadata = {
  title: "Pricing and service scope | LaunchComply",
  description:
    "Start a business workspace and request scoped deployment, security, or compliance preparation services. Scope and pricing are reviewed separately.",
};
export default function PricingPage() {
  const options = [
    {
      title: "Start your workspace",
      label: "Begin with your app",
      description:
        "Create your business account and get your next steps organized.",
      items: [
        "Business account and application workspace",
        "GitHub connection and design planning",
        "Service requests and delivered reports",
      ],
      action: "Create workspace",
      destination: "/onboarding",
    },
    {
      title: "Launch support",
      label: "Scope-based service",
      description:
        "Work through what your app needs to reach its first customers.",
      items: [
        "Deployment support request",
        "Hosting and access scope review",
        "Delivery status and actual handover",
      ],
      action: "Request deployment support",
      destination: "/dashboard/deployments",
    },
    {
      title: "Business readiness",
      label: "Scope-based engagement",
      description:
        "Request the assessment or preparation work your business needs.",
      items: [
        "Security or VAPT assessment application",
        "Compliance preparation application",
        "Agreed work and actual published report",
      ],
      action: "Explore service requests",
      destination: "/dashboard/services",
    },
  ];
  return (
    <PublicShell>
      <section className={`${container} py-16 sm:py-20`}>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            Start small. Define the work.
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            The right scope for your next stage.
          </h1>
          <p className="mt-6 text-base leading-8 text-slate-600">
            Create an account without entering payment details. For service
            work, submit a request so scope, deliverables, and pricing can be
            reviewed before you proceed.
          </p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {options.map((item, index) => (
            <article
              key={item.title}
              className={`flex flex-col rounded-2xl border p-7 ${index === 1 ? "border-cyan-200 bg-cyan-50/30" : "border-slate-200 bg-white"}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
                {item.label}
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                {item.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                {item.description}
              </p>
              <ul className="my-7 space-y-4">
                {item.items.map((text) => (
                  <li
                    key={text}
                    className="flex gap-3 text-sm leading-6 text-slate-600"
                  >
                    <Check className="mt-1 h-4 w-4 shrink-0 text-cyan-700" />
                    {text}
                  </li>
                ))}
              </ul>
              <Link
                href={signupFor(item.destination)}
                className={`${primaryLink} mt-auto`}
              >
                {item.action}
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </article>
          ))}
        </div>
        <aside className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          Published fixed subscription rates and self-service checkout are not
          available here. Assessment fees, hosting costs, and service
          commitments are agreed separately; applying does not charge a card or
          provision cloud resources.
        </aside>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-100 bg-cyan-50 p-5">
          <p className="text-sm leading-6 text-slate-600">Have several repositories or an existing cloud setup? Tell us what you need before creating a workspace.</p>
          <Link href="/contact#consultation" className={primaryLink}>Discuss scope & pricing <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
      <FAQ
        items={[
          {
            question: "Will I be charged when I create an account?",
            answer:
              "The account form does not collect payment details or trigger checkout. Any paid engagement needs a separate agreed scope and pricing.",
          },
          {
            question: "Are AWS charges included?",
            answer:
              "Hosting and cloud charges are separate from the workspace request. Review the account, architecture, and cost expectations when agreeing deployment work.",
          },
          {
            question: "Is a compliance certificate included?",
            answer:
              "No. You can request preparation work and receive the actual service report. Certification and audit outcomes require their own independent assessment.",
          },
        ]}
      />
      <PublicCTA
        title="Start with the work you actually need."
        destination="/dashboard/services"
        action="Request a scoped review"
      />
    </PublicShell>
  );
}
