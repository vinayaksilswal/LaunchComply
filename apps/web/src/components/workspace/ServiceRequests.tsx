"use client";
import { Dialog } from "@/components/ui/Dialog";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Download, X, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";
interface RequestItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  estimated_delivery: string;
  reports: { id: string; title: string; created_at: string }[];
}
interface Report {
  title: string;
  content: string;
  sha256: string;
  created_at: string;
}
export function ServiceRequests({
  code,
  compact = false,
}: {
  code?: string;
  compact?: boolean;
}) {
  const { organization } = useAccount();
  const [items, setItems] = useState<RequestItem[] | null>(null);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!organization) return;
    let active = true;
    setError("");
    setItems(null);
    apiClient<{ requests: RequestItem[] }>("/business-requests", {
      params: { service_code: code },
    })
      .then((result) => {
        if (active) setItems(result.requests);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [organization, code, refresh]);
  useEffect(() => {
    const update = () => setRefresh((value) => value + 1);
    window.addEventListener("launchcomply:service-request-submitted", update);
    return () =>
      window.removeEventListener(
        "launchcomply:service-request-submitted",
        update,
      );
  }, []);
  useEffect(() => {
    setReport(null);
  }, [organization]);
  return (
    <section className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
      <header className="flex items-center justify-between p-5 border-b border-slate-100">
        <h2 className="text-sm font-semibold">
          Service applications & reports
        </h2>
        <button
          onClick={() => setRefresh((value) => value + 1)}
          aria-label="Refresh service applications"
          className="p-1.5 text-slate-500"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>
      {error ? (
        <p role="alert" className="p-5 text-sm text-rose-700">
          {error}
        </p>
      ) : !items ? (
        <p role="status" className="p-6 text-sm text-slate-500">
          Loading your service applications…
        </p>
      ) : !items.length ? (
        <div className="p-8 text-center">
          <FileText className="w-7 h-7 mx-auto text-slate-300" />
          <h3 className="font-semibold text-sm mt-3">Apply to get started</h3>
          <p className="text-sm text-slate-500 leading-6 mt-2">
            Your submitted requests, delivery status, and published reports will
            appear here.
          </p>
        </div>
      ) : (
        (compact ? items.slice(0, 3) : items).map((item) => (
          <div
            key={item.id}
            className="p-5 border-b border-slate-100 last:border-0"
          >
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              <span className="text-xs border border-slate-200 rounded-md px-2.5 py-1 capitalize text-slate-600">
                {item.status.toLowerCase().replaceAll("_", " ")}
              </span>
            </div>
            {!["DELIVERED", "CLOSED"].includes(item.status.toUpperCase()) && item.estimated_delivery && (
              <p className="mt-3 text-xs text-slate-500">
                Delivery: {item.estimated_delivery}
              </p>
            )}
            {item.reports.length ? (
              <div className="mt-4 space-y-2">
                {item.reports.map((record) => (
                  <button
                    key={record.id}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        setReport(
                          await apiClient<Report>(
                            `/business-requests/reports/${record.id}`,
                          ),
                        );
                      } catch (failure) {
                        setError(
                          failure instanceof Error
                            ? failure.message
                            : "Unable to open report.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="inline-flex gap-2 items-center mr-3 text-sm font-semibold text-cyan-700"
                  >
                    <FileText className="w-4 h-4" />
                    View {record.title}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                Report available after the operations team publishes it.
              </p>
            )}
          </div>
        ))
      )}
      {compact && (
        <div className="border-t border-slate-100 p-5">
          <Link
            href="/dashboard/services"
            className="text-sm font-semibold text-cyan-700"
          >
            View all service requests
          </Link>
        </div>
      )}
      {report && (
        <Dialog
          label="Published service report"
          onDismiss={() => setReport(null)}
          className="max-w-3xl"
        >
          <article className="w-full max-w-3xl max-h-[85vh] overflow-auto bg-white rounded-2xl shadow-xl p-6 space-y-5">
            <header className="flex gap-3 justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{report.title}</h2>
                <p className="text-xs text-slate-500 mt-2">
                  Published {new Date(report.created_at).toLocaleString()}
                </p>
              </div>
              <button aria-label="Close report" onClick={() => setReport(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </header>
            <div className="text-sm leading-7 whitespace-pre-wrap break-words">
              {report.content}
            </div>
            <footer className="pt-4 border-t border-slate-100 space-y-3">
              <button
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob(
                      [
                        `${report.title}\nPublished: ${report.created_at}\n\n${report.content}\n\nContent SHA-256: ${report.sha256}`,
                      ],
                      { type: "text/plain;charset=utf-8" },
                    ),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "service-report.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700"
              >
                <Download className="w-4 h-4" />
                Download report
              </button>
              <p className="text-[10px] text-slate-400 break-all">
                Content checksum (SHA-256): {report.sha256}
              </p>
            </footer>
          </article>
        </Dialog>
      )}
    </section>
  );
}
