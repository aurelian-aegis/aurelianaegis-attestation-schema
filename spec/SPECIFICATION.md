# AurelianAegis Attestation Envelope — Specification

**Document type:** Consolidated specification (normative references + informative annexes)  
**Schema language:** JSON Schema (draft-07), payload **`spec_id`** **`aurelianaegis.envelope.v1`** (stable across additive releases)  
**Status:** See [CHANGELOG.md](../CHANGELOG.md) for release mapping.

This document gathers in one place what implementations must do to interoperate. The **authoritative technical definitions** remain in the cited files; this specification does not redefine them.

---

## 1. Normative references

| ID | Document | Normative role |
|----|----------|----------------|
| N1 | [schema/attestation-envelope.json](../schema/attestation-envelope.json) | Structure and validation of JSON instances (`admissibility_token` \| `execution_receipt`). |
| N2 | [SIGNING.md](SIGNING.md) | Signing and verification protocol (RFC 8785 payload, algorithms, `signed_fields`, chain hash in §8). |
| N3 | [CHAIN-INTEGRITY.md](CHAIN-INTEGRITY.md) | Hash chain model, scope, deletion detection, verifier obligations. |

**External standards:** RFC 8785 (JCS), RFC 4648 Base64url, RFC 6901 JSON Pointer; signature algorithms as constrained in N1 and N2.

---

## 2. Conformance

### 2.1 Conformance classes

**C1 — Payload producer (signer)**  
An implementation that emits JSON that is intended to validate against N1 and be signed per N2. It MUST produce `artifact_type`, required fields for that artifact, and a `signature` block satisfying N1 and N2.

**C2 — Payload consumer (verifier)**  
An implementation that validates instances against N1, verifies signatures per N2, and when applicable verifies chain integrity per N3.

**C3 — Schema-only validator**  
An implementation that validates JSON against N1 only (no cryptography). Useful for ingestion pipelines; MUST NOT be described as “full conformance” without C2.

### 2.2 Conformance claims

A product MAY claim **“AurelianAegis Attestation conformant (signer)”** only if it implements C1 for the artifact types it emits. It MAY claim **“conformant (verifier)”** only if it implements C2 for the algorithms and artifact types it accepts.

### 2.3 Test suite

Repository scripts are the **interoperability evidence** for this project:

- `npm run validate` — current examples validate against N1.
- `npm run verify:test-vectors` — RFC 8785 + signature vectors.
- `npm run test:constraints` — positive and negative schema cases.

Implementations SHOULD reproduce these results when integrated into CI.

### 2.4 Profile conformance behavior

When `profile_id` is present, implementations operate in one of two verifier modes:

- **Fail mode (default for regulated deployments):** if `profile_id` is unsupported or cannot be resolved to a profile registry entry, the verifier MUST reject the envelope.
- **Partial mode (explicitly configured):** if `profile_id` is unsupported, the verifier MAY continue core-schema verification only, but MUST emit an explicit non-conformant profile result.

Conformance claims MUST include whether profile verification is supported and which profile IDs are supported (for example, `io.aurelianaegis.profile.baseline-governed`).

### 2.5 Schema identity reference (`spec_id` vs `schema_url`)

- `spec_id` is the stable compatibility era identifier and MUST be present in every payload.
- `schema_url` is optional and SHOULD be used when emitters/verifiers need explicit OTel-style schema/convention location hints for migration or registry tooling.
- Verifiers MUST NOT treat `schema_url` as a replacement for `spec_id`.

### 2.6 `profile_id` vs `policy.governance_profile_id`

- `profile_id` identifies a registry-managed profile bundle from `registry/profiles/*.yaml`.
- `policy.governance_profile_id` identifies the policy bundle or governance decision set used by the enforcing system at decision time.
- These values MAY be identical in simple deployments, but they are intentionally distinct: `profile_id` is registry-facing packaging metadata, while `policy.governance_profile_id` is operational policy evidence.

---

## 3. Threat model summary (informative)

This summary supports security review; it is **not** a substitute for organizational threat modeling.

| Threat | Mitigation in this specification |
|--------|-----------------------------------|
| Agent forges governance records | Signing is limited to enforcement-side `signer_type` values per N2; agent self-signing is out of scope and rejected. |
| Tampering with a single record | Signature over RFC 8785 canonical payload (N2); `signed_fields` allowlisting. |
| Log deletion or reordering | Optional `sequence_number` and `previous_event_hash` (N3, N2 §8). |
| Weak or wrong cryptography | Algorithms restricted to Ed25519, ECDSA-P256, ECDSA-P384 (N1, N2). |
| Ambiguous policy inputs | Optional `policy_inputs_ref` + `policy_inputs_hash` (N1). |
| Replay | Application-level: `event_id`, TTL fields on tokens, tenant policy (see [INTEGRATION.md](INTEGRATION.md)). |

**Residual risk:** Trust in the enforcement layer, key custody, and verifier configuration is assumed; compromise of signing keys or mis-configuration is out of band for the schema alone.

For a deeper failure-mode analysis, use your organization threat model and pair this specification with deployment-specific security review material. This repository intentionally keeps the normative publish surface self-contained.

---

## 4. Informative annexes

| Annex | Document | Purpose |
|-------|----------|---------|
| A | [INTEGRATION.md](INTEGRATION.md) | SIEM, GRC, observability, transport notes. |
| B | [VOCABULARY.md](VOCABULARY.md) | Controlled vocabularies and framework IDs. |
| C | [REGULATORY-FIELD-MAPPING.md](REGULATORY-FIELD-MAPPING.md) | Auditor-oriented mapping (not normative for schema validation). |
| D | [usage/](usage/) | Operational enforcement patterns. |

---

## 5. PDF or static site

This file is the **master specification** in Markdown. To produce a **PDF**: use any Markdown-to-PDF tool (e.g. Pandoc) with your org’s template. To publish a **site**: host `spec/` as a static site or GitHub Pages; keep **tagged releases** as the immutable reference for citations.

---

## 6. Publication and citation

See [PUBLICATION.md](PUBLICATION.md) (releases, Zenodo DOI) and [ZENODO.md](ZENODO.md) (Zenodo setup).
