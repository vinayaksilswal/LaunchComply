"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Optional, consent-gated visitor measurement for advertising.
 * Nothing loads unless an ID is configured AND the visitor accepts.
 * Only public pages are measured, and only the path (never the query string),
 * so workspace addresses and identifiers are not sent to ad platforms.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const VALID = { ga: /^G-[A-Z0-9]{4,20}$/.test(GA_ID), pixel: /^\d{6,20}$/.test(PIXEL_ID) };
const ENABLED = VALID.ga || VALID.pixel;
const KEY = "lc-analytics-consent";
const PRIVATE = /^\/(dashboard|platform-admin|partner|onboarding|audit)(\/|$)/;

type Tracked = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...args: unknown[]) => void }; _fbq?: unknown };

function consent(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function load() {
  const w = window as Tracked;
  if (VALID.ga && !w.gtag) {
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () { w.dataLayer!.push(arguments); };
    w.gtag("js", new Date());
    w.gtag("config", GA_ID, { send_page_view: false, anonymize_ip: true });
    const script = document.createElement("script");
    script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);
  }
  if (VALID.pixel && !w.fbq) {
    const fbq = function (...args: unknown[]) { if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue!.push(args); } as NonNullable<Tracked["fbq"]>;
    fbq.queue = []; fbq.loaded = true; fbq.version = "2.0";
    w.fbq = fbq; w._fbq = fbq;
    const script = document.createElement("script");
    script.async = true; script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
    fbq("init", PIXEL_ID);
  }
}

/** Record a conversion (for example a completed sign-up). Does nothing without consent. */
export function trackConversion(name: "sign_up") {
  if (!ENABLED || typeof window === "undefined" || consent() !== "yes") return;
  const w = window as Tracked;
  w.gtag?.("event", name);
  w.fbq?.("track", "CompleteRegistration");
}

export function Analytics() {
  const pathname = usePathname() || "/";
  const [choice, setChoice] = useState<string | null>("pending");
  useEffect(() => { setChoice(consent()); }, []);
  useEffect(() => {
    if (!ENABLED || choice !== "yes" || PRIVATE.test(pathname)) return;
    load();
    const w = window as Tracked;
    w.gtag?.("event", "page_view", { page_path: pathname, page_location: window.location.origin + pathname });
    w.fbq?.("track", "PageView");
  }, [choice, pathname]);
  if (!ENABLED || choice !== null || PRIVATE.test(pathname)) return null;
  const decide = (value: "yes" | "no") => { try { localStorage.setItem(KEY, value); } catch {} setChoice(value); };
  return (
    <div role="dialog" aria-label="Cookie choice" className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-lg">
      <p className="max-w-md text-slate-600">
        May we count visits to learn which pages and adverts are useful? Your workspace is never measured.{" "}
        <Link href="/privacy" className="font-semibold text-cyan-700 underline">Privacy</Link>
      </p>
      <span className="flex gap-2">
        <button onClick={() => decide("no")} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700">No thanks</button>
        <button onClick={() => decide("yes")} className="rounded-lg bg-slate-950 px-3 py-1.5 font-semibold text-white">Allow</button>
      </span>
    </div>
  );
}
