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

import { MODULES, modulePath } from "@/lib/workspaces";

interface SearchItem {
  id: string;
  title: string;
  category: "BUILD" | "OPERATE" | "SECURE" | "COMPLY" | "ASSURE" | "ORGANIZATION";
  href: string;
  icon: any;
  shortcut?: string;
}

const DEFAULT_COMMANDS: SearchItem[] = [
  { id: "home", title: "Home", category: "BUILD", href: "/dashboard", icon: Layout },
  { id: "apps", title: "My apps", category: "BUILD", href: "/dashboard/applications", icon: Layers },
  { id: "arch", title: "App design", category: "BUILD", href: "/dashboard/architecture", icon: Layout },
  { id: "account", title: "My account", category: "ORGANIZATION", href: "/dashboard/account", icon: Users },
  ...MODULES.filter(item => !["releases", "environments", "calendar", "controls", "audit-readiness"].includes(item.key)).map(item => ({
    id: item.key, title: item.title,
    category: ({ Launch: "BUILD", Operate: "OPERATE", Protect: "SECURE", Govern: "COMPLY", Business: "ORGANIZATION" } as Record<string, SearchItem["category"]>)[item.group],
    href: modulePath(item.key), icon: item.group === "Protect" ? Shield : item.group === "Govern" ? FileCheck2 : item.group === "Business" ? Users : Activity,
  })),
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
            placeholder="Find a page, such as apps, security, or reports…"
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
