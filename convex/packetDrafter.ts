import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { CPT_DESCRIPTIONS } from "./priorAuthTypes";
import { assertOwnedByOrg, requireWorkbenchOrg, workbenchOrgIfAuthed } from "./workbenchAuth";

// Mock LLM — deterministic templated draft with citation markers.
// Real Anthropic / Bedrock / Vertex calls gated until the integration is wired
// up AND the corresponding HIPAA BAA is signed. The flag alone is insufficient
// — the handler refuses to claim "anthropic" provenance unless a real call
// path is in place. Hackathon = mock only.

const MAX_EDITED_MARKDOWN_LEN = 50_000;

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
    const orgId = await requireWorkbenchOrg(ctx);
    const record = await ctx.db.get(authRecordId);
    assertOwnedByOrg(record, orgId);

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

    // Real LLM gate. The flag alone is not enough — fail loudly if it's set
    // without a real implementation, so the audit log never falsely claims
    // "anthropic" provenance for a mock-generated document.
    if (process.env.ANTHROPIC_HIPAA_BAA === "true") {
      throw new Error(
        "ANTHROPIC_HIPAA_BAA is set but the real LLM call is not yet implemented. " +
          "Do not enable this flag until the Anthropic SDK integration is wired up.",
      );
    }

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
    const draftId = await ctx.db.insert("packetDrafts", {
      organizationId: record.organizationId,
      authRecordId,
      draftMarkdown,
      citationChunkIds,
      generatedBy: "mock_llm",
      modelVersion: "mock-deterministic-v1",
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
    const orgId = await workbenchOrgIfAuthed(ctx);
    if (!orgId) return null;

    const record = await ctx.db.get(authRecordId);
    if (!record || record.organizationId !== orgId) return null;

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
    const orgId = await requireWorkbenchOrg(ctx);
    if (editedMarkdown.length > MAX_EDITED_MARKDOWN_LEN) {
      throw new Error(`editedMarkdown exceeds maximum (${MAX_EDITED_MARKDOWN_LEN} chars)`);
    }
    const draft = await ctx.db.get(draftId);
    assertOwnedByOrg(draft, orgId);

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
    const orgId = await requireWorkbenchOrg(ctx);
    const draft = await ctx.db.get(draftId);
    assertOwnedByOrg(draft, orgId);

    const now = Date.now();
    await ctx.db.patch(draftId, { submittedAt: now });

    const record = await ctx.db.get(draft.authRecordId);
    if (record && record.organizationId === orgId && record.state !== "submitted") {
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
