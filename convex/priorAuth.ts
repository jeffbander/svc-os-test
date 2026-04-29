import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { authStateValidator, cptCodeValidator, AuthState, ALL_AUTH_STATES } from "./priorAuthTypes";
import { assertOwnedByOrg, requireWorkbenchOrg, workbenchOrgIfAuthed } from "./workbenchAuth";

const MAX_REASON_TEXT_LEN = 2_000;
const MAX_VENDOR_PATIENT_ID_LEN = 128;

export const listQueueRows = query({
  args: {
    stateFilter: v.optional(v.array(authStateValidator)),
    cptFilter: v.optional(v.array(cptCodeValidator)),
  },
  handler: async (ctx, args) => {
    const orgId = await workbenchOrgIfAuthed(ctx);
    if (!orgId) return [];

    const records = await ctx.db
      .query("authRecords")
      .withIndex("byOrg", (q) => q.eq("organizationId", orgId))
      .collect();

    const filtered = records.filter((r) => {
      if (args.stateFilter && args.stateFilter.length > 0 && !args.stateFilter.includes(r.state)) return false;
      if (args.cptFilter && args.cptFilter.length > 0 && !args.cptFilter.includes(r.cptCode)) return false;
      return true;
    });

    // Hydrate patient + payer info for the table.
    const rows = await Promise.all(
      filtered.map(async (r) => {
        const patient = await ctx.db.get(r.patientId);
        const payer = await ctx.db.get(r.payerId);
        return {
          authRecordId: r._id,
          patientId: r.patientId,
          patientName: patient ? `${patient.lastName}, ${patient.firstName}` : "(unknown)",
          mrn: patient?.mrn ?? "—",
          dob: patient?.dob ?? "—",
          payerName: payer?.name ?? "(unknown)",
          cptCode: r.cptCode,
          state: r.state,
          stateChangedAt: r.stateChangedAt,
          orderingPhysicianName: r.orderingPhysicianName,
          studyDate: r.studyDate,
          submittedAt: r.submittedAt,
          decisionAt: r.decisionAt,
          expiresAt: r.expiresAt,
          externalAuthNumber: r.externalAuthNumber,
        };
      }),
    );

    rows.sort((a, b) => b.stateChangedAt - a.stateChangedAt);
    return rows;
  },
});

export const stateCounts = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await workbenchOrgIfAuthed(ctx);
    if (!orgId) return Object.fromEntries(ALL_AUTH_STATES.map((s) => [s, 0])) as Record<AuthState, number>;

    const records = await ctx.db
      .query("authRecords")
      .withIndex("byOrg", (q) => q.eq("organizationId", orgId))
      .collect();

    const counts = Object.fromEntries(ALL_AUTH_STATES.map((s) => [s, 0])) as Record<AuthState, number>;
    for (const r of records) counts[r.state]++;
    return counts;
  },
});

export const getAuthRecordDetail = query({
  args: { authRecordId: v.id("authRecords") },
  handler: async (ctx, { authRecordId }) => {
    const orgId = await workbenchOrgIfAuthed(ctx);
    if (!orgId) return null;
    const record = await ctx.db.get(authRecordId);
    if (!record || record.organizationId !== orgId) return null;
    const patient = await ctx.db.get(record.patientId);
    const payer = await ctx.db.get(record.payerId);
    const plan = record.planId ? await ctx.db.get(record.planId) : null;
    const member = patient
      ? await ctx.db
          .query("members")
          .withIndex("byPatient", (q) => q.eq("patientId", patient._id))
          .first()
      : null;
    return { record, patient, payer, plan, member };
  },
});

export const getBadgeForVendorPatient = query({
  args: {
    vendorSystem: v.union(v.literal("heartflow"), v.literal("cleerly")),
    vendorPatientId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.vendorPatientId.length > MAX_VENDOR_PATIENT_ID_LEN) return null;
    const orgId = await workbenchOrgIfAuthed(ctx);
    if (!orgId) return null;

    const patient = await ctx.db
      .query("patients")
      .withIndex("byOrgVendor", (q) =>
        q
          .eq("organizationId", orgId)
          .eq("vendorSystem", args.vendorSystem)
          .eq("vendorPatientId", args.vendorPatientId),
      )
      .first();
    if (!patient) return null;

    const records = await ctx.db
      .query("authRecords")
      .withIndex("byPatientCpt", (q) => q.eq("patientId", patient._id))
      .collect();

    const recordsWithPayer = await Promise.all(
      records.map(async (r) => {
        const payer = await ctx.db.get(r.payerId);
        return { record: r, payerName: payer?.name ?? "(unknown)" };
      }),
    );

    return {
      patient,
      authRecords: recordsWithPayer,
    };
  },
});

export const updateAuthRecordState = mutation({
  args: {
    authRecordId: v.id("authRecords"),
    newState: authStateValidator,
    reasonText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await requireWorkbenchOrg(ctx);
    if (args.reasonText && args.reasonText.length > MAX_REASON_TEXT_LEN) {
      throw new Error(`reasonText exceeds maximum (${MAX_REASON_TEXT_LEN} chars)`);
    }
    const record = await ctx.db.get(args.authRecordId);
    assertOwnedByOrg(record, orgId);

    const before = record.state;
    if (before === args.newState && (record.reasonText ?? undefined) === args.reasonText) {
      return { changed: false };
    }

    const now = Date.now();
    const patch: Partial<typeof record> = {
      state: args.newState,
      stateChangedAt: now,
      reasonText: args.reasonText,
    };

    if (args.newState === "submitted" && !record.submittedAt) {
      patch.submittedAt = now;
    }
    if (args.newState === "approved" || args.newState === "denied") {
      patch.decisionAt = now;
    }
    if (args.newState === "approved") {
      patch.expiresAt = now + 90 * 24 * 60 * 60 * 1000;
    }

    await ctx.db.patch(args.authRecordId, patch);

    await ctx.db.insert("auditLog", {
      organizationId: record.organizationId,
      action: "auth_state_changed",
      resourceType: "authRecord",
      resourceId: args.authRecordId,
      beforeState: before,
      afterState: args.newState,
      ts: now,
    });

    return { changed: true, from: before, to: args.newState };
  },
});

export const listCorpusForPayer = query({
  args: { payerId: v.optional(v.id("payers")) },
  handler: async (ctx, { payerId }) => {
    const orgId = await workbenchOrgIfAuthed(ctx);
    if (!orgId) return [];

    if (payerId) {
      const payer = await ctx.db.get(payerId);
      if (!payer || payer.organizationId !== orgId) return [];
      const chunks = await ctx.db
        .query("corpusChunks")
        .withIndex("byPayerSource", (q) => q.eq("payerId", payerId))
        .collect();
      return chunks;
    }

    // Fallback: org-scoped — corpusChunks has no byOrg index (organizationId is
    // optional), so we scan and filter. Bounded at 20 results.
    const all = await ctx.db.query("corpusChunks").collect();
    return all.filter((c) => c.organizationId === orgId).slice(0, 20);
  },
});

export const getDemoOrg = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await workbenchOrgIfAuthed(ctx);
    if (!orgId) return null;
    return await ctx.db.get(orgId);
  },
});
