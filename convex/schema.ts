import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";
import {
  authStateValidator,
  corpusSourceTypeValidator,
  cptCodeValidator,
  orgRoleValidator,
  payerTypeValidator,
  planTypeValidator,
  vendorSystemValidator,
} from "./priorAuthTypes";

export default defineSchema({
    users: defineTable({
      name: v.string(),
      // this the Clerk ID, stored in the subject JWT field
      externalId: v.string(),
      // Primary email from Clerk
      email: v.optional(v.string()),
    })
      .index("byExternalId", ["externalId"])
      .index("byEmail", ["email"]),

    paymentAttempts: defineTable(paymentAttemptSchemaValidator)
      .index("byPaymentId", ["payment_id"])
      .index("byUserId", ["userId"])
      .index("byPayerUserId", ["payer.user_id"]),

    // Security monitoring table
    // userId is optional to allow logging violations from unauthenticated requests
    securityEvents: defineTable({
      userId: v.optional(v.id("users")),
      eventType: v.union(
        v.literal("origin_mismatch"),
        v.literal("rate_limit_exceeded"),
        v.literal("invalid_api_key"),
        v.literal("fingerprint_change"),
        v.literal("suspicious_activity"),
        v.literal("jwt_validation_failed"),
        v.literal("unauthorized_access"),
        v.literal("input_validation_failed"),
        v.literal("replay_detected"),
        v.literal("not_found_enumeration"),
        v.literal("jwt_algorithm_attack"),
        v.literal("tenant_isolation_attack"),
        v.literal("jwt_replay_attack"),
        v.literal("xss_attempt"),
        v.literal("fingerprint_manipulation"),
        v.literal("http_origin_blocked"),
        v.literal("prompt_injection_attempt"),
        v.literal("ai_response_validation_failed"),
        v.literal("csrf_validation_failed")
      ),
      severity: v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      ),
      metadata: v.object({
        origin: v.optional(v.string()),
        ipAddress: v.optional(v.string()),
        fingerprint: v.optional(v.string()),
        endpoint: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        endUserEmail: v.optional(v.string()),
        endUserName: v.optional(v.string()),
        endUserId: v.optional(v.string()),
        actionType: v.optional(v.string()),
        requestPayload: v.optional(v.string()),
      }),
      timestamp: v.number(),
      isRead: v.boolean(),
    })
      .index("byUser", ["userId", "timestamp"])
      .index("bySeverity", ["userId", "severity", "timestamp"])
      .index("byUnread", ["userId", "isRead", "timestamp"]),

    // ===== Prior-Auth Workbench tables =====
    // Multi-tenant from day one — every PHI table carries organizationId.
    // Hackathon phase = synthetic data only. Pilot phase = real PHI behind BAA stack.

    organizations: defineTable({
      clerkOrgId: v.optional(v.string()),
      name: v.string(),
      pilotPracticeName: v.optional(v.string()),
      isHackathonDemo: v.boolean(),
      createdAt: v.number(),
    })
      .index("byClerkOrgId", ["clerkOrgId"])
      .index("byHackathonDemo", ["isHackathonDemo"]),

    organizationMemberships: defineTable({
      organizationId: v.id("organizations"),
      userId: v.id("users"),
      role: orgRoleValidator,
      createdAt: v.number(),
    })
      .index("byOrgUser", ["organizationId", "userId"])
      .index("byUser", ["userId"]),

    patients: defineTable({
      organizationId: v.id("organizations"),
      vendorSystem: vendorSystemValidator,
      vendorPatientId: v.string(),
      mrn: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      dob: v.string(),
      sex: v.union(v.literal("F"), v.literal("M"), v.literal("X")),
      createdAt: v.number(),
    })
      .index("byOrgVendor", ["organizationId", "vendorSystem", "vendorPatientId"])
      .index("byOrgMrn", ["organizationId", "mrn"])
      .index("byOrg", ["organizationId"]),

    payers: defineTable({
      organizationId: v.id("organizations"),
      name: v.string(),
      type: payerTypeValidator,
      portalUrl: v.optional(v.string()),
      faxNumber: v.optional(v.string()),
    })
      .index("byOrg", ["organizationId"])
      .index("byOrgName", ["organizationId", "name"]),

    plans: defineTable({
      organizationId: v.id("organizations"),
      payerId: v.id("payers"),
      name: v.string(),
      planType: planTypeValidator,
    })
      .index("byOrg", ["organizationId"])
      .index("byPayer", ["payerId"]),

    members: defineTable({
      organizationId: v.id("organizations"),
      patientId: v.id("patients"),
      planId: v.id("plans"),
      memberId: v.string(),
      groupId: v.optional(v.string()),
      effectiveDate: v.string(),
      terminationDate: v.optional(v.string()),
    })
      .index("byOrg", ["organizationId"])
      .index("byPatient", ["patientId"])
      .index("byPlan", ["planId"]),

    authRecords: defineTable({
      organizationId: v.id("organizations"),
      patientId: v.id("patients"),
      payerId: v.id("payers"),
      planId: v.optional(v.id("plans")),
      cptCode: cptCodeValidator,
      state: authStateValidator,
      stateChangedAt: v.number(),
      stateChangedBy: v.optional(v.id("users")),
      reasonText: v.optional(v.string()),
      packetDraftId: v.optional(v.id("packetDrafts")),
      submittedAt: v.optional(v.number()),
      decisionAt: v.optional(v.number()),
      expiresAt: v.optional(v.number()),
      externalAuthNumber: v.optional(v.string()),
      orderingPhysicianName: v.optional(v.string()),
      studyDate: v.optional(v.string()),
    })
      .index("byOrg", ["organizationId"])
      .index("byOrgState", ["organizationId", "state"])
      .index("byPatientCpt", ["patientId", "cptCode"])
      .index("byPayer", ["payerId"]),

    packetDrafts: defineTable({
      organizationId: v.id("organizations"),
      authRecordId: v.id("authRecords"),
      draftMarkdown: v.string(),
      citationChunkIds: v.array(v.id("corpusChunks")),
      generatedBy: v.union(v.literal("mock_llm"), v.literal("anthropic"), v.literal("bedrock"), v.literal("vertex")),
      modelVersion: v.optional(v.string()),
      promptTokens: v.optional(v.number()),
      completionTokens: v.optional(v.number()),
      coordinatorEdits: v.optional(v.string()),
      reviewedAt: v.optional(v.number()),
      reviewedBy: v.optional(v.id("users")),
      submittedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("byOrg", ["organizationId"])
      .index("byAuthRecord", ["authRecordId"]),

    corpusChunks: defineTable({
      organizationId: v.optional(v.id("organizations")),
      payerId: v.optional(v.id("payers")),
      sourceType: corpusSourceTypeValidator,
      title: v.string(),
      sourceUrl: v.optional(v.string()),
      chunkText: v.string(),
      chunkOrder: v.number(),
      effectiveDate: v.optional(v.string()),
      embedding: v.optional(v.array(v.float64())),
    })
      .index("byPayerSource", ["payerId", "sourceType"])
      .index("bySource", ["sourceType"])
      .searchIndex("byText", {
        searchField: "chunkText",
        filterFields: ["organizationId", "payerId", "sourceType"],
      }),

    auditLog: defineTable({
      organizationId: v.id("organizations"),
      actorUserId: v.optional(v.id("users")),
      action: v.string(),
      resourceType: v.string(),
      resourceId: v.string(),
      beforeState: v.optional(v.string()),
      afterState: v.optional(v.string()),
      ts: v.number(),
    })
      .index("byOrgTs", ["organizationId", "ts"])
      .index("byResource", ["resourceType", "resourceId"]),
  });