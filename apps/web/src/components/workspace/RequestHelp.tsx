"use client";
import { Dialog } from "@/components/ui/Dialog";
import { useEffect, useState } from "react";
import { ArrowRight, X, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";
export function RequestHelp({ code, label, applicationId, architectureId, architectureVersion, compliancePicker = false, readinessFramework, disabled = false }: { code: string; label: string; applicationId?: string; architectureId?: string; architectureVersion?: string; compliancePicker?: boolean; readinessFramework?: { code: string; name: string }; disabled?: boolean }) {
  const { organization } = useAccount();
  const [open, setOpen] = useState(false);
  const [apps, setApps] = useState<{ id: string; name: string; repo_url?: string }[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState(false);
  const [assetRefresh, setAssetRefresh] = useState(0);
  const [appId, setAppId] = useState("");
  const [notes, setNotes] = useState("");
  const [framework, setFramework] = useState("");
  const [customFramework, setCustomFramework] = useState("");
  const selectedFramework = readinessFramework?.name || (framework === "other" ? customFramework.trim() : framework);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState("");
  const allowed = ["OWNER", "ADMIN"].includes(
    organization?.role.toUpperCase() || "",
  );
  useEffect(() => {
    if (!open || submitted) return;
    let active = true;
    setError("");
    setAssetsLoading(true);
    setAssetsError(false);
    apiClient<{ id: string; name: string; repo_url?: string }[]>("/applications/")
      .then((items) => {
        if (active) {
          setApps(items);
          setAppId(applicationId ? items.some(item => item.id === applicationId) ? applicationId : "" : items[0]?.id || "");
          if (applicationId && !items.some(item => item.id === applicationId)) { setAssetsError(true); setError("This business asset is no longer available. Close this form and refresh preparation."); }
        }
      })
      .catch((failure) => {
        if (active) { setAssetsError(true); setError(failure.message); }
      }).finally(() => { if (active) setAssetsLoading(false); });
    return () => {
      active = false;
    };
  }, [open, submitted, applicationId, assetRefresh]);
  useEffect(() => {
    setOpen(false);
    setSubmitted(false);
    setNotes("");
    setFramework(""); setCustomFramework("");
    setRequestId("");
  }, [organization]);
  return (
    <>
      <button
        disabled={!allowed || disabled}
        onClick={() => {
          setOpen(true);
          if (submitted) {
            setSubmitted(false);
            setNotes("");
            setRequestId(crypto.randomUUID());
          } else if (!requestId) setRequestId(crypto.randomUUID());
        }}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-700 text-white text-sm font-semibold disabled:opacity-40"
      >
        {label}
        <ArrowRight className="w-4 h-4" />
      </button>
      {open && (
        <Dialog label={label} busy={busy} onDismiss={() => setOpen(false)}>
          <section className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl">
            <header className="flex gap-3 justify-between items-center">
              <h2 className="text-lg font-semibold">
                {submitted ? "Request submitted" : label}
              </h2>
              <button
                disabled={busy}
                aria-label="Close request"
                onClick={() => setOpen(false)}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </header>
            {submitted ? (
              <div className="space-y-4 mt-5">
                <CheckCircle2 className="w-9 h-9 text-cyan-700" />
                <p className="text-sm text-slate-600 leading-6">
                  Your request is saved for the operations team to review. You
                  can track its status in Service requests.
                </p>
                <Link
                  href={`/dashboard/services/${requestId}`}
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-cyan-700"
                >
                  Open this request
                </Link>
              </div>
            ) : (
              <form
                className="mt-5 space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (disabled || assetsLoading || assetsError || (applicationId && appId !== applicationId) || (compliancePicker && !selectedFramework)) return;
                  setBusy(true);
                  setError("");
                  try {
                    await apiClient("/business-requests", {
                      method: "POST",
                      body: JSON.stringify({
                        request_id: requestId,
                        service_code: code,
                        ...(compliancePicker || readinessFramework ? { compliance_framework: selectedFramework } : {}),
                        ...(readinessFramework ? { readiness_framework_code: readinessFramework.code } : {}),
                        application_id: appId || null,
                        ...(architectureId ? { architecture_id: architectureId } : {}),
                        notes,
                      }),
                    });
                    setSubmitted(true);
                    window.dispatchEvent(
                      new Event("launchcomply:service-request-submitted"),
                    );
                  } catch (failure) {
                    setError(
                      failure instanceof Error
                        ? failure.message
                        : "Unable to submit request.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p className="text-sm text-slate-500 leading-6">
                  Submit the scope for review. Track progress and reports in this workspace.
                </p>
                {readinessFramework && <p className="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-800">{readinessFramework.name} · Current readiness will be checked again when you submit.</p>}
                {compliancePicker && <><label className="block text-sm font-medium">Compliance framework<select required aria-label="Compliance framework" disabled={busy} value={framework} onChange={event => { setFramework(event.target.value); setRequestId(crypto.randomUUID()); }} className="block w-full mt-2 border rounded-lg px-3 py-2.5 bg-white"><option value="">Choose a framework</option>{["ISO 27001", "SOC 2 Type I", "SOC 2 Type II", "PCI DSS", "HIPAA", "GDPR", "ISO 27701", "ISO 22301", "FedRAMP"].map(name => <option key={name}>{name}</option>)}<option value="other">Other framework or requirement</option></select></label>{framework === "other" && <label className="block text-sm font-medium">Framework or requirement name<input required maxLength={100} value={customFramework} disabled={busy} onChange={event => { setCustomFramework(event.target.value); setRequestId(crypto.randomUUID()); }} className="block w-full mt-2 border rounded-lg px-3 py-2.5" placeholder="Type the framework you need" /></label>}</>}
                {["VAPT_ASSESSMENT", "SECURITY_ASSESSMENT"].includes(code) && <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">This applies for a scope review. It does not authorize testing. The team will agree on targets, ownership, permitted methods and written authorization before an assessment begins.</p>}
                {["COMPLIANCE_HELP", "ISO27001_HELP", "SOC2_HELP", "PRIVACY_HELP"].includes(code) && <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">Describe the business processes and systems you want reviewed. Preparation and delivered reports do not by themselves certify or attest your business.</p>}
                {architectureVersion && <p className="rounded-lg bg-cyan-50 p-3 text-xs leading-5 text-cyan-800">Saved design {architectureVersion}, its source snapshot, planning targets and engineering checklist will be captured for review. You and the operations team can view this snapshot in request progress.</p>}
                {assetsLoading && <p role="status" className="text-xs text-slate-500">Loading your business assets…</p>}
                {assetsError && <button type="button" disabled={busy || assetsLoading} onClick={() => setAssetRefresh(value => value + 1)} className="text-xs font-semibold text-cyan-700">Reload business assets</button>}
                <label className="block text-sm font-medium">
                  Business asset
                  <select
                    value={appId}
                    disabled={busy || assetsLoading || !!applicationId}
                    onChange={(event) => {
                      setAppId(event.target.value);
                      setRequestId(crypto.randomUUID());
                    }}
                    className="block w-full mt-2 border rounded-lg px-3 py-2.5 bg-white"
                  >
                    <option value="">Business-wide request</option>
                    {apps.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name}{app.repo_url ? ` · ${app.repo_url.replace(/\/$/, "").split("/").at(-1)}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Scope and requirements{" "}
                  <span className="font-normal text-slate-400">Optional</span>
                  <textarea
                    rows={3}
                    disabled={busy}
                    maxLength={700}
                    value={notes}
                    onChange={(event) => {
                      setNotes(event.target.value);
                      setRequestId(crypto.randomUUID());
                    }}
                    placeholder="Tell us what you want to achieve. Do not include passwords or secret keys."
                    className="block w-full mt-2 border rounded-lg px-3 py-2.5 resize-none"
                  />
                </label>
                {error && (
                  <p role="alert" className="text-sm text-rose-700">
                    {error}
                  </p>
                )}
                <button
                  disabled={disabled || busy || assetsLoading || assetsError || (!!applicationId && appId !== applicationId)}
                  type="submit"
                  className="w-full rounded-lg bg-slate-900 text-white px-4 py-3 text-sm font-semibold disabled:opacity-40"
                >
                  {busy ? "Submitting…" : compliancePicker ? "Submit compliance application" : "Submit request"}
                </button>
              </form>
            )}
          </section>
        </Dialog>
      )}
    </>
  );
}
