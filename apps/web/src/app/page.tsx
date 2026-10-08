import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Github,
  Network,
  ShieldCheck,
  FileCheck2,
  Rocket,
  LifeBuoy,
} from "lucide-react";
import {
  PublicShell,
  WorkflowPreview,
  PublicCTA,
  FAQ,
  container,
  primaryLink,
  secondaryLink,
} from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "LaunchComply — From Localhost to Real Business",
  description:
    "You built your app. Plan its cloud architecture, request deployment and security help, and track actual service reports in your business workspace.",
};

export default function LandingPage() {
  const features = [
    {
      title: "Understand your app",
      description:
        "Connect GitHub and turn dependency evidence into a cloud proposal you can refine.",
      href: "/architecture",
      icon: Network,
      color: "bg-cyan-50 text-cyan-700",
    },
    {
      title: "Get help launching",
      description:
        "Request deployment support and work through your hosting needs with operations.",
      href: "/deployment",
      icon: Rocket,
      color: "bg-blue-50 text-blue-700",
    },
    {
      title: "Review app security",
      description:
        "Agree an assessment scope, follow progress, and read the actual report.",
      href: "/security",
      icon: ShieldCheck,
      color: "bg-violet-50 text-violet-700",
    },
    {
      title: "Prepare for business",
      description:
        "Request compliance preparation and keep the resulting records together.",
      href: "/compliance",
      icon: FileCheck2,
      color: "bg-emerald-50 text-emerald-700",
    },
  ];
  return (
    <PublicShell>
      <section
        className={`${container} grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24`}
      >
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/60 px-3 py-1.5 text-xs font-medium text-cyan-800">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-600" />
            For the business behind the app
          </p>
          <h1 className="mt-6 text-[2.7rem] font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-6xl">
            From localhost
            <br />
            to <span className="text-cyan-700">real business.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
            You built the app. Let&apos;s work through what it needs to reach your
            customers.
          </p>
          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-500">
            Connect your code, shape a cloud design, and request deployment,
            security, or compliance help. One workspace keeps the next steps and
            actual results clear.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={primaryLink}>
              Create your workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/deployment" className={secondaryLink}>
              See how it works
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Github className="h-3.5 w-3.5" />
              Connect your repository
            </span>
            <span className="flex items-center gap-1.5">
              <LifeBuoy className="h-3.5 w-3.5" />
              Ask for the help you need
            </span>
          </div>
        </div>
        <WorkflowPreview
          title="Your path from prototype to launch"
          steps={[
            {
              title: "Connect and understand",
              description:
                "Your repository, dependency evidence, and cloud proposal",
            },
            {
              title: "Request and review",
              description:
                "The scope, status, and next steps for your business",
            },
            {
              title: "Keep the actual outcome",
              description: "Delivered reports and saved workspace records",
            },
          ]}
        />
      </section>
      <section className="border-y border-slate-200 bg-slate-50/60">
        <div
          className={`${container} flex flex-wrap items-center justify-between gap-5 py-6`}
        >
          <p className="text-sm font-medium text-slate-700">
            Built for founders who want a clear next step.
          </p>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Whether you wrote the code yourself or built it with AI, start with
            the app you have.
          </p>
        </div>
      </section>
      <section className={`${container} py-16`}>
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            One connected workspace
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Less guesswork.
            <br />
            More visible progress.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Start with a focused workflow. Keep the design, requests, and
            delivered results connected to your business.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col rounded-2xl border border-slate-200 p-6 transition hover:border-cyan-300 hover:shadow-sm"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-6 text-base font-semibold">{item.title}</h3>
                <p className="mb-6 mt-3 text-sm leading-7 text-slate-500">
                  {item.description}
                </p>
                <span className="mt-auto flex items-center gap-2 text-xs font-semibold text-cyan-700">
                  Explore workflow
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="border-y border-slate-200 bg-slate-50/60">
        <div className={`${container} grid gap-10 py-14 lg:grid-cols-2`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              A workspace that tells the truth
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
              Know what&apos;s planned.
              <br />
              See what&apos;s been delivered.
            </h2>
          </div>
          <div className="space-y-6">
            {[
              {
                title: "Your business, your records",
                text: "Your account, apps, requests, and reports come from your business records. Empty pages stay empty until work is recorded.",
              },
              {
                title: "A request is the beginning",
                text: "Applying starts an operations review. Scope and required authorization come before delivery or testing.",
              },
              {
                title: "Evidence over assumptions",
                text: "A design draft is labeled as a proposal. Completed work has an actual published report you can read and download.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FAQ
        items={[
          {
            question: "I built my app with AI. Where do I start?",
            answer:
              "Create a business account, name your application, and authorize its GitHub repository. If you are unsure how to launch it, request deployment help from your workspace.",
          },
          {
            question: "Does clicking Get started deploy my app automatically?",
            answer:
              "No. It creates your workspace. You can plan the architecture and apply for help; operations reviews scope and access before the agreed deployment work.",
          },
          {
            question: "How do I get an assessment or compliance report?",
            answer:
              "Apply from the relevant service page. You can follow status and read the actual report once operations publishes it to your request.",
          },
        ]}
      />
      <PublicCTA />
    </PublicShell>
  );
}
