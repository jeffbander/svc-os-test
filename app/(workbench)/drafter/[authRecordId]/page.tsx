"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ALL_AUTH_STATES, AuthState, CPT_DESCRIPTIONS, CptCode } from "@/convex/priorAuthTypes";
import { STATE_LABEL, STATE_PILL_TONE } from "@/lib/auth-state-display";

export default function DrafterPage() {
  const params = useParams<{ authRecordId: string }>();
  const authRecordId = params.authRecordId as Id<"authRecords">;

  const detail = useQuery(api.priorAuth.getAuthRecordDetail, { authRecordId });
  const draftBundle = useQuery(api.packetDrafter.getDraftForAuthRecord, { authRecordId });

  const draftPacket = useMutation(api.packetDrafter.draftPacket);
  const saveDraftEdits = useMutation(api.packetDrafter.saveDraftEdits);
  const markSubmitted = useMutation(api.packetDrafter.markPacketSubmitted);
  const updateState = useMutation(api.priorAuth.updateAuthRecordState);

  const [editedMarkdown, setEditedMarkdown] = useState<string>("");
  const [drafting, setDrafting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (draftBundle?.draft) {
      const initial = draftBundle.draft.coordinatorEdits ?? draftBundle.draft.draftMarkdown;
      setEditedMarkdown(initial);
    }
  }, [draftBundle?.draft?._id]);

  const dirty = useMemo(() => {
    if (!draftBundle?.draft) return false;
    const initial = draftBundle.draft.coordinatorEdits ?? draftBundle.draft.draftMarkdown;
    return editedMarkdown !== initial;
  }, [editedMarkdown, draftBundle?.draft]);

  if (detail === undefined) {
    return (
      <main className="mx-auto max-w-[1280px] px-8 py-12">
        <p className="text-sm text-[color:var(--wb-text-tertiary)]">loading…</p>
      </main>
    );
  }
  if (detail === null) {
    return (
      <main className="mx-auto max-w-[1280px] px-8 py-12">
        <p className="text-sm">Auth record not found.</p>
        <Link href="/queue" className="wb-button-ghost mt-4 inline-block">
          ← Back to queue
        </Link>
      </main>
    );
  }

  const { record, patient, payer } = detail;
  const cptDesc = CPT_DESCRIPTIONS[record.cptCode as CptCode];

  return (
    <main className="mx-auto max-w-[1280px] px-8 py-10">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <Link href="/queue" className="text-xs uppercase tracking-[0.12em] text-[color:var(--wb-text-tertiary)] hover:underline">
            ← Worklist
          </Link>
          <h1 className="wb-display mt-2 text-3xl leading-tight">
            {patient ? `${patient.lastName}, ${patient.firstName}` : "Patient"}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--wb-text-secondary)]">
            CPT <span className="wb-mono text-[13px]">{record.cptCode}</span> · {cptDesc} · {payer?.name ?? "—"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <span
            className="wb-pill"
            data-tone={STATE_PILL_TONE[record.state]}
            data-state={record.state}
            data-testid="current-state"
          >
            {STATE_LABEL[record.state]}
          </span>
          <select
            className="wb-select"
            value={record.state}
            onChange={async (e) => {
              const next = e.target.value as AuthState;
              await updateState({ authRecordId, newState: next });
            }}
            data-testid="state-select"
          >
            {ALL_AUTH_STATES.map((s) => (
              <option key={s} value={s}>
                {STATE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <hr className="wb-hairline mb-8" />

      <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
        {/* Left pane: patient + retrieved citations */}
        <aside className="space-y-6">
          <div className="wb-card">
            <h2 className="text-xs uppercase tracking-[0.12em] text-[color:var(--wb-text-tertiary)]">
              Patient
            </h2>
            {patient && (
              <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1 text-sm">
                <dt className="text-[color:var(--wb-text-tertiary)]">DOB</dt>
                <dd className="tabular-nums">{patient.dob}</dd>
                <dt className="text-[color:var(--wb-text-tertiary)]">MRN</dt>
                <dd className="wb-mono text-[13px]">{patient.mrn}</dd>
                <dt className="text-[color:var(--wb-text-tertiary)]">Sex</dt>
                <dd>{patient.sex}</dd>
                <dt className="text-[color:var(--wb-text-tertiary)]">Vendor ID</dt>
                <dd className="wb-mono text-[12px] text-[color:var(--wb-text-secondary)]">
                  {patient.vendorSystem}/{patient.vendorPatientId}
                </dd>
              </dl>
            )}
          </div>

          <div className="wb-card">
            <h2 className="text-xs uppercase tracking-[0.12em] text-[color:var(--wb-text-tertiary)]">
              Retrieved citations
            </h2>
            {!draftBundle?.draft && (
              <p className="mt-3 text-sm text-[color:var(--wb-text-tertiary)]">
                No draft yet. Click <em>Draft with AI</em> to retrieve relevant policy and guideline excerpts.
              </p>
            )}
            {draftBundle?.citationChunks.map((chunk, idx) => (
              <article key={chunk._id} className="mt-4 border-t border-[color:var(--wb-rule)] pt-4 first:border-t-0 first:pt-0">
                <p className="text-xs uppercase tracking-[0.08em] text-[color:var(--wb-text-tertiary)]">
                  [{idx + 1}] {chunk.sourceType.replace(/_/g, " ")}
                </p>
                <p className="wb-display mt-1 text-base leading-snug">{chunk.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--wb-text-secondary)]">
                  {chunk.chunkText}
                </p>
                {chunk.sourceUrl && (
                  <a
                    href={chunk.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-[color:var(--wb-accent)] hover:underline"
                  >
                    Source →
                  </a>
                )}
              </article>
            ))}
          </div>
        </aside>

        {/* Right pane: draft editor */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.12em] text-[color:var(--wb-text-tertiary)]">
              Packet draft
            </h2>
            <div className="flex items-center gap-3 text-xs text-[color:var(--wb-text-tertiary)]">
              {draftBundle?.draft?.generatedBy === "mock_llm" && (
                <span className="wb-mono">mock LLM · BAA pending</span>
              )}
              {savedAt && <span className="tabular-nums">saved {new Date(savedAt).toLocaleTimeString()}</span>}
            </div>
          </div>

          {!draftBundle?.draft && (
            <div className="wb-card flex flex-col items-start gap-4">
              <p className="text-sm text-[color:var(--wb-text-secondary)]">
                No draft has been generated for this auth record yet.
              </p>
              <button
                type="button"
                className="wb-button-primary"
                disabled={drafting}
                data-testid="draft-button"
                onClick={async () => {
                  setDrafting(true);
                  try {
                    await draftPacket({ authRecordId });
                  } finally {
                    setDrafting(false);
                  }
                }}
              >
                {drafting ? "Drafting…" : "Draft with AI"}
              </button>
            </div>
          )}

          {draftBundle?.draft && (
            <div className="wb-card">
              <textarea
                className="wb-textarea min-h-[640px] font-mono text-[13px] leading-relaxed"
                style={{ fontFamily: "var(--font-jetbrains)" }}
                value={editedMarkdown}
                onChange={(e) => setEditedMarkdown(e.target.value)}
                spellCheck
                data-testid="draft-textarea"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="wb-button-ghost"
                  disabled={!dirty}
                  onClick={async () => {
                    if (!draftBundle.draft) return;
                    await saveDraftEdits({
                      draftId: draftBundle.draft._id,
                      editedMarkdown,
                    });
                    setSavedAt(Date.now());
                  }}
                  data-testid="save-edits"
                >
                  {dirty ? "Save edits" : "No edits"}
                </button>
                <button
                  type="button"
                  className="wb-button-primary"
                  disabled={record.state === "submitted"}
                  onClick={async () => {
                    if (!draftBundle.draft) return;
                    await markSubmitted({ draftId: draftBundle.draft._id });
                  }}
                  data-testid="mark-submitted"
                >
                  Mark submitted
                </button>
                <button
                  type="button"
                  className="wb-button-ghost ml-auto"
                  onClick={async () => {
                    setDrafting(true);
                    try {
                      await draftPacket({ authRecordId });
                    } finally {
                      setDrafting(false);
                    }
                  }}
                  data-testid="redraft"
                >
                  {drafting ? "Drafting…" : "Re-draft"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
