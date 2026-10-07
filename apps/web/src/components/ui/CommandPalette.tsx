"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  Layout,
  Shield,
  FileCheck2,
  Activity,
  Layers,
  Users,
  CreditCard,
  LifeBuoy,
  FileCode,
  X,
  ArrowRight,
} from "lucide-react";

interface SearchItem {
  id: string;
  title: string;
  category: "BUILD" | "OPERATE" | "SECURE" | "COMPLY" | "ASSURE" | "ORGANIZATION";
  href: string;
  icon: any;
  shortcut?: string;
}

const DEFAULT_COMMANDS: SearchItem[] = [
  // BUILD
  { id: "apps", title: "Applications Portfolio", category: "BUILD", href: "/dashboard/applications", icon: Layers },
  { id: "arch", title: "Architecture Topology & Plan", category: "BUILD", href: "/dashboard/architecture", icon: Layout },
  { id: "releases", title: "Deployments & Releases", category: "BUILD", href: "/dashboard/deployments", icon: FileCode },

  // OPERATE
  { id: "ops", title: "Operations Health & Runbooks", category: "OPERATE", href: "/dashboard/operations", icon: Activity },
  { id: "logs", title: "CloudWatch Real-Time Logs", category: "OPERATE", href: "/dashboard/logs", icon: FileCode },
  { id: "incidents", title: "Incidents & Postmortems", category: "OPERATE", href: "/dashboard/incidents", icon: Activity },
  { id: "backups", title: "Automated Backups & Drills", category: "OPERATE", href: "/dashboard/backups", icon: Layers },

  // SECURE
  { id: "sec", title: "Security Findings & Posture", category: "SECURE", href: "/dashboard/security", icon: Shield },
  { id: "threats", title: "Continuous Threat Models", category: "SECURE", href: "/dashboard/security/threat-models", icon: Shield },
  { id: "vapt", title: "Authorized Pentesting (VAPT)", category: "SECURE", href: "/dashboard/vapt", icon: Shield },
  { id: "dr", title: "Disaster Recovery Drills", category: "SECURE", href: "/dashboard/dr", icon: Activity },

  // COMPLY
  { id: "comply", title: "Compliance Hub", category: "COMPLY", href: "/dashboard/compliance", icon: FileCheck2 },
  { id: "iso", title: "ISO 27001 Workspace", category: "COMPLY", href: "/dashboard/compliance/iso27001", icon: FileCheck2 },
  { id: "soc2", title: "SOC 2 Type II Workspace", category: "COMPLY", href: "/dashboard/compliance/soc2", icon: FileCheck2 },
  { id: "dpdp", title: "DPDP / Privacy Management", category: "COMPLY", href: "/dashboard/compliance/privacy", icon: FileCheck2 },
  { id: "policies", title: "Policy Governance Library", category: "COMPLY", href: "/dashboard/compliance/policies", icon: FileCheck2 },
  { id: "risks", title: "Enterprise Risk Register", category: "COMPLY", href: "/dashboard/compliance/risks", icon: Shield },

  // ASSURE
  { id: "assurance", title: "Continuous Assurance Overview", category: "ASSURE", href: "/dashboard/assurance", icon: Shield },
  { id: "bots", title: "Autonomous Audit Bots", category: "ASSURE", href: "/dashboard/assurance/bots", icon: Activity },
  { id: "controls", title: "Continuous Controls Monitor", category: "ASSURE", href: "/dashboard/assurance/controls", icon: FileCheck2 },
  { id: "evidence", title: "Cryptographic Evidence Vault", category: "ASSURE", href: "/dashboard/assurance/evidence", icon: FileCheck2 },
  { id: "workpapers", title: "Auditor Workpapers", category: "ASSURE", href: "/audit/workpapers", icon: FileCheck2 },

  // ORGANIZATION
  { id: "team", title: "Team & RBAC Permissions", category: "ORGANIZATION", href: "/dashboard/team", icon: Users },
  { id: "billing", title: "Subscription & Invoices", category: "ORGANIZATION", href: "/dashboard/billing", icon: CreditCard },
  { id: "support", title: "Enterprise Support Desk", category: "ORGANIZATION", href: "/dashboard/support", icon: LifeBuoy },
  { id: "sso", title: "Enterprise SAML / SCIM SSO", category: "ORGANIZATION", href: "/dashboard/settings/security/sso", icon: Shield },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const filteredItems = DEFAULT_COMMANDS.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex].href);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command search palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search (e.g. applications, findings, controls)..."
            className="w-full text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-hidden"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-50" role="listbox">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No matching commands or navigation routes found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(item.href)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                    isSelected ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600">
                      {item.category}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Enter</kbd> to select</span>
          </div>
          <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
