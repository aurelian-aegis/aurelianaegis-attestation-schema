# Okta and AurelianAegis in Agentic Governance

## Purpose

This document compares:

1. What Okta does for AI agent security and governance.
2. What AurelianAegis (AA) does via the Attestation Envelope specification.
3. What the AA spec enables that identity-centric approaches do not fully cover.
4. Whether Okta can satisfy three governance proof checks:
   - Prove pre-authorization
   - Prove runtime outcome
   - Prove tamper evidence

This is a complementarity analysis, not a displacement analysis. AA is not positioned as a competitor to Okta.

---

## Executive Position

Okta and AA operate on different but adjacent layers:

- Okta is strongest as an **identity and authorization control plane** for humans, apps, and non-human identities.
- AA is strongest as a **cryptographic governance evidence plane** that proves what was authorized and what executed, in a portable and verifiable format.

Short form:

- Okta answers: "Who can do what now?"
- AA answers: "Prove exactly what was authorized, what ran, and why the record is trustworthy."

---

## What Okta Does (Relevant to Agentic Governance)

Okta's AI-agent posture combines identity standards and platform features:

- OAuth 2.0 and OpenID Connect (OIDC) foundations.
- Cross App Access (CAA/XAA) model for policy-governed app-to-app and AI-to-app access.
- Identity Assertion Authorization Grant flow (ID-JAG token exchange pattern in CAA context).
- Auth0 Async Authorization using CIBA (human-in-the-loop, decoupled approvals).
- Rich Authorization Requests (RAR) for structured approval context.
- Fine-Grained Authorization for RAG via Auth0 FGA/OpenFGA (ReBAC).
- Centralized governance workflow support through identity controls, approvals, and posture tooling.

### What this means in practice

Okta can materially improve:

- Least-privilege access decisions.
- Centralized admin control for inter-app connectivity.
- Consent and approval experience for sensitive operations.
- Runtime authorization quality, especially in enterprise app ecosystems.

---

## What the AA Spec Is

AA defines a vendor-neutral attestation envelope schema for action-level governance evidence:

- Artifact pair:
  - `admissibility_token` (pre-execution authorization evidence)
  - `execution_receipt` (post-execution runtime outcome evidence)
- Stable spec identifier:
  - `spec_id`: `aurelianaegis.envelope.v1`
- Canonical schema location:
  - `schema/attestation-envelope.json`
- Cryptographic evidence model:
  - RFC 8785 canonical serialization before signing
  - Signed fields
  - Optional append-only chain integrity:
    - `sequence_number`
    - `previous_event_hash`
- Governance-relevant semantics:
  - Actor identity and external identity references
  - Capability metadata
  - Policy decision and decision inputs references/hashes
  - Structured outcome and blocking reasons
  - Regulatory and risk metadata
  - Telemetry and cost fields for governance analytics

### Why this matters

AA is designed to produce **portable, verifiable, auditor-consumable evidence artifacts**, not only enforcement outcomes inside one identity platform.

---

## What AA Spec Enables for Agentic Governance

Implementing against AA can enable:

- Deterministic pre-execution proof (`admissibility_token`) for each governed action.
- Deterministic post-execution proof (`execution_receipt`) with explicit linkage to pre-authorization event.
- Signature-verifiable payloads independent of a single control-plane vendor.
- Tamper-evident chain-of-custody (when chain fields are enforced).
- Multi-agent lineage reconstruction (parent/root event relationships).
- SIEM/GRC portability with a common JSON artifact model.
- Policy-to-outcome and cost/risk analysis in one normalized event envelope.
- Audit-ready records that can survive system and vendor boundaries.

---

## Can Okta Satisfy the Three Proof Checks?

### 1) Prove pre-authorization

**Target check:** Record an `admissibility_token` before execution with policy decision, validity window, and enforcement signer requirements.

**Okta status:** **Partial**

- Okta can enforce pre-authorization and approval with OAuth/OIDC flows, CAA controls, CIBA+RAR approvals, and FGA checks.
- But public Okta approach does not currently present an open, portable, schema-native artifact equivalent to AA `admissibility_token` with AA-style conformance semantics and signing contract.

**Gap versus AA:**

- Missing a standard cross-platform attestation object for pre-authorization proof portability.

### 2) Prove runtime outcome

**Target check:** Record an `execution_receipt` with final status, structured blocking reason, and explicit link to originating admissibility event.

**Okta status:** **Partial to weak**

- Okta can provide logs, policy events, and access telemetry in its ecosystem.
- Application/runtime systems can correlate outcomes with identity events.
- However, there is no broadly published Okta-native equivalent of AA `execution_receipt` as a canonical, signed governance artifact linked by required schema semantics to pre-authorization evidence.

**Gap versus AA:**

- Missing a normalized, cryptographically anchored runtime receipt standard with mandatory pre/post linkage semantics.

### 3) Prove tamper evidence

**Target check:** Verify signatures over RFC 8785 canonical payloads and optionally enforce append-only chain integrity (`sequence_number`, `previous_event_hash`).

**Okta status:** **Not equivalent out of the box**

- Okta provides strong identity security controls and logging, but not a publicly defined governance envelope model requiring RFC 8785 canonicalization + explicit append-only chain fields at artifact level.
- Equivalent guarantees would require custom architecture outside standard identity flow constructs.

**Gap versus AA:**

- Missing schema-defined canonical-signature and hash-chain attestation semantics as first-class governance objects.

---

## Is Okta's Spec Approach "Enough" for Agentic Governance?

If "agentic governance" is defined as:

- authorization controls,
- identity lifecycle management,
- centralized policy and approval workflows,

then Okta is materially strong.

If "agentic governance" is defined as:

- cryptographically provable pre/post action evidence,
- tamper-evident chain-of-custody,
- portable audit artifacts across heterogeneous systems,

then Okta alone is not sufficient in the same way an AA-style attestation implementation is.

---

## Complementary Architecture (Recommended)

### Layer responsibilities

- **Okta layer (control):**
  - Identity, authentication, authorization, approvals, and app connection governance.
- **AA layer (evidence):**
  - Action-level admissibility and execution attestations, signed evidence, tamper indication, and interoperability.

### Operational pattern

1. Agent request enters governance point.
2. Authorization is decided with identity policies and contextual controls (Okta-centric).
3. Enforcement layer emits AA `admissibility_token` before execution.
4. Runtime executes (or blocks/escalates).
5. Enforcement layer emits AA `execution_receipt`.
6. Records are signed, optionally chain-linked, then exported to SIEM/GRC/observability.

This pattern preserves Okta's strengths while closing proof and portability gaps.

---

## Spec Comparison Matrix (Condensed)

| Dimension | Okta approach | AA spec approach |
|---|---|---|
| Core primitive | Identity tokens, grants, policies, approvals | Signed governance envelopes (`admissibility_token`, `execution_receipt`) |
| Primary question answered | Who can access what now? | What was authorized and what executed, provably? |
| Pre-exec control | Strong | Strong |
| Post-exec normalized evidence | Limited/implementation-dependent | First-class and standardized |
| Tamper-evident chain semantics | Not primary/open artifact model | First-class optional chain fields |
| Cross-vendor portability of evidence | Limited | Core design objective |
| Regulatory evidence packaging | Governance-supportive via logs/workflows | Schema-native evidence model for audit pipelines |

---

## Final Conclusion

Okta can strongly enable the **control** side of agentic governance, but it does not fully provide the **evidence** side represented by AA's attestation schema.

For organizations that must prove all three checks:

1. pre-authorization proof,
2. runtime outcome proof,
3. tamper evidence proof,

the strongest model is:

- Keep Okta for identity and authorization control.
- Implement AA-compatible attestation emission for cryptographic, portable governance proof.

