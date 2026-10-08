import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import {
  PublicShell,
  PublicCTA,
  container,
} from "@/components/marketing/PublicShell";
import { GUIDES } from "@/lib/guides";
export const metadata: Metadata = {
  title: "Getting started and guides | LaunchComply",
  description:
    "Plain-language guides to your business workspace, GitHub connection, app design, service requests, and actual reports.",
};
export default function DocsPage() {
  return (
    <PublicShell>
      <section className={`${container} py-16 sm:py-20`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
          Getting started
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
          Your next step, explained.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
          Short guides for the work you&apos;ll do in LaunchComply. Start where you
          are; no cloud engineering background required.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(GUIDES).map(([slug, guide]) => (
            <Link
              key={slug}
              href={`/docs/${slug}`}
              className="group rounded-2xl border border-slate-200 p-6 hover:border-cyan-300"
            >
              <BookOpen className="h-5 w-5 text-cyan-700" />
              <h2 className="mt-5 text-lg font-semibold">{guide.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                {guide.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-cyan-700">
                Read guide
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <PublicCTA />
    </PublicShell>
  );
}
