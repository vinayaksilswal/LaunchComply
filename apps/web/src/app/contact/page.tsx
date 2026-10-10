import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LifeBuoy, BookOpen, Building2 } from "lucide-react";
import { ConsultationForm } from "@/components/marketing/ConsultationForm";
import {
  PublicShell,
  FAQ,
  container,
  primaryLink,
  secondaryLink,
  signupFor,
} from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Contact and support | LaunchComply",
  description:
    "Request a cloud architecture or launch consultation, or get support through your LaunchComply business workspace.",
};
export default function ContactPage() {
  return (
    <PublicShell>
      <section className={`${container} py-16 sm:py-20`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
          Let&apos;s find your next step
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
          Let&apos;s plan your next step.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
          Start with a scope review for your cloud architecture, deployment,
          security, or compliance needs. Existing customers can follow their
          service requests and reports in their workspace.
        </p>
        <div className="mt-10"><ConsultationForm /></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "New to LaunchComply?",
              description:
                "See the setup guide and what to expect from each workflow.",
              href: "/docs",
              action: "Read the getting started guide",
              icon: BookOpen,
            },
            {
              title: "Need business support?",
              description:
                "Sign in and send a request to operations from your own business workspace.",
              href: "/login?next=%2Fdashboard%2Fsupport",
              action: "Sign in for support",
              icon: LifeBuoy,
            },
            {
              title: "Planning your first request?",
              description:
                "Create your account to request help and keep the review and response in one place.",
              href: signupFor("/dashboard/services"),
              action: "Create a business workspace",
              icon: Building2,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 p-6"
              >
                <Icon className="h-6 w-6 text-cyan-700" />
                <h2 className="mt-5 text-lg font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {item.description}
                </p>
                <Link
                  href={item.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700"
                >
                  {item.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-xl bg-slate-50 p-6">
          <p className="text-sm text-slate-600">
            Not sure which service fits? Start with a general support request.
          </p>
          <Link
            href="/login?next=%2Fdashboard%2Fsupport"
            className={secondaryLink}
          >
            Open support
          </Link>
        </div>
      </section>
      <FAQ
        items={[
          {
            question: "Where will I see the response to my request?",
            answer:
              "Sign in to your workspace and open Service requests or the service page you applied from. Operations updates the request status and publishes the actual delivery report there.",
          },
          {
            question: "Can I request help without connecting a repository?",
            answer:
              "Yes. Create your business account, then submit a business-wide support or service request. Connecting a repository is needed for the app architecture analysis workflow.",
          },
          {
            question: "Can I include passwords in my message?",
            answer:
              "Do not include passwords, tokens, or secret keys in request notes. Access requirements should be discussed and agreed separately.",
          },
        ]}
      />
    </PublicShell>
  );
}
