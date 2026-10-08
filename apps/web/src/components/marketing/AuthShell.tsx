import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";

export function AuthShell({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: "login" | "signup";
}) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2">
      <aside className="hidden flex-col border-r border-slate-200 bg-slate-50/60 p-10 lg:flex xl:p-16">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-slate-950"
        >
          <span className="rounded-xl bg-slate-950 p-2 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          LaunchComply
        </Link>
        <div className="my-auto max-w-lg py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            From localhost to real business
          </p>
          <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight">
            Your app&apos;s next chapter starts here.
          </h2>
          <p className="mt-6 text-base leading-8 text-slate-500">
            A workspace to understand your app, plan its design, and get the
            help your business needs.
          </p>
          <ul className="mt-10 space-y-5">
            {[
              "Connect your app through GitHub",
              "Review and refine a proposed cloud design",
              "Apply for services and keep actual reports",
            ].map((text) => (
              <li
                key={text}
                className="flex items-center gap-3 text-sm text-slate-600"
              >
                <Check className="h-4 w-4 shrink-0 text-cyan-700" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/docs"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          Read the getting started guide →
        </Link>
      </aside>
      <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="mb-10 flex items-center gap-2 text-sm font-medium text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to LaunchComply
          </Link>
          <div className="mb-8 flex items-center gap-2.5 font-bold tracking-tight text-slate-950 lg:hidden">
            <ShieldCheck className="h-5 w-5 text-cyan-700" />
            LaunchComply
          </div>
          {children}
          <p className="mt-8 text-xs leading-6 text-slate-400">
            {mode === "signup"
              ? "Your account identifies your business. Service scope and delivery are reviewed separately."
              : "Your workspace shows records for the business your account belongs to."}
          </p>
        </div>
      </main>
    </div>
  );
}
