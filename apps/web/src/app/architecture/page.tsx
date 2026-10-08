import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/PublicShell";
import { FEATURE_PAGES } from "@/lib/public-site";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Architecture | LaunchComply",
  description: FEATURE_PAGES.architecture.description,
};
export default function Page() {
  return (
    <FeaturePage content={FEATURE_PAGES.architecture}>
      <section className="border-t bg-white px-5 py-10 text-center">
        <h2 className="text-xl font-semibold text-slate-900">
          Explore a deployment diagram
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Follow an example app from its public entry to its services and data.
        </p>
        <Link
          href="/architecture/example"
          className="mt-4 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        >
          Explore interactive example
        </Link>
      </section>
    </FeaturePage>
  );
}
