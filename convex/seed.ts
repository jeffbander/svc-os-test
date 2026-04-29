import { mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { ALL_AUTH_STATES, AuthState, CptCode, HEARTFLOW_CPT_CODES } from "./priorAuthTypes";

// Synthetic seed data for hackathon phase.
// All names, MRNs, DOBs, and member IDs are fabricated. NO REAL PHI.
// Run via Convex dashboard or `npx convex run seed:seedHackathonDemo`.

const DEMO_ORG_NAME = "Mount Sinai Cardiology — Demo Practice";
const DEMO_ORG_PRACTICE = "MSHS Cardiology Pilot";

const SYNTHETIC_PAYERS = [
  { name: "Aetna", type: "commercial" as const, portalUrl: "https://www.aetna.com/healthcare-professionals.html", faxNumber: "1-800-555-0101" },
  { name: "UnitedHealthcare", type: "commercial" as const, portalUrl: "https://www.uhcprovider.com", faxNumber: "1-800-555-0102" },
  { name: "Anthem Blue Cross Blue Shield", type: "commercial" as const, portalUrl: "https://www.anthem.com/provider", faxNumber: "1-800-555-0103" },
  { name: "Empire BlueCross BlueShield", type: "commercial" as const, portalUrl: "https://www.empireblue.com/provider", faxNumber: "1-800-555-0104" },
];

const SYNTHETIC_PLANS_PER_PAYER = [
  { suffix: "Choice POS II", planType: "POS" as const },
  { suffix: "Open Access PPO", planType: "PPO" as const },
];

// 20 fabricated patients. Distribution covers age range 45–82 (cardiac CT population).
const SYNTHETIC_PATIENTS: Array<{ first: string; last: string; dob: string; sex: "F" | "M" | "X"; mrnSuffix: string }> = [
  { first: "Margaret", last: "Chen", dob: "1957-03-14", sex: "F", mrnSuffix: "104782" },
  { first: "Robert", last: "Okonkwo", dob: "1962-11-22", sex: "M", mrnSuffix: "104783" },
  { first: "Eleanor", last: "Hartman", dob: "1944-07-09", sex: "F", mrnSuffix: "104784" },
  { first: "James", last: "Park", dob: "1968-01-30", sex: "M", mrnSuffix: "104785" },
  { first: "Patricia", last: "Vasquez", dob: "1955-09-17", sex: "F", mrnSuffix: "104786" },
  { first: "Walter", last: "Reinhardt", dob: "1949-05-04", sex: "M", mrnSuffix: "104787" },
  { first: "Sofia", last: "Ali", dob: "1972-12-12", sex: "F", mrnSuffix: "104788" },
  { first: "Henry", last: "Thompson", dob: "1951-08-21", sex: "M", mrnSuffix: "104789" },
  { first: "Beatrice", last: "Duvall", dob: "1946-02-28", sex: "F", mrnSuffix: "104790" },
  { first: "Marcus", last: "Wei", dob: "1965-06-13", sex: "M", mrnSuffix: "104791" },
  { first: "Anna", last: "Goldberg", dob: "1958-10-05", sex: "F", mrnSuffix: "104792" },
  { first: "David", last: "Mbeki", dob: "1953-04-19", sex: "M", mrnSuffix: "104793" },
  { first: "Helen", last: "Nakamura", dob: "1969-07-26", sex: "F", mrnSuffix: "104794" },
  { first: "Theodore", last: "Brennan", dob: "1947-11-08", sex: "M", mrnSuffix: "104795" },
  { first: "Constance", last: "Whitfield", dob: "1961-03-31", sex: "F", mrnSuffix: "104796" },
  { first: "Pavel", last: "Volkov", dob: "1956-12-15", sex: "M", mrnSuffix: "104797" },
  { first: "Yara", last: "Hassan", dob: "1974-08-02", sex: "F", mrnSuffix: "104798" },
  { first: "Richard", last: "O'Sullivan", dob: "1948-09-24", sex: "M", mrnSuffix: "104799" },
  { first: "Cecilia", last: "Ramirez", dob: "1963-05-11", sex: "F", mrnSuffix: "104800" },
  { first: "Frederick", last: "Asante", dob: "1959-01-07", sex: "M", mrnSuffix: "104801" },
];

// Auth state distribution across the 20 patients × 2 CPT codes.
// Covers all 11 states for demo. Skewed toward "real" workflow distribution
// (mostly needed/submitted/approved with a long tail of edge states).
function pickStateForIndex(i: number): AuthState {
  // First 11 records guarantee one of each state for demo coverage.
  if (i < ALL_AUTH_STATES.length) return ALL_AUTH_STATES[i];
  // Remaining records weighted toward common states.
  const weighted: AuthState[] = [
    "needed", "needed", "needed",
    "submitted", "submitted",
    "approved", "approved", "approved",
    "more_info_required",
    "denied",
    "peer_to_peer_required",
    "appealed",
  ];
  return weighted[i % weighted.length];
}

const SAMPLE_REASONS: Partial<Record<AuthState, string>> = {
  more_info_required: "Payer requested additional clinical notes documenting symptom onset, duration, and prior nuclear stress test results.",
  peer_to_peer_required: "Payer medical director requested peer-to-peer call. Scheduled for tomorrow 2pm with Dr. Chen.",
  denied: "Denied — payer cites lack of failed conservative management documentation. Appeal in progress.",
  appealed: "Appeal submitted with additional documentation of failed beta-blocker trial and recurrent angina.",
  approved: "Approved per Aetna CPB 0676. Auth number issued; valid 90 days.",
  expired: "Auth expired before study completed. New auth requested.",
  withdrawn: "Patient declined procedure after shared decision-making conversation. Auth withdrawn.",
  cancelled: "Cancelled — patient referred to alternative non-invasive workup.",
  not_required: "Self-pay patient. No prior authorization required.",
};

const ORDERING_PHYSICIANS = [
  "Dr. Aamir Khan",
  "Dr. Lisa Goldstein",
  "Dr. Ravi Subramanian",
  "Dr. Jennifer O'Brien",
  "Dr. Marcus Bell",
];

const SAMPLE_CORPUS_CHUNKS = [
  {
    sourceType: "payer_policy" as const,
    title: "Aetna CPB 0676 — Cardiac CT Angiography",
    sourceUrl: "https://www.aetna.com/cpb/medical/data/600_699/0676.html",
    chunkText: "Aetna considers coronary CT angiography (CCTA) with fractional flow reserve (FFR-CT, CPT 75577) medically necessary for evaluation of suspected coronary artery disease in stable, symptomatic patients with intermediate pre-test probability when noninvasive stress testing is inconclusive or contraindicated, OR when the patient has known or suspected coronary anomalies.",
    chunkOrder: 1,
    effectiveDate: "2024-09-01",
  },
  {
    sourceType: "payer_policy" as const,
    title: "UnitedHealthcare Medical Policy — Cardiac CT/MRI",
    sourceUrl: "https://www.uhcprovider.com/policies/medical/cardiac-imaging.html",
    chunkText: "UHC requires documentation of: (1) symptoms consistent with stable angina or anginal-equivalent, (2) intermediate pre-test probability per ACC/AHA guidelines, (3) inconclusive prior stress test OR contraindication to stress testing. CCTA with plaque analysis (CPT 75580) requires additional documentation of high-risk features identified on initial CCTA.",
    chunkOrder: 1,
    effectiveDate: "2024-11-15",
  },
  {
    sourceType: "acc_aha_guideline" as const,
    title: "2021 AHA/ACC Chest Pain Guideline — CCTA Indications",
    sourceUrl: "https://www.ahajournals.org/doi/10.1161/CIR.0000000000001029",
    chunkText: "For intermediate-high risk patients with acute chest pain and no known CAD, CCTA is recommended (Class 1, LOE A) for exclusion of atherosclerotic plaque and obstructive CAD. For stable chest pain with no known CAD and intermediate-high pretest probability, CCTA is recommended (Class 1, LOE A).",
    chunkOrder: 1,
    effectiveDate: "2021-10-28",
  },
  {
    sourceType: "lcd" as const,
    title: "LCD L34636 — Cardiac Computed Tomography",
    sourceUrl: "https://www.cms.gov/medicare-coverage-database/details/lcd-details.aspx?LCDId=34636",
    chunkText: "Medicare covers CCTA when: (a) patient has stable, symptomatic CAD with intermediate pretest probability, (b) prior noninvasive stress test was nondiagnostic or equivocal, (c) ordering physician is board-certified in cardiology, cardiothoracic surgery, or cardiac radiology, AND (d) facility meets imaging quality standards per ACR/SCCT.",
    chunkOrder: 1,
    effectiveDate: "2023-04-01",
  },
];

export const seedHackathonDemo = mutation({
  args: {
    confirmReseed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Idempotent: if a hackathon-demo org exists, wipe its child data and reseed.
    const existing = await ctx.db
      .query("organizations")
      .withIndex("byHackathonDemo", (q) => q.eq("isHackathonDemo", true))
      .collect();

    if (existing.length > 0 && !args.confirmReseed) {
      throw new Error(
        "Hackathon demo data already seeded. Pass { confirmReseed: true } to clear and reseed.",
      );
    }

    // Wipe existing demo data.
    for (const org of existing) {
      await wipeOrgData(ctx, org._id);
      await ctx.db.delete(org._id);
    }

    const now = Date.now();

    const orgId = await ctx.db.insert("organizations", {
      name: DEMO_ORG_NAME,
      pilotPracticeName: DEMO_ORG_PRACTICE,
      isHackathonDemo: true,
      createdAt: now,
    });

    // Payers
    const payerIds: Record<string, Id<"payers">> = {};
    for (const p of SYNTHETIC_PAYERS) {
      const id = await ctx.db.insert("payers", {
        organizationId: orgId,
        name: p.name,
        type: p.type,
        portalUrl: p.portalUrl,
        faxNumber: p.faxNumber,
      });
      payerIds[p.name] = id;
    }

    // Plans (2 per payer)
    const planIdsByPayer: Record<string, Id<"plans">[]> = {};
    for (const p of SYNTHETIC_PAYERS) {
      planIdsByPayer[p.name] = [];
      for (const planSpec of SYNTHETIC_PLANS_PER_PAYER) {
        const planId = await ctx.db.insert("plans", {
          organizationId: orgId,
          payerId: payerIds[p.name],
          name: `${p.name} ${planSpec.suffix}`,
          planType: planSpec.planType,
        });
        planIdsByPayer[p.name].push(planId);
      }
    }

    // Patients + members + authRecords
    const payerNames = SYNTHETIC_PAYERS.map((p) => p.name);
    let authRecordIndex = 0;

    for (let i = 0; i < SYNTHETIC_PATIENTS.length; i++) {
      const p = SYNTHETIC_PATIENTS[i];
      const patientId = await ctx.db.insert("patients", {
        organizationId: orgId,
        vendorSystem: "heartflow",
        vendorPatientId: `hf-${p.mrnSuffix}`,
        mrn: `MS-${p.mrnSuffix}`,
        firstName: p.first,
        lastName: p.last,
        dob: p.dob,
        sex: p.sex,
        createdAt: now,
      });

      // Assign a payer round-robin
      const payerName = payerNames[i % payerNames.length];
      const payerId = payerIds[payerName];
      const planId = planIdsByPayer[payerName][i % SYNTHETIC_PLANS_PER_PAYER.length];

      await ctx.db.insert("members", {
        organizationId: orgId,
        patientId,
        planId,
        memberId: `${payerName.split(" ")[0].toUpperCase()}${p.mrnSuffix}`,
        groupId: `GRP-MSHS-${(i % 3) + 1}`,
        effectiveDate: "2026-01-01",
      });

      // Each patient gets 1-2 authRecords across the two CPT codes
      const cptsForThisPatient: CptCode[] = i % 3 === 0 ? HEARTFLOW_CPT_CODES : [HEARTFLOW_CPT_CODES[i % 2]];

      for (const cpt of cptsForThisPatient) {
        const state = pickStateForIndex(authRecordIndex);
        authRecordIndex++;

        const studyDateOffset = (i % 14) - 3; // some past, some future
        const studyDate = new Date(now + studyDateOffset * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const authRecordId = await ctx.db.insert("authRecords", {
          organizationId: orgId,
          patientId,
          payerId,
          planId,
          cptCode: cpt,
          state,
          stateChangedAt: now - (i * 60 * 60 * 1000),
          reasonText: SAMPLE_REASONS[state],
          submittedAt: ["submitted", "more_info_required", "peer_to_peer_required", "appealed", "approved", "denied", "expired"].includes(state)
            ? now - (i * 60 * 60 * 1000) - 24 * 60 * 60 * 1000
            : undefined,
          decisionAt: ["approved", "denied"].includes(state) ? now - (i * 60 * 60 * 1000) : undefined,
          expiresAt: state === "approved" ? now + 90 * 24 * 60 * 60 * 1000 : state === "expired" ? now - 7 * 24 * 60 * 60 * 1000 : undefined,
          externalAuthNumber: state === "approved" ? `AUTH-${payerName.split(" ")[0].toUpperCase()}-${100000 + i}` : undefined,
          orderingPhysicianName: ORDERING_PHYSICIANS[i % ORDERING_PHYSICIANS.length],
          studyDate,
        });

        await ctx.db.insert("auditLog", {
          organizationId: orgId,
          action: "auth_record_seeded",
          resourceType: "authRecord",
          resourceId: authRecordId,
          afterState: state,
          ts: now,
        });
      }
    }

    // Corpus chunks (associated with first payer for demo retrieval)
    const aetnaId = payerIds["Aetna"];
    const uhcId = payerIds["UnitedHealthcare"];
    for (const chunk of SAMPLE_CORPUS_CHUNKS) {
      await ctx.db.insert("corpusChunks", {
        organizationId: orgId,
        payerId: chunk.title.includes("Aetna") ? aetnaId : chunk.title.includes("UnitedHealthcare") ? uhcId : undefined,
        sourceType: chunk.sourceType,
        title: chunk.title,
        sourceUrl: chunk.sourceUrl,
        chunkText: chunk.chunkText,
        chunkOrder: chunk.chunkOrder,
        effectiveDate: chunk.effectiveDate,
      });
    }

    return {
      organizationId: orgId,
      patientCount: SYNTHETIC_PATIENTS.length,
      authRecordCount: authRecordIndex,
      payerCount: SYNTHETIC_PAYERS.length,
      planCount: SYNTHETIC_PAYERS.length * SYNTHETIC_PLANS_PER_PAYER.length,
      corpusChunkCount: SAMPLE_CORPUS_CHUNKS.length,
    };
  },
});

async function wipeOrgData(ctx: MutationCtx, orgId: Id<"organizations">) {
  const byOrgTables = [
    "patients",
    "payers",
    "plans",
    "members",
    "authRecords",
    "packetDrafts",
  ] as const;

  for (const t of byOrgTables) {
    const rows = await ctx.db
      .query(t)
      .withIndex("byOrg", (q) => q.eq("organizationId", orgId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  }

  // auditLog uses byOrgTs index
  const auditRows = await ctx.db
    .query("auditLog")
    .withIndex("byOrgTs", (q) => q.eq("organizationId", orgId))
    .collect();
  for (const row of auditRows) {
    await ctx.db.delete(row._id);
  }

  // organizationMemberships scanned per-org via byOrgUser
  const memberships = await ctx.db
    .query("organizationMemberships")
    .withIndex("byOrgUser", (q) => q.eq("organizationId", orgId))
    .collect();
  for (const row of memberships) {
    await ctx.db.delete(row._id);
  }

  // corpusChunks: organizationId is optional, no byOrg index — full scan filter
  const corpus = await ctx.db.query("corpusChunks").collect();
  for (const c of corpus) {
    if (c.organizationId === orgId) {
      await ctx.db.delete(c._id);
    }
  }
}
