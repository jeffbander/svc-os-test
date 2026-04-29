import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { CPT_DESCRIPTIONS } from "./priorAuthTypes";

// Mock LLM — deterministic templated draft with citation markers.
// Real Anthropic / Bedrock / Vertex calls gated until ANTHROPIC_HIPAA_BAA env
// flag is true (i.e. BAA signed). Hackathon = mock only.

function buildMockDraft(args: {
  patientFirstName: string;
  patientLastName: string;
  dob: string;
  mrn: string;
  payerName: string;
  cptCode: string;
  orderingPhysician: string | undefined;
  citationCount: number;
}): string {
  const cptDesc = CPT_DESCRIPTIONS[args.cptCode as keyof typeof CPT_DESCRIPTIONS] ?? args.cptCode;
  const citationLines = Array.from({ length: args.citationCount }, (_, i) => `[CITATION:${i + 1}]`).join(" ");

  return `# Prior Authorization Request — CPT ${args.cptCode}

**Patient:** ${args.patientLastName}, ${args.patientFirstName}
**DOB:** ${args.dob}
**MRN:** ${args.mrn}
**Payer:** ${args.payerName}
**Service requested:** ${cptDesc}
**Ordering physician:** ${args.orderingPhysician ?? "[ORDERING_PHYSICIAN]"}

## Clinical indication

[CITATION_NEEDED — clinical history: presenting symptoms, duration, prior workup. Pull from EHR notes before submission.]

## Medical necessity

The requested study is medically necessary based on the patient's presentation
and is consistent with payer coverage criteria. ${citationLines}

Specifically:
- Pre-test probability: intermediate per ACC/AHA chest pain guideline.
- Prior noninvasive testing: [CITATION_NEEDED — prior stress test, echo, or
  cath results].
- Risk factors: [CITATION_NEEDED — HTN, HLD, DM, family history, smoking].

## Coverage criteria reviewed

The retrieved policy excerpts above support coverage of CPT ${args.cptCode}
under the patient's plan. Coordinator: please verify member eligibility and
attach the highlighted policy citations to this submission.

## Attestation

I attest that the information above is accurate to the best of my knowledge.
This authorization request is being submitted for medically necessary care.

— Drafted by AI assistant for coordinator review.
— Generated with mock LLM (BAA pending). Replace with HIPAA-eligible model
   before pilot phase.
`;
}

export const draftPacket = mutation({
  args: {
    authRecordId: v.id("authRecords"),
  },
  handler: async (ctx, { authRecordId }) => {
    const record = await ctx.db.get(authRecordId);
    if (!record) throw new Error("Auth record not found");

    const patient = await ctx.db.get(record.patientId);
    const payer = await ctx.db.get(record.payerId);
    if (!patient || !payer) throw new Error("Missing patient or payer");

    // Retrieve relevant corpus chunks.
    // Hybrid retrieval (keyword + vector) deferred to pilot phase per design D3.
    // Hackathon: simple payer-scoped pull + a couple of guideline chunks.
    const payerChunks = await ctx.db
      .query("corpusChunks")
      .withIndex("byPayerSource", (q) => q.eq("payerId", payer._id))
      .collect();
    const guidelineChunks = await ctx.db
      .query("corpusChunks")
      .withIndex("bySource", (q) => q.eq("sourceType", "acc_aha_guideline"))
      .collect();
    const lcdChunks = await ctx.db
      .query("corpusChunks")
      .withIndex("bySource", (q) => q.eq("sourceType", "lcd"))
      .collect();

    const citations = [...payerChunks, ...guidelineChunks, ...lcdChunks].slice(0, 5);
    const citationChunkIds = citations.map((c) => c._id);

    const draftMarkdown = buildMockDraft({
      patientFirstName: patient.firstName,
      patientLastName: patient.lastName,
      dob: patient.dob,
      mrn: patient.mrn,
      payerName: payer.name,
      cptCode: record.cptCode,
      orderingPhysician: record.orderingPhysicianName,
      citationCount: citations.length,
    });

    const now = Date.now();
    const useRealLlm = process.env.ANTHROPIC_HIPAA_BAA === "true";
    const draftId = await ctx.db.insert("packetDrafts", {
      organizationId: record.organizationId,
      authRecordId,
      draftMarkdown,
      citationChunkIds,
      generatedBy: useRealLlm ? "anthropic" : "mock_llm",
      modelVersion: useRealLlm ? "claude-opus-4-7" : "mock-deterministic-v1",
      createdAt: now,
    });

    await ctx.db.patch(authRecordId, { packetDraftId: draftId });

    await ctx.db.insert("auditLog", {
      organizationId: record.organizationId,
      action: "packet_drafted",
      resourceType: "packetDraft",
      resourceId: draftId,
      ts: now,
    });

    return { draftId, citationChunkIds, draftMarkdown };
  },
});

export const getDraftForAuthRecord = query({
  args: { authRecordId: v.id("authRecords") },
  handler: async (ctx, { authRecordId }) => {
    const drafts = await ctx.db
      .query("packetDrafts")
      .withIndex("byAuthRecord", (q) => q.eq("authRecordId", authRecordId))
      .order("desc")
      .take(1);
    const draft = drafts[0];
    if (!draft) return null;

    const citationChunks = await Promise.all(
      draft.citationChunkIds.map((id) => ctx.db.get(id)),
    );
    return {
      draft,
      citationChunks: citationChunks.filter((c): c is NonNullable<typeof c> => c !== null),
    };
  },
});

export const saveDraftEdits = mutation({
  args: {
    draftId: v.id("packetDrafts"),
    editedMarkdown: v.string(),
  },
  handler: async (ctx, { draftId, editedMarkdown }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) throw new Error("Draft not found");
    await ctx.db.patch(draftId, { coordinatorEdits: editedMarkdown });
    await ctx.db.insert("auditLog", {
      organizationId: draft.organizationId,
      action: "packet_draft_edited",
      resourceType: "packetDraft",
      resourceId: draftId,
      ts: Date.now(),
    });
    return { ok: true };
  },
});

export const markPacketSubmitted = mutation({
  args: {
    draftId: v.id("packetDrafts"),
  },
  handler: async (ctx, { draftId }) => {
    const draft = await ctx.db.get(draftId);
    if (!draft) throw new Error("Draft not found");

    const now = Date.now();
    await ctx.db.patch(draftId, { submittedAt: now });

    const record = await ctx.db.get(draft.authRecordId);
    if (record && record.state !== "submitted") {
      const before = record.state;
      await ctx.db.patch(draft.authRecordId, {
        state: "submitted",
        stateChangedAt: now,
        submittedAt: now,
      });
      await ctx.db.insert("auditLog", {
        organizationId: record.organizationId,
        action: "auth_state_changed",
        resourceType: "authRecord",
        resourceId: draft.authRecordId,
        beforeState: before,
        afterState: "submitted",
        ts: now,
      });
    }

    return { ok: true };
  },
});
