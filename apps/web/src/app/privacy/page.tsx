import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell, container } from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Privacy | LaunchComply",
  description:
    "What LaunchComply collects, why, where it is kept, and how to have it removed.",
};

const sections: { title: string; body: string[] }[] = [
  {
    title: "Who we are",
    body: [
      "LaunchComply is operated by Tech Invenso. This page explains, in plain words, what information the service handles when you use it. If anything here is unclear, ask us through the Contact page before you rely on it.",
    ],
  },
  {
    title: "What we collect",
    body: [
      "Account details: your name, email address, business name and a protected (hashed) version of your password.",
      "Your code: when you connect GitHub, LaunchComply reads the repositories you choose in order to understand your app. When you upload a code package instead, it is stored encrypted. Your code is read, not executed and not changed.",
      "Hosting connections: the access keys you enter for Vercel, Render, Neon and Cloudinary are stored encrypted and are never displayed again. They are used only to show your hosting, check its health and carry out the actions you confirm.",
      "Your workspace records: app designs, launch steps, service requests, messages to support, and an activity log of important actions in your business.",
      "Basic technical data needed to run the service securely, such as sign-in times and error logs.",
    ],
  },
  {
    title: "What we do not do",
    body: [
      "We do not sell your information. We do not train AI models on your code or your data. We do not store payment card numbers.",
      "Secret values from your apps (such as database passwords) are passed directly between your hosting providers during a launch. They are not shown on screen and are not kept in your designs, logs or assistant conversations.",
    ],
  },
  {
    title: "Other companies involved",
    body: [
      "LaunchComply itself runs on Vercel (website), Render (application server) and Neon (database).",
      "When you use the AI assistant, the relevant parts of your question and app design are sent to an AI model provider through OpenRouter to produce an answer. Passwords and secret keys are not included. Those AI providers may keep, and some may learn from, what is sent to them, so do not type personal or confidential information into assistant questions.",
      "When you connect GitHub or a hosting provider, LaunchComply talks to that provider on your behalf using the access you granted. Each of those providers has its own terms and privacy policy, and your apps run in accounts that you own with them.",
    ],
  },
  {
    title: "Health checks",
    body: [
      "To tell you whether your app is working, LaunchComply regularly opens your app's public address, the same way a visitor's browser would. It records whether the address answered and how quickly. It does not read the content of your pages or your visitors' data.",
    ],
  },
  {
    title: "Counting visits (optional)",
    body: [
      "If you choose Allow on the cookie question, the public pages of this website use Google Analytics and, where enabled, the Meta Pixel to count visits and to learn which adverts led to a sign-up. Those companies set cookies and receive the page address you visited. Pages inside your workspace are never measured. If you choose No thanks, nothing is loaded. You can change your mind by clearing this site's data in your browser.",
    ],
  },
  {
    title: "Keeping and deleting your information",
    body: [
      "We keep your information while your account is open. You can disconnect GitHub or any hosting provider at any time, which removes the stored access key. To close your account and have your information deleted, contact us; some records may be kept where the law requires it.",
      "Disconnecting a provider or closing your account does not delete the apps running in your own hosting accounts. Those remain yours.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can ask for a copy of your information, ask us to correct it, or ask us to delete it. Depending on where you live, you may have additional rights under local data protection law.",
    ],
  },
  {
    title: "Changes",
    body: [
      "If this page changes in a way that matters, we will update the date below and tell account holders inside the workspace.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PublicShell>
      <section className={`${container} max-w-3xl py-16 sm:py-20`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
          Privacy
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
          What we collect, and why.
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
          Questions or requests about your information?{" "}
          <Link href="/contact" className="font-semibold text-cyan-700 underline">
            Contact us
          </Link>
          . See also our{" "}
          <Link href="/terms" className="font-semibold text-cyan-700 underline">
            Terms
          </Link>
          .
        </p>
      </section>
    </PublicShell>
  );
}
