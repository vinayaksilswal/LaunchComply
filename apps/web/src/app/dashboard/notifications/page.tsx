"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Shield,
  FileText,
  Clock,
  ExternalLink,
  Filter
} from "lucide-react";

interface NotificationItem {
  id: string;
  category: "COMMERCIAL" | "SECURITY" | "COMPLIANCE" | "OPERATIONS";
  title: string;
  message: string;
  time: string;
  read: boolean;
  link: string;
  priority: "HIGH" | "NORMAL" | "LOW";
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>("ALL");
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      category: "COMMERCIAL",
      title: "Monthly Tax Invoice LC-INV-2026-0003 Issued",
      message: "Your October tax invoice has been generated and settled via Stripe tokenized billing.",
      time: "2 days ago",
      read: false,
      link: "/dashboard/billing",
      priority: "NORMAL"
    },
    {
      id: "notif-2",
      category: "COMPLIANCE",
      title: "Resend SaaS Vendor Security Assessment Expiring",
      message: "The annual security and bilateral DPA assessment for Resend expires in 17 days.",
      time: "3 days ago",
      read: false,
      link: "/dashboard/compliance/vendors",
      priority: "HIGH"
    },
    {
      id: "notif-3",
      category: "SECURITY",
      title: "Cross-Region Automated Restore Drill Completed",
      message: "Disaster recovery drill restored database snapshot from ap-south-1 to ap-southeast-1 in 12m22s. RTO met.",
      time: "5 days ago",
      read: true,
      link: "/dashboard/dr",
      priority: "LOW"
    },
    {
      id: "notif-4",
      category: "OPERATIONS",
      title: "Weekly CloudWatch Alert Telemetry Fresh",
      message: "14 cloud resources verified healthy with continuous evidence logged in Vault.",
      time: "1 week ago",
      read: true,
      link: "/dashboard/operations",
      priority: "LOW"
    }
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const filtered = notifications.filter(n => filter === "ALL" || n.category === filter);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Commercial & Technical Signals</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Notification Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Unified alerts across billing events, security findings, compliance milestones, and operational telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {["ALL", "COMMERCIAL", "SECURITY", "COMPLIANCE", "OPERATIONS"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === cat
                ? "bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border transition-all ${
              !n.read
                ? "bg-slate-900 border-cyan-500/30 shadow-md shadow-cyan-950/20"
                : "bg-slate-900/60 border-slate-800"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {!n.read ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse mt-1" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-700 mt-1" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {n.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">• {n.time}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{n.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                </div>
              </div>

              <Link
                href={n.link}
                className="self-end sm:self-center shrink-0 flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                <span>View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
