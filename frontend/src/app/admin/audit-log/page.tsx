"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthGuard } from "@/components/auth/auth-guard";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface AuditLogEntry {
  id: number;
  user_id: number | null;
  action: string;
  resource: string;
  resource_id: number | null;
  detail: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "text-green-600 bg-green-50 border-green-200",
  update: "text-blue-600 bg-blue-50 border-blue-200",
  delete: "text-red-600 bg-red-50 border-red-200",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Erstellt",
  update: "Geändert",
  delete: "Gelöscht",
};

const RESOURCE_LABELS: Record<string, string> = {
  member: "Mitglied",
  transaction: "Buchung",
  category: "Kategorie",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const load = async () => {
    setIsLoading(true);
    const params: Record<string, string> = {};
    if (resourceFilter) params.resource = resourceFilter;
    if (actionFilter) params.action = actionFilter;
    const res = await api.get("/admin/audit-log", { params });
    setEntries(res.data);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [resourceFilter, actionFilter]);

  return (
    <AuthGuard requireAdmin>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 ml-[260px] flex flex-col overflow-hidden">
          <Header title="Audit-Log" subtitle="Wer hat was wann geändert" />
          <main className="flex-1 overflow-y-auto p-6 space-y-4">

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Alle Bereiche</option>
                <option value="member">Mitglieder</option>
                <option value="transaction">Buchungen</option>
                <option value="category">Kategorien</option>
              </select>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Alle Aktionen</option>
                <option value="create">Erstellt</option>
                <option value="update">Geändert</option>
                <option value="delete">Gelöscht</option>
              </select>
              <button
                onClick={load}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Aktualisieren
              </button>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <ClipboardList className="w-10 h-10 opacity-30" />
                  <p className="text-sm">Keine Einträge gefunden</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zeit</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktion</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bereich</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
                      <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                          {formatDate(entry.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={cn(
                            "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                            ACTION_COLORS[entry.action] ?? "text-muted-foreground bg-muted border-border"
                          )}>
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-foreground font-medium">
                          {RESOURCE_LABELS[entry.resource] ?? entry.resource}
                          {entry.resource_id && <span className="text-muted-foreground font-normal"> #{entry.resource_id}</span>}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground max-w-xs truncate">
                          {entry.detail ?? "–"}
                        </td>
                        <td className="px-5 py-3.5 text-right text-muted-foreground font-mono text-xs">
                          #{entry.id}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
