import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell, container } from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Terms | LaunchComply",
  description:
    "The plain-language terms for using LaunchComply: what the service does, what stays yours, and what it does not promise.",
};

const sections: { title: string; body: string[] }[] = [
  {
    title: "The service",
    body: [
      "LaunchComply, operated by Tech Invenso, helps you understand an application you have built, launch it on hosting accounts that you own, watch whether it is working, and request expert services. By creating an account you agree to these terms.",
    ],
  },
  {
    title: "Your account",
    body: [
      "Give accurate details, keep your password to yourself, and tell us if you think someone else has used your account. You are responsible for what is done through your account and by the people you invite to your business.",
    ],
  },
  {
    title: "Your code and your apps stay yours",
    body: [
      "You keep all rights to your code and your apps. You give LaunchComply permission to read the repositories you connect and to act on your hosting accounts only as needed to provide the service and only for the actions you confirm.",
      "Only connect code and accounts that you have the right to use. Do not use LaunchComply to launch anything illegal, harmful, or that infringes someone else's rights.",
    ],
  },
  {
    title: "Hosting providers and their costs",
    body: [
      "Your app runs at third-party providers (such as Vercel, Render, Neon and Cloudinary) in accounts that belong to you, under their terms. LaunchComply creates resources on their free plans by default. Any charges from a provider, for example if you upgrade or exceed a free plan, are between you and that provider.",
      "Free plans have limits set by the providers, and providers can change or withdraw them. LaunchComply does not control their availability.",
    ],
  },
  {
    title: "The AI assistant",
    body: [
      "The assistant explains and suggests. It can be wrong. It never changes your design or your live app by itself: you review each suggestion and choose whether to apply it. Check anything important before relying on it.",
    ],
  },
  {
    title: "What we do not promise",
    body: [
      "LaunchComply does not guarantee that every app can be launched automatically, that a launched app is free of faults or security weaknesses, or that it will always be available. Code written by AI tools may need changes before it runs online; where LaunchComply can detect a problem, it tells you.",
      "Using LaunchComply does not make your business certified or compliant with any standard or law. Security assessments and compliance preparation are separate services with their own agreed scope, and certification is decided by independent auditors.",
      "Health checks and alerts are there to help you. They are not a guarantee that every problem will be detected.",
    ],
  },
  {
    title: "Paid services",
    body: [
      "Creating an account does not require payment details. Expert services are quoted separately; nothing is charged until you have agreed the scope and price for that work.",
    ],
  },
  {
    title: "Responsibility",
    body: [
      "The service is provided as it is. To the extent the law allows, Tech Invenso is not liable for indirect losses such as lost profits, lost data or business interruption arising from use of the service or of third-party hosting providers. Nothing in these terms removes rights that the law says cannot be removed.",
      "Keep your own copy of your code (your GitHub repository is one) and of anything important stored in your apps.",
    ],
  },
  {
    title: "Ending and changes",
    body: [
      "You can stop using LaunchComply at any time; your apps keep running in your own hosting accounts. We may suspend an account that breaks these terms or puts the service or other people at risk.",
      "If these terms change in a way that matters, we will update the date below and tell account holders inside the workspace.",
    ],
  },
];

export default function TermsPage() {
  return (
    <PublicShell>
      <section className={`${container} max-w-3xl py-16 sm:py-20`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
          Terms
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
          The rules, in plain words.
        </h1>
        <p className="mt-4 text-sm text-slate-500">Last updated: 14 November 2026</p>
        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold tracking-tight">
                {section.title}
              </h2>
              {section.body.map((text) => (
                <p key={text} className="mt-3 text-sm leading-7 text-slate-600">
                  {text}
                </p>
              ))}
            </section>
          ))}
        </div>
        <p className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
          Questions about these terms?{" "}
          <Link href="/contact" className="font-semibold text-cyan-700 underline">
            Contact us
          </Link>
          . See also our{" "}
          <Link href="/privacy" className="font-semibold text-cyan-700 underline">
            Privacy page
          </Link>
          .
        </p>
      </section>
    </PublicShell>
  );
}
