import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Github,
  Rocket,
  Activity,
  ShieldCheck,
  GraduationCap,
  CreditCard,
  Check,
} from "lucide-react";
import {
  PublicShell,
  WorkflowPreview,
  PublicCTA,
  FAQ,
  container,
  primaryLink,
  secondaryLink,
  signupFor,
} from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "LaunchComply — From Localhost to Real Business",
  description:
    "Built an app with AI? LaunchComply reads your code, explains it in plain words, and guides you step by step to put it online on free hosting, then keeps watch on it.",
};

export default function LandingPage() {
  const features = [
    {
      title: "Put your app online",
      description:
        "A guided, four-step launch: LaunchComply reads your code, then sets up your website, backend and database on your own free hosting accounts. You confirm every step.",
      href: signupFor("/onboarding"),
      link: "Start my launch",
      icon: Rocket,
      color: "bg-cyan-50 text-cyan-700",
    },
    {
      title: "Know it is working",
      description:
        "See each part of your app in plain words: working, updating or needs attention. Get told when visitors cannot open your site, and when it recovers.",
      href: "/deployment",
      link: "How it works",
      icon: Activity,
      color: "bg-blue-50 text-blue-700",
    },
    {
      title: "Learn as you go",
      description:
        "No jargon. Every step explains what it does and why, and the assistant answers questions about your own app. It never changes anything unless you approve it.",
      href: "/docs",
      link: "Read the guides",
      icon: GraduationCap,
      color: "bg-violet-50 text-violet-700",
    },
    {
      title: "Get ready for customers",
      description:
        "When you start selling, request a security check or compliance preparation from people who do it for a living, and keep the real reports in one place.",
      href: "/services",
      link: "See the services",
      icon: ShieldCheck,
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
            For people who built an app with AI
          </p>
          <h1 className="mt-6 text-[2.7rem] font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-6xl">
            From localhost
            <br />
            to <span className="text-cyan-700">real business.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
            Your app works on your computer. Put it online for real customers,
            step by step, without learning to be a cloud engineer.
          </p>
          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-500">
            Connect your code from GitHub. LaunchComply reads it, tells you in
            plain words what it is made of, and guides you through launching it
            on free hosting accounts that you own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={signupFor("/onboarding")} className={primaryLink}>
              Launch my app
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/docs" className={secondaryLink}>
              See how it works
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              No card needed to start
            </span>
            <span className="flex items-center gap-1.5">
              <Github className="h-3.5 w-3.5" />
              Works with your GitHub code
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              You approve every step
            </span>
          </div>
        </div>
        <WorkflowPreview
          title="Your path from prototype to launch"
          steps={[
            {
              title: "Connect your code",
              description:
                "Pick your GitHub repository. LaunchComply finds your website, backend and database.",
            },
            {
              title: "Launch it, step by step",
              description:
                "Connect free hosting accounts and confirm each part. The parts are wired together for you.",
            },
            {
              title: "Share your link",
              description:
                "Your app gets a public address. LaunchComply keeps checking that it answers.",
            },
          ]}
        />
      </section>
      <section className="border-y border-slate-200 bg-slate-50/60">
        <div
          className={`${container} flex flex-wrap items-center justify-between gap-5 py-6`}
        >
          <p className="text-sm font-medium text-slate-700">
            Built with Cursor, Lovable, Bolt, Replit, v0, ChatGPT or Claude?
          </p>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            If your code is on GitHub, you can start. Guided launch currently
            supports websites built with Next.js, Vite or React, and backends
            built with Node.js or Python.
          </p>
        </div>
      </section>
      <section className={`${container} py-16`}>
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            Everything in one place
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Launch it. Watch it.
            <br />
            Grow it.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            Start with the launch. Come back for the rest when your business
            needs it.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
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
                  {item.link}
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
              Honest by design
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
              Your app. Your accounts.
              <br />
              Your decisions.
            </h2>
          </div>
          <div className="space-y-6">
            {[
              {
                title: "You own everything",
                text: "Your app runs in hosting accounts that belong to you (Vercel, Render, Neon and Cloudinary). If you ever leave LaunchComply, your app keeps running.",
              },
              {
                title: "Nothing happens behind your back",
                text: "LaunchComply shows exactly what it is about to create and waits for your confirmation. Your passwords and secret keys are never shown on screen.",
              },
              {
                title: "If your app is not ready, we say so",
                text: "AI-written code does not always run online as it is. LaunchComply points out what is blocking the launch and what to fix, instead of pretending it worked.",
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
            question: "I built my app with AI and I am not a programmer. Can I use this?",
            answer:
              "Yes, that is who it is for. You need your code in a GitHub repository. LaunchComply reads it, explains each part in plain words, and walks you through the launch one confirmed step at a time.",
          },
          {
            question: "What does it cost?",
            answer:
              "Creating an account and using the guided launch does not need a card. Your app runs on the free plans of the hosting providers, in accounts you own; if you later outgrow a free plan, that provider bills you directly. Expert services such as security assessments are quoted separately before any work starts.",
          },
          {
            question: "Which apps can be launched?",
            answer:
              "Today the guided launch supports a website built with Next.js, Vite or React, a backend built with Node.js or Python, a PostgreSQL database and image storage. If your app is different, LaunchComply tells you what it found and you can ask for hands-on deployment help.",
          },
          {
            question: "Does LaunchComply change my code?",
            answer:
              "No. It reads your repository to understand it. It does not edit or push code. If something in your code blocks the launch, it tells you what to change.",
          },
          {
            question: "Is my app secure and compliant once it is online?",
            answer:
              "Being online is not the same as being secure or certified. The launch uses safe defaults and encrypted connections, and you can request a security assessment or compliance preparation when you are ready. LaunchComply does not issue certifications.",
          },
        ]}
      />
      <PublicCTA
        title="Your app deserves real visitors."
        description="Create your free workspace, connect your code, and follow the guided launch."
        destination="/onboarding"
        action="Launch my app"
      />
    </PublicShell>
  );
}
