"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center space-x-1.5 text-xs text-slate-500 mb-4 ${className}`}>
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-slate-800 transition-colors"
        aria-label="Dashboard Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-slate-900 transition-colors font-medium truncate max-w-[150px] sm:max-w-none"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-slate-900 font-semibold truncate max-w-[200px] sm:max-w-none"
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
