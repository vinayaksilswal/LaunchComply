"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ShieldCheck, ArrowRight, Menu, X } from "lucide-react";
import { PUBLIC_NAV } from "@/lib/public-site";
import { Dialog } from "@/components/ui/Dialog";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const link = (entry: { label: string; href: string }) => {
    const active =
      pathname === entry.href || pathname.startsWith(`${entry.href}/`);
    return (
      <Link
        key={entry.href}
        href={entry.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`rounded-lg px-2.5 py-2 text-sm font-medium transition ${active ? "bg-cyan-50 text-cyan-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
      >
        {entry.label}
      </Link>
    );
  };
  return (
    <>
      <a href="#public-content" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            aria-label="LaunchComply home"
            className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight text-slate-950"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            LaunchComply
          </Link>
          <nav
            aria-label="Platform navigation"
            className="hidden items-center gap-0.5 xl:flex"
          >
            {PUBLIC_NAV.map(link)}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-950 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 sm:text-sm"
            >
              Get started
              <ArrowRight className="hidden h-3.5 w-3.5 sm:block" />
            </Link>
            <button
              type="button"
              aria-label="Open website menu"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-slate-600 xl:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      {open && (
        <Dialog
          label="Website navigation"
          onDismiss={() => setOpen(false)}
          className="m-0 ml-auto h-dvh max-h-none w-[min(24rem,calc(100%-1rem))] max-w-none rounded-none border-y-0 border-r-0"
        >
          <div className="flex h-full flex-col p-6">
            <header className="flex items-center justify-between border-b border-slate-100 pb-5">
              <h2 className="text-lg font-semibold">Explore LaunchComply</h2>
              <button
                type="button"
                aria-label="Close website menu"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <nav
              aria-label="Mobile platform navigation"
              className="mt-5 grid gap-2"
            >
              {PUBLIC_NAV.map(link)}
              {[
                { label: "Getting started", href: "/docs" },
                { label: "Contact & support", href: "/contact" },
              ].map(link)}
            </nav>
            <div className="mt-auto grid gap-3 border-t border-slate-100 pt-6">
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-slate-950 p-3 text-center text-sm font-semibold text-white"
              >
                Create workspace
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 p-3 text-center text-sm font-semibold text-slate-700"
              >
                Sign in
              </Link>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
