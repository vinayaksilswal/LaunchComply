import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Github,
  Network,
  FileText,
  Check,
  ChevronDown,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { PUBLIC_NAV, type FeatureContent } from "@/lib/public-site";

export const primaryLink =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800";
export const secondaryLink =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50";
export const container = "mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10";
export const signupFor = (destination: string) =>
  `/signup?next=${encodeURIComponent(destination)}`;

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-100">
      <Navbar />
      <main id="public-content">{children}</main>
      <footer className="border-t border-slate-200 bg-slate-50/70">
        <div
          className={`${container} grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]`}
        >
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
            >
              <ShieldCheck className="h-6 w-6 text-cyan-700" />
              LaunchComply
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
              From localhost to real business. A workspace for your app, its
              cloud design, and the help you need to move forward.
            </p>
          </div>
          <FooterLinks title="Platform" items={PUBLIC_NAV.slice(0, 4)} />
          <FooterLinks
            title="Business"
            items={[
              ...PUBLIC_NAV.slice(4),
              { label: "About LaunchComply", href: "/about" },
            ]}
          />
          <FooterLinks
            title="Resources"
            items={[
              { label: "Getting started", href: "/docs" },
              { label: "Contact & support", href: "/contact" },
              { label: "Platform status", href: "/status" },
              { label: "Sign in", href: "/login" },
            ]}
          />
        </div>
        <div
          className={`${container} flex flex-wrap justify-between gap-3 border-t border-slate-200 py-6 text-xs text-slate-500`}
        >
          <p>LaunchComply</p>
          <p>Plan clearly. Request help. Keep the actual results.</p>
        </div>
      </footer>
    </div>
  );
}

function FooterLinks({
  title,
  items,
}: {
  title: string;
  items: readonly { label: string; href: string }[];
}) {
  return (
    <nav aria-label={`${title} footer links`}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
        {title}
      </h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              className="text-sm text-slate-500 hover:text-slate-900"
              href={item.href}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function WorkflowPreview({
  title,
  steps,
}: {
  title: string;
  steps: { title: string; description: string }[];
}) {
  const icons = [Github, Network, FileText];
  return (
    <div className="relative">
      <div
        className="absolute -inset-5 rounded-[3rem] bg-gradient-to-br from-cyan-50 via-blue-50/50 to-white"
        aria-hidden="true"
      />
      <figure className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_70px_-35px_rgba(15,23,42,0.35)]">
        <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950 text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            {title}
          </span>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
            Workflow illustration
          </span>
        </figcaption>
        <div className="bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:16px_16px] p-5 sm:p-7">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-700">
              A clear next step, at every stage
            </p>
            <ol className="mt-5">
              {steps.map((step, index) => {
                const Icon = icons[index % icons.length];
                return (
                  <li
                    key={step.title}
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    {index < steps.length - 1 && (
                      <span
                        className="absolute bottom-0 left-[17px] top-9 w-px bg-slate-200"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${index === 1 ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="pt-0.5">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50/80 px-3 py-2.5 text-xs text-cyan-800">
            <Check className="h-3.5 w-3.5 shrink-0" />
            Your decisions and delivery records stay together.
          </div>
        </div>
      </figure>
    </div>
  );
}

export function FAQ({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <section className={`${container} grid gap-8 py-16 lg:grid-cols-[1fr_2fr]`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
          A little clarity
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          Common questions
        </h2>
      </div>
      <div className="divide-y divide-slate-200 border-y border-slate-200">
        {items.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-900">
              {item.question}
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function PublicCTA({
  title = "Give your application a next step.",
  description = "Create your business workspace, connect your app, and choose the help you need.",
  destination = "/onboarding",
  action = "Create workspace",
}: {
  title?: string;
  description?: string;
  destination?: string;
  action?: string;
}) {
  return (
    <section className={`${container} pb-16 pt-6`}>
      <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-7 sm:p-10">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
        <Link href={signupFor(destination)} className={primaryLink}>
          {action}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export function FeaturePage({ content }: { content: FeatureContent }) {
  return (
    <PublicShell>
      <section
        className={`${container} grid items-center gap-14 py-16 lg:grid-cols-2 lg:py-24`}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
            {content.eyebrow}
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.12] tracking-[-0.035em] text-slate-950 sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
            {content.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={signupFor(content.destination)} className={primaryLink}>
              {content.action}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/docs" className={secondaryLink}>
              How to get started
            </Link>
          </div>
          <p className="mt-5 text-xs text-slate-500">
            Your business workspace. Your application. A clear next step.
          </p>
        </div>
        <WorkflowPreview title={content.previewTitle} steps={content.preview} />
      </section>
      <section className="border-y border-slate-200 bg-slate-50/60">
        <div className={`${container} grid gap-8 py-12 md:grid-cols-3`}>
          {content.benefits.map((item, index) => (
            <div key={item.title}>
              <span className="text-xs font-semibold text-cyan-700">
                0{index + 1}
              </span>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className={`${container} py-16`}>
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Simple steps. Visible progress.
            </h2>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 self-end text-sm font-semibold text-cyan-700"
          >
            Explore services
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {content.steps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-2xl border border-slate-200 p-6"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                {index + 1}
              </span>
              <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
        <aside className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            What to expect
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {content.scope}
          </p>
        </aside>
      </section>
      <FAQ items={content.faqs} />
      <PublicCTA destination={content.destination} action={content.action} />
    </PublicShell>
  );
}
