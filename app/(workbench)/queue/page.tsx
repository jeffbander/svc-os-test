"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { ALL_AUTH_STATES, AuthState } from "@/convex/priorAuthTypes";
import { STATE_COLUMN_ORDER, STATE_LABEL, STATE_PILL_TONE } from "@/lib/auth-state-display";

const QUICK_FILTERS: Array<{ id: string; label: string; states: AuthState[] | null }> = [
  { id: "all", label: "All", states: null },
  { id: "actionable", label: "Action needed", states: ["needed", "more_info_required", "peer_to_peer_required", "appealed"] },
  { id: "in_flight", label: "In flight", states: ["submitted"] },
  { id: "decided", label: "Decided", states: ["approved", "denied", "expired"] },
];

function formatDate(ts: number | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function QueuePage() {
  const [activeFilterId, setActiveFilterId] = useState<string>("all");
  const activeFilter = QUICK_FILTERS.find((f) => f.id === activeFilterId) ?? QUICK_FILTERS[0];

  const counts = useQuery(api.priorAuth.stateCounts);
  const rows = useQuery(api.priorAuth.listQueueRows, {
    stateFilter: activeFilter.states ?? undefined,
  });

  const totalCount = useMemo(() => {
    if (!counts) return 0;
    return ALL_AUTH_STATES.reduce((acc, s) => acc + (counts[s] ?? 0), 0);
  }, [counts]);

  return (
    <main className="mx-auto max-w-[1280px] px-8 py-12">
      <header className="mb-12">
        <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--wb-text-tertiary)]">
          Coordinator Worklist
        </p>
        <h1 className="wb-display mt-2 text-4xl leading-tight">Cardiac CT prior-authorization</h1>
        <p className="mt-3 max-w-[640px] text-sm text-[color:var(--wb-text-secondary)]">
          Synthetic demo data — no real PHI. All eleven auth states are represented in the seeded set
          for design QA.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-6">
        {STATE_COLUMN_ORDER.map((s) => {
          const count = counts?.[s] ?? 0;
          return (
            <div key={s} className="border-l border-[color:var(--wb-rule)] pl-3">
              <div className="wb-display text-2xl tabular-nums">{count}</div>
              <div className="text-xs uppercase tracking-[0.08em] text-[color:var(--wb-text-tertiary)]">
                {STATE_LABEL[s]}
              </div>
            </div>
          );
        })}
      </section>

      <hr className="wb-hairline mb-6" />

      <div className="mb-6 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFilterId(f.id)}
            className={
              activeFilterId === f.id ? "wb-button-primary" : "wb-button-ghost"
            }
            data-testid={`filter-${f.id}`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto self-center text-sm text-[color:var(--wb-text-tertiary)] tabular-nums">
          {rows ? `${rows.length} of ${totalCount}` : `loading…`}
        </div>
      </div>

      <div className="wb-card overflow-x-auto p-0">
        <table className="wb-table" data-testid="queue-table">
          <thead>
            <tr>
              <th>Patient</th>
              <th>MRN</th>
              <th>Payer</th>
              <th>CPT</th>
              <th>State</th>
              <th>Study date</th>
              <th>Last change</th>
              <th>Auth #</th>
            </tr>
          </thead>
          <tbody>
            {rows === undefined && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[color:var(--wb-text-tertiary)]">
                  loading…
                </td>
              </tr>
            )}
            {rows && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[color:var(--wb-text-tertiary)]">
                  No records match this filter.
                </td>
              </tr>
            )}
            {rows?.map((row) => (
              <tr key={row.authRecordId} data-testid={`queue-row-${row.authRecordId}`}>
                <td>
                  <Link
                    href={`/drafter/${row.authRecordId}`}
                    className="font-medium hover:underline"
                  >
                    {row.patientName}
                  </Link>
                </td>
                <td className="wb-mono text-[13px]">{row.mrn}</td>
                <td>{row.payerName}</td>
                <td className="wb-mono text-[13px]">{row.cptCode}</td>
                <td>
                  <span
                    className="wb-pill"
                    data-tone={STATE_PILL_TONE[row.state]}
                    data-state={row.state}
                  >
                    {STATE_LABEL[row.state]}
                  </span>
                </td>
                <td className="tabular-nums">{row.studyDate ?? "—"}</td>
                <td className="tabular-nums">{formatDate(row.stateChangedAt)}</td>
                <td className="wb-mono text-[12px] text-[color:var(--wb-text-secondary)]">
                  {row.externalAuthNumber ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
