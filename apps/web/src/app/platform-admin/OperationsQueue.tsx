"use client";
import { Dialog } from "@/components/ui/Dialog";
import { useEffect, useState } from "react";
import { RefreshCw, ArrowRight, X, Building2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { apiClient } from "@/lib/api";
import { ReportPublisher } from "./ReportPublisher";
interface RequestItem {
  id: string;
  organization_name: string;
  title: string;
  status: string;
  service_code: string;
  notes: string;
  estimated_delivery: string;
  created_at: string;
}
interface Queue {
  counts: Record<string, number>;
  requests: RequestItem[];
  offset: number;
}
const states = [
  "REQUESTED",
  "REVIEWING",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "DELIVERED",
  "CLOSED",
];
const text = (value: string) => value.toLowerCase().replaceAll("_", " ");
export function OperationsQueue() {
  const [data, setData] = useState<Queue | null>(null);
  const [filter, setFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<RequestItem | null>(null);
  const [state, setState] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setError("");
    setData(null);
    apiClient<Queue>("/admin/operations-queue", {
      params: { offset, status: filter || undefined },
    })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [filter, offset, refresh]);
  return (
    <div className="bg-white min-h-screen text-slate-900">
      <Sidebar />
      <main className="lg:ml-64 p-6 pt-20 lg:pt-8 max-w-[1600px] space-y-7">
        <header className="flex flex-wrap gap-3 justify-between items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest text-cyan-700 uppercase">
              Internal operations
            </p>
            <h1 className="text-3xl font-semibold mt-2">
              Business service queue
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Review customer requests, coordinate delivery, and keep status
              current.
            </p>
          </div>
          <button
            onClick={() => setRefresh((value) => value + 1)}
            className="flex items-center gap-2 text-sm border rounded-lg px-4 py-2.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </header>
        {error && (
          <p
            role="alert"
            className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm"
          >
            {error}
          </p>
        )}
        <section className="grid sm:grid-cols-3 gap-4">
          {["REQUESTED", "IN_PROGRESS", "WAITING_CUSTOMER"].map((item) => (
            <button
              key={item}
              onClick={() => {
                setFilter(item);
                setOffset(0);
              }}
              className="p-6 rounded-xl border border-slate-200 text-left hover:border-cyan-300"
            >
              <p className="text-xs text-slate-500 capitalize">{text(item)}</p>
              <p className="mt-3 text-3xl font-semibold">
                {data ? data.counts[item] || 0 : "—"}
              </p>
            </button>
          ))}
        </section>
        <div className="flex gap-2 overflow-auto">
          {["", ...states].map((item) => (
            <button
              key={item}
              onClick={() => {
                setFilter(item);
                setOffset(0);
              }}
              aria-pressed={filter === item}
              className={`text-xs shrink-0 px-3 py-2 rounded-lg border capitalize ${filter === item ? "bg-cyan-50 text-cyan-900 border-cyan-200" : "text-slate-500 border-slate-200"}`}
            >
              {item ? text(item) : "All requests"}
            </button>
          ))}
        </div>
        <section className="border border-slate-200 rounded-2xl overflow-hidden">
          {!data && !error ? (
            <p role="status" className="p-10 text-sm text-slate-500">
              Loading business requests…
            </p>
          ) : data?.requests.length ? (
            data.requests.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelected(item);
                  setState(item.status);
                  setNote("");
                }}
                className="w-full text-left p-5 border-b last:border-0 flex gap-4 items-center justify-between hover:bg-slate-50"
              >
                <div>
                  <p className="text-xs text-slate-500 flex gap-1.5 items-center">
                    <Building2 className="w-3.5 h-3.5" />
                    {item.organization_name}
                  </p>
                  <h2 className="font-semibold text-sm mt-2">{item.title}</h2>
                  <time className="text-xs text-slate-500 mt-2 block">
                    {new Date(item.created_at).toLocaleString()}
                  </time>
                </div>
                <div className="flex gap-4 items-center">
                  <span className="text-xs capitalize text-slate-600 border rounded-md px-2.5 py-1">
                    {text(item.status)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))
          ) : (
            <p className="p-12 text-sm text-center text-slate-500">
              No requests match this view.
            </p>
          )}
        </section>
        <div className="flex justify-between text-xs">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((value) => Math.max(0, value - 50))}
            className="disabled:opacity-30"
          >
            Previous
          </button>
          <button
            disabled={!data || data.requests.length < 50}
            onClick={() => setOffset((value) => value + 50)}
            className="disabled:opacity-30"
          >
            Next
          </button>
        </div>
        {selected && (
          <Dialog
            label="Manage business request"
            busy={busy}
            onDismiss={() => setSelected(null)}
          >
            <form
              className="rounded-2xl bg-white p-6 w-full max-w-xl space-y-5 shadow-xl max-h-[90vh] overflow-auto"
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await apiClient(`/admin/operations-queue/${selected.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      expected_status: selected.status,
                      status: state,
                      note,
                    }),
                  });
                  setSelected(null);
                  setRefresh((value) => value + 1);
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : "Unable to update request.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <header className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-xs text-slate-500">
                    {selected.organization_name}
                  </p>
                  <h2 className="font-semibold text-lg mt-1">
                    {selected.title}
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  aria-label="Close management panel"
                  onClick={() => setSelected(null)}
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </header>
              <p className="whitespace-pre-wrap text-sm text-slate-600 leading-6">
                {selected.notes || "No additional customer notes."}
              </p>
              <label className="block text-sm font-medium">
                Delivery status
                <select
                  disabled={busy}
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  className="block mt-2 w-full bg-white border rounded-lg p-2.5 capitalize"
                >
                  {states.map((item) => (
                    <option key={item} value={item}>
                      {text(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Operations note
                <textarea
                  disabled={busy}
                  maxLength={1000}
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="block mt-2 w-full border rounded-lg p-3 resize-none"
                />
              </label>
              {error && (
                <p role="alert" className="text-sm text-rose-700">
                  {error}
                </p>
              )}
              <button
                disabled={busy}
                className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg text-sm font-semibold disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save update"}
              </button>
              <p className="text-xs text-slate-500">
                Updates are saved to the customer request with an audit event.
                No deployment or assessment runs automatically.
              </p>
              <ReportPublisher
                requestId={selected.id}
                disabled={busy}
                onBusyChange={setBusy}
                onPublished={() => {
                  setSelected(null);
                  setRefresh((value) => value + 1);
                }}
              />
            </form>
          </Dialog>
        )}
      </main>
    </div>
  );
}
