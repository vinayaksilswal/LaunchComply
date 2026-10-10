import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Network, ClipboardCheck, FileCheck2 } from "lucide-react";
import { PublicShell, WorkflowPreview, FAQ, container, primaryLink } from "@/components/marketing/PublicShell";
import { ConsultationForm } from "@/components/marketing/ConsultationForm";

export const metadata: Metadata = {
  title: "Cloud architecture and launch planning for agencies | LaunchComply",
  description: "Bring client repositories into one design workspace. Review an AWS proposal, agree an assisted delivery scope and keep handover reports and customer acceptance together.",
};

export default function Page() {
  return <PublicShell>
    <section className={`${container} grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-20`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">For development agencies</p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Turn client code into a clear AWS launch plan.</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">Give your client a cloud design they can review and a handover they can follow. Keep separate repositories, architecture decisions and delivery records in one business workspace.</p>
        <Link href="#consultation" className={`${primaryLink} mt-7`}>Discuss a client project<ArrowRight className="h-4 w-4" /></Link>
        <p className="mt-4 text-xs leading-6 text-slate-500">Start with your project goals. No repository access, cloud keys or payment details needed for an inquiry.</p>
      </div>
      <WorkflowPreview title="A shared client handover" steps={[
        { title: "Bring the source together", description: "Connect selected repositories under one business asset" },
        { title: "Review the decisions", description: "Edit the proposal and record traffic, region and availability targets" },
        { title: "Agree and follow delivery", description: "Scope the work, track reports, and record customer acceptance" },
      ]} />
    </section>
    <section className="border-y bg-slate-50/60"><div className={`${container} grid gap-8 py-12 md:grid-cols-3`}>
      {[
        { icon: Network, title: "A design backed by source records", text: "See inspected dependencies and coverage, edit the cloud proposal, and export the saved design and planning checklist. Sampled analysis still needs engineering review." },
        { icon: ClipboardCheck, title: "A scope agreed before work", text: "Record your client’s targets and review hosting choices. Operations confirms delivery capability, deliverables and a quote before a service begins." },
        { icon: FileCheck2, title: "A traceable handover", text: "Follow the request through its own page, review published work, ask for missing information and record acceptance against the report version." },
      ].map(item => <article key={item.title}><item.icon className="h-6 w-6 text-cyan-700" /><h2 className="mt-4 text-lg font-semibold">{item.title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p></article>)}
    </div></section>
    <section className={`${container} grid gap-8 py-14 lg:grid-cols-2`}>
      <div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">An assisted engagement</p><h2 className="mt-4 text-3xl font-semibold tracking-tight">Define the launch before you commit.</h2><p className="mt-5 text-sm leading-7 text-slate-600">Begin with one client business, selected repositories and a proposed environment. Agree the design review, required access, deployment responsibilities and handover evidence together. Complex migrations and ongoing operations need a separate scope.</p>
        <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600"><li>Bring code you own or have permission to share.</li><li>Discuss build behaviour, data sensitivity, current hosting and your target date.</li><li>Confirm who reviews infrastructure changes and owns support after delivery.</li></ul>
      </div>
      <aside className="rounded-2xl border p-7"><h3 className="text-lg font-semibold">What is available today?</h3><p className="mt-4 text-sm leading-7 text-slate-600">Repository connection, bounded source analysis, editable architecture, planning reviews, requests and published reports are available in the workspace. AI suggestions need your review.</p><p className="mt-4 text-sm leading-7 text-slate-600">Customer AWS deployment is an assisted scope to discuss. Automatic provisioning is not available. No savings percentage, uptime guarantee or compliance certification is promised. AWS charges are separate from any agreed service fee.</p><Link href="/architecture/example" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">Explore a labelled architecture example<ArrowRight className="h-4 w-4" /></Link></aside>
    </section>
    <section className={`${container} pb-14`}><ConsultationForm agency /></section>
    <FAQ items={[
      { question: "Can we use separate frontend and backend repositories?", answer: "Yes. Connect multiple repositories under one business asset, inspect the source records and review their proposed connections. A drawn dependency does not verify runtime integration." },
      { question: "Will our clients need to share AWS keys?", answer: "Do not send cloud keys through an inquiry or report. Cloud access is discussed separately using a scoped role connection. Observation access does not grant permission to provision resources." },
      { question: "Is this a one-click deployment service?", answer: "Automatic customer provisioning is not implemented. Start with a scope review. Design, access, costs and delivery responsibilities must be agreed before deployment work." },
      { question: "Can we download the design and delivered work?", answer: "You can export saved architecture and engineering checklist records and download published reports. Infrastructure code and operational handover artifacts must be included explicitly in the agreed delivery scope." },
    ]} />
  </PublicShell>;
}
