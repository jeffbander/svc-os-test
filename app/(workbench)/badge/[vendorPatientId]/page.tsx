"use client";

import { useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { CPT_DESCRIPTIONS, CptCode } from "@/convex/priorAuthTypes";
import { STATE_LABEL, STATE_PILL_TONE } from "@/lib/auth-state-display";

const SUPPORTED_VENDORS = ["heartflow", "cleerly"] as const;
type VendorSystem = (typeof SUPPORTED_VENDORS)[number];

function isSupportedVendor(v: string | null): v is VendorSystem {
  return v !== null && (SUPPORTED_VENDORS as readonly string[]).includes(v);
}

function ageFromDob(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

export default function BadgePage() {
  const params = useParams<{ vendorPatientId: string }>();
  const searchParams = useSearchParams();
  const vendorParam = searchParams.get("vendor");
  const vendor: VendorSystem = isSupportedVendor(vendorParam) ? vendorParam : "heartflow";

  const badge = useQuery(api.priorAuth.getBadgeForVendorPatient, {
    vendorSystem: vendor,
    vendorPatientId: decodeURIComponent(params.vendorPatientId),
  });

  if (badge === undefined) {
    return (
      <BadgeShell>
        <div className="text-sm text-[color:var(--wb-text-tertiary)]">loading…</div>
      </BadgeShell>
    );
  }

  if (badge === null) {
    return (
      <BadgeShell>
        <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--wb-text-tertiary)]">
          Unknown patient
        </p>
        <h1 className="wb-display mt-3 text-2xl">Not in worklist</h1>
        <p className="mt-3 text-sm text-[color:var(--wb-text-secondary)]">
          This patient hasn&apos;t been added to the prior-auth tracker yet.
        </p>
        <p className="mt-1 text-xs wb-mono text-[color:var(--wb-text-tertiary)]">
          {vendor}/{params.vendorPatientId}
        </p>
      </BadgeShell>
    );
  }

  const { patient, authRecords } = badge;
  const cptOrder: CptCode[] = ["75577", "75580"];
  const recordsByCpt = new Map(authRecords.map((r) => [r.record.cptCode, r] as const));

  return (
    <BadgeShell>
      <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--wb-text-tertiary)]">
        Prior authorization
      </p>
      <h1 className="wb-display mt-2 text-3xl leading-tight">
        {patient.lastName}, {patient.firstName}
      </h1>
      <p className="mt-1 text-sm text-[color:var(--wb-text-secondary)] tabular-nums">
        {ageFromDob(patient.dob)} · {patient.sex} · MRN <span className="wb-mono text-[13px]">{patient.mrn}</span>
      </p>

      <hr className="wb-hairline my-8" />

      <div className="space-y-10">
        {cptOrder.map((cpt) => {
          const entry = recordsByCpt.get(cpt);
          if (!entry) {
            return (
              <section key={cpt}>
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--wb-text-tertiary)]">
                  CPT <span className="wb-mono">{cpt}</span> · {CPT_DESCRIPTIONS[cpt]}
                </p>
                <p className="wb-display mt-3 text-5xl leading-[1.05] text-[color:var(--wb-text-tertiary)]">
                  not on order
                </p>
              </section>
            );
          }
          const tone = STATE_PILL_TONE[entry.record.state];
          return (
            <section key={cpt}>
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--wb-text-tertiary)]">
                CPT <span className="wb-mono">{cpt}</span> · {CPT_DESCRIPTIONS[cpt]}
              </p>
              <p
                className="wb-display wb-state-changed mt-3 text-5xl leading-[1.05]"
                data-tone={tone}
                data-state={entry.record.state}
                style={
                  tone === "approved"
                    ? { color: "var(--wb-approved-text)" }
                    : tone === "denied"
                      ? { color: "var(--wb-denied-text)" }
                      : tone === "pending" || tone === "pending-italic"
                        ? { color: "var(--wb-pending-text)" }
                        : undefined
                }
              >
                {STATE_LABEL[entry.record.state]}
              </p>
              <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
                <dt className="text-[color:var(--wb-text-tertiary)]">Payer</dt>
                <dd>{entry.payerName}</dd>
                {entry.record.externalAuthNumber && (
                  <>
                    <dt className="text-[color:var(--wb-text-tertiary)]">Auth #</dt>
                    <dd className="wb-mono text-[13px]">{entry.record.externalAuthNumber}</dd>
                  </>
                )}
                {entry.record.expiresAt && (
                  <>
                    <dt className="text-[color:var(--wb-text-tertiary)]">Valid until</dt>
                    <dd className="tabular-nums">
                      {new Date(entry.record.expiresAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </dd>
                  </>
                )}
                {entry.record.studyDate && (
                  <>
                    <dt className="text-[color:var(--wb-text-tertiary)]">Study date</dt>
                    <dd className="tabular-nums">{entry.record.studyDate}</dd>
                  </>
                )}
                {entry.record.orderingPhysicianName && (
                  <>
                    <dt className="text-[color:var(--wb-text-tertiary)]">Ordered by</dt>
                    <dd>{entry.record.orderingPhysicianName}</dd>
                  </>
                )}
              </dl>
              {entry.record.reasonText && (
                <p className="mt-4 border-l-2 border-[color:var(--wb-rule)] pl-4 text-sm italic text-[color:var(--wb-text-secondary)]">
                  {entry.record.reasonText}
                </p>
              )}
            </section>
          );
        })}
      </div>

      <hr className="wb-hairline my-8" />

      <p className="text-xs text-[color:var(--wb-text-tertiary)]">
        Read-only · synthetic demo data · no PHI
      </p>
    </BadgeShell>
  );
}

function BadgeShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-[480px] px-6 py-12">
      <div className="wb-card">{children}</div>
    </main>
  );
}
