import type { Metadata } from "next";
import {
  PublicShell,
  PublicCTA,
  container,
} from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "About LaunchComply",
  description:
    "LaunchComply helps the business behind an application plan its next steps, request support, and keep actual delivery records.",
};
export default function AboutPage() {
  return (
    <PublicShell>
      <section className={`${container} grid gap-12 py-20 lg:grid-cols-2`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            Why LaunchComply exists
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Building the app is only the beginning.
          </h1>
        </div>
        <div className="space-y-6 text-base leading-8 text-slate-600">
          <p>
            It&apos;s easier than ever to build a working prototype. Turning that
            prototype into something customers can use brings a different set of
            questions: where to host it, how its components connect, what to
            review, and what the business needs next.
          </p>
          <p>
            LaunchComply brings those questions into a business workspace.
            Connect your repository, review a proposed design, and request
            deployment, security, or compliance preparation help.
          </p>
          <p>
            The product separates a plan from a verified result. A design is a
            draft. A request is work to review. A delivered report is the actual
            outcome recorded by operations.
          </p>
        </div>
      </section>
      <PublicCTA title="From an app idea to a clearer business workflow." />
    </PublicShell>
  );
}
