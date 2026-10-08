import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  PublicShell,
  container,
  primaryLink,
} from "@/components/marketing/PublicShell";
import { GUIDES } from "@/lib/guides";
export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = (await params).slug;
  const guide = Object.hasOwn(GUIDES, slug) ? GUIDES[slug] : undefined;
  return {
    title: guide ? `${guide.title} | LaunchComply guides` : "Guide not found",
    description: guide?.description,
  };
}
export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const guide = Object.hasOwn(GUIDES, slug) ? GUIDES[slug] : undefined;
  if (!guide) notFound();
  return (
    <PublicShell>
      <article
        className={`${container} grid gap-12 py-12 lg:grid-cols-[240px_1fr]`}
      >
        <aside>
          <nav
            aria-label="Guides"
            className="grid gap-1 text-sm lg:sticky lg:top-28"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Workspace guides
            </p>
            {Object.entries(GUIDES).map(([slug, item]) => (
              <Link
                key={slug}
                href={`/docs/${slug}`}
                aria-current={item.title === guide.title ? "page" : undefined}
                className={`rounded-lg px-3 py-2.5 ${item.title === guide.title ? "bg-cyan-50 font-medium text-cyan-800" : "text-slate-500 hover:bg-slate-50"}`}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/docs">Guides</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span>Getting started</span>
          </div>
          <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600">
            {guide.description}
          </p>
          <ol className="mt-10 space-y-8">
            {guide.steps.map((step, index) => (
              <li key={step.title} className="flex gap-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-sm font-semibold text-cyan-800">
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                  <p className="mt-3 text-sm leading-8 text-slate-600">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <aside className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
            {guide.note}
          </aside>
          <Link href={guide.next} className={`${primaryLink} mt-8`}>
            {guide.nextLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>
    </PublicShell>
  );
}
