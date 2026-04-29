import { Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

// Workbench-specific auth helpers.
// Hackathon phase: any authenticated user → demo-org access.
// Pilot phase (Clerk Orgs wired up): replace getDemoOrgIdOrThrow with a JWT-claim
// extraction (`identity.organizationId` from Clerk Orgs JWT), and the membership
// check below becomes a real organizationMemberships lookup.

async function getDemoOrgId(ctx: QueryCtx): Promise<Id<"organizations"> | null> {
  const org = await ctx.db
    .query("organizations")
    .withIndex("byHackathonDemo", (q) => q.eq("isHackathonDemo", true))
    .first();
  return org?._id ?? null;
}

/**
 * Require an authenticated workbench user and return their accessible org.
 * Throws if unauthenticated or if the demo org has not been seeded.
 *
 * Hackathon scope: every authenticated Clerk user can access the single demo
 * org. Pilot phase will replace this with a real organization-membership check
 * driven by the Clerk Orgs JWT claim.
 */
export async function requireWorkbenchOrg(ctx: QueryCtx | MutationCtx): Promise<Id<"organizations">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  const orgId = await getDemoOrgId(ctx);
  if (!orgId) {
    throw new Error(
      "Workbench is not initialized. Run `npx convex run seed:seedHackathonDemo`.",
    );
  }
  return orgId;
}

/**
 * Optional variant — used by queries that want to render an empty state for
 * unauthenticated users instead of throwing (e.g., the queue page during the
 * brief Clerk-loading window).
 */
export async function workbenchOrgIfAuthed(ctx: QueryCtx): Promise<Id<"organizations"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return getDemoOrgId(ctx);
}

/**
 * Verify that a record's organizationId matches the caller's accessible org.
 * Throws on mismatch — used after fetching a row by raw Convex ID.
 */
export function assertOwnedByOrg(
  record: { organizationId: Id<"organizations"> } | null,
  allowedOrgId: Id<"organizations">,
): asserts record is { organizationId: Id<"organizations"> } {
  if (!record) throw new Error("Not found");
  if (record.organizationId !== allowedOrgId) {
    throw new Error("Forbidden");
  }
}

/**
 * Hackathon dev-only gate: refuse to run if the deployment looks like
 * production. Pilot phase replaces this with a Clerk role check (admin only)
 * AND a separate "danger-zone" confirmation flow.
 */
export function assertNotProductionDeployment(): void {
  const url = process.env.CONVEX_SITE_URL ?? "";
  const cloudUrl = process.env.CONVEX_CLOUD_URL ?? "";
  if (url.includes("prod") || cloudUrl.includes("prod")) {
    throw new Error("Seed mutation is disabled on production deployments");
  }
}
