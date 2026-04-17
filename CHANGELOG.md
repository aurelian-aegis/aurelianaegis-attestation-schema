# Changelog

All notable changes to the AurelianAegis Attestation Envelope schema are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-04-15

### Breaking

- `schema_version` replaced by required `spec_id` `aurelianaegis.envelope.v1` from pre-1.0 drafts.

### Additive

- **Stable `$id`:** `https://aurelianaegis.io/schema/attestation-envelope.json` (no version segment in the URI). Canonical file: `schema/attestation-envelope.json`.
- **`spec_id` replaces `schema_version`:** required string **`aurelianaegis.envelope.v1`**, unchanged across additive schema updates. **Signing:** JSON pointers in `signed_fields` use **`/spec_id`** (not `/schema_version`).
- **`schema/spec.json`** documents `spec_id`, `schema_id`, and evolution policy (replaces `schema-version.json`).
- **Removed** draft **v0.1** schema, examples, and diagrams from this package (first release; no prior-line mirror).
- **Scripts:** `write-test-vectors.js` (renamed from `write-test-vectors-v02.js`); examples and `test-vectors/*` updated for `spec_id`.

### Clarification

- Release and citation guidance aligned to stable schema `$id`, immutable tags, and publication workflow.

### Security

- Signing and verification pointers standardized around `/spec_id` to avoid mixed-version verification ambiguity.

### Migration from pre-1.0 drafts

Documents that used `schema_version` **`0.2`** should use **`spec_id`** **`aurelianaegis.envelope.v1`** and include **`/spec_id`** in the signed payload. Single-envelope **v0.1** JSON is out of scope for this repository line.

---

## [0.2.0] — 2026-04-14

### Summary

**Historical note:** Release **1.0.0** renamed the canonical schema file and introduced **`spec_id`**; the content below describes the pre-1.0 **v0.2** draft. **v0.1** was removed in **1.0.0** (no longer in-repo).

**v0.2** was the pre-1.0 schema line. The v0.1 JSON Schema file and example archive were retained through the pre-1.0 period and then removed in **1.0.0**.

### Changes introduced in v0.2 (explicit)

These are the **new or materially different** behaviors and fields compared to v0.1:

1. **Two artifacts instead of one envelope**
   - **`admissibility_token`** — Pre-execution PEP/OAP-oriented record: TTL (`valid_from`, `valid_until`), `nonce`, governance objects (`asset`, `authority`, `risk`, `data_boundaries`, `liability`), `policy` with required **`policy_set_hash`** and **`execution_intent_hash`**. No `outcome`, `io_refs`, or execution telemetry.
   - **`execution_receipt`** — Post-execution record: required **`admissibility_event_id`** (URN matching the token’s `event_id`), optional **`admissibility_token_hash`**, `outcome`, `io_refs`, `evaluation`, `detection`, chain fields (`sequence_number`, `previous_event_hash`, `parent_event_id`, `root_event_id`).

2. **Discriminator**
   - Required top-level **`artifact_type`**: `admissibility_token` | `execution_receipt`.

3. **Policy**
   - **`policy.reason_codes`** (array).
   - **`policy.decision`** extended with **`supervised_override`**.
   - On the **token**, **`policy_set_hash`** and **`execution_intent_hash`** are required (policy bundle + intent binding).

4. **Governance and liability**
   - New objects: **`asset`**, **`authority`**, **`risk`** (including optional **`max_risk_score`**, **`dynamic_assessment_ref`**), **`data_boundaries`**, **`liability`** (with **`liability_owner`**).
   - **`x-legal`** structured as **`LegalExtensions`** with optional **`registered_agent`** (service-of-process fields).

5. **Capability & risk**
   - **`capability.is_state_mutating`** (boolean).

6. **Actor**
   - Optional **`model_lifecycle_attestation_ref`** / **`model_lifecycle_attestation_hash`**.

7. **Detection (receipt path)**
   - Shadow/remediation: **`telemetry_shadow`** detection method; **`remediation_*`**, **`converted_to_governed_asset_id`**, **`enforcement_tier_after_registration`**.

8. **Secrets & dependencies (optional)**
   - **`secrets_hygiene`**, **`dependency_attestations`**.

9. **Signing**
   - **`SignatureAdmissibility`**: **`signer_type`** must be **`enforcement`** only; **`signed_fields`** does not include `/outcome`.
   - **`SignatureReceipt`**: must include **`/admissibility_event_id`** and **`/outcome`** among core pointers; **`signer_type`** may be **`detection`** for shadow-AI receipts.

10. **Documentation & diagram**
    - **`schema/attestation-envelope-v0.2-diagram.md`** — structure and flow for v0.2.

### v0.1 transition notes (historical)

- **v0.1** artifacts were **removed** in **1.0.0** (see above).

### Deliverables (v0.2.0 draft)

Everything below is part of the **pre-1.0** **0.2.0** draft / **`schema_version` `0.2`** line.

**Schema and tooling**

- `schema/attestation-envelope-v0.2.json` — `oneOf` `admissibility_token` | `execution_receipt` (superseded by `attestation-envelope.json` in **1.0.0**).
- `schema/attestation-envelope-v0.2-diagram.md` — structure diagram (superseded by `attestation-envelope-diagram.md`).
- `scripts/validate.js` — validates examples (skips `examples/v0.1/` in v0.2.0 era).
- `scripts/verify-test-vectors.js`, `scripts/test-schema-constraints.js`, the predecessor to `scripts/write-test-vectors.js`, and `scripts/generate-vector-expected.js`.
- `npm run check` — `validate` + `verify:test-vectors` + `test:constraints`.

**Examples and vectors**

- `examples/admissibility-token-example.json`, `examples/execution-receipt-example.json`; scenario examples as `execution_receipt` with `admissibility_event_id`; `examples/v0.1/` historical archive.
- `test-vectors/*` — v0.2 fixtures (Ed25519/ECDSA minimal and full, chain, deny, multi-agent, shadow AI); TEST-ONLY keys under `test-vectors/keys/`.

**Normative and informative docs**

- [SIGNING.md](spec/SIGNING.md), [CHAIN-INTEGRITY.md](spec/CHAIN-INTEGRITY.md), [INTEGRATION.md](spec/INTEGRATION.md), [VOCABULARY.md](spec/VOCABULARY.md), [REGULATORY-FIELD-MAPPING.md](spec/REGULATORY-FIELD-MAPPING.md), [SPECIFICATION.md](spec/SPECIFICATION.md), [PUBLICATION.md](spec/PUBLICATION.md).

**CI**

- `.github/workflows/validate.yml` — `validate`, `verify:test-vectors`, `test:constraints`.

---

## [0.1.0](https://github.com/aurelian-aegis/aurelianaegis-attestation-schema/releases/tag/v0.1.0) - 2026-02-26

### Added

- **Schema (attestation-envelope-v0.1.json)**
  - Core envelope structure: `schema_version`, `event_id`, `timestamp`, `tenant_id`, `actor`, `capability`, `context`, `policy`, `outcome`, `signature`
  - Multi-agent chain of custody: `parent_event_id`, `root_event_id`
  - Regulation-agnostic `regulatory` block with `classifications` and `flags` arrays
  - `signer_type` enum (`enforcement`, `control_plane`) — agent self-attestation rejected
  - `signing_canonical_method`: RFC 8785 (JSON Canonicalization Scheme)
  - Replay protection: optional `valid_from`, `valid_until`
  - Algorithm enum: `Ed25519`, `ECDSA-P256`, `ECDSA-P384`
  - URN patterns for `event_id`, `agent_id`; patterns for `tenant_id`, `schema_version`
  - `input_sha256` / `output_sha256` (lowercase hex) with optional `hash_algorithm` for io_refs integrity
  - Conditional requirements: `human_decision_timestamp` when `human_decision` present; `llm_judge_model` when `llm_judge_used=true`
  - `format: "date-time"` for `timestamp`, `valid_from`, `valid_until`, `human_decision_timestamp` — use ajv-formats for validation
  - `passport_key_fingerprint` — SHA-256 fingerprint of public key (lowercase hex, 64 chars) for verifier key pinning
  - `passport_public_key_format` — enum `["raw","der","pem"]` for `passport_public_key_inline` encoding; required when inline key present
- **Validation**
  - `package.json` with `npm run validate` — uses ajv + ajv-formats for full format validation
  - `scripts/validate.js` — validates examples or specified files
- **Documentation**
  - [SIGNING.md](spec/SIGNING.md) — Normative signing and verification protocol
  - [INTEGRATION.md](spec/INTEGRATION.md) — SIEM, GRC, observability integration
  - [SECURITY.md](SECURITY.md) — Key compromise, responsible disclosure, key rotation
  - [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution process
  - [VOCABULARY.md](spec/VOCABULARY.md) — Controlled vocabularies
  - [ZENODO.md](spec/ZENODO.md) — Zenodo DOI setup and citation
- **Citability**
  - `.zenodo.json` — Zenodo metadata for automatic DOI on GitHub release
  - `CITATION.cff` — Citation File Format for GitHub and academic citation
- **Examples**
  - Single-agent attestation (finance payment approval)
  - Multi-agent attestation with `parent_event_id` / `root_event_id`

### Known Limitations

- Controlled vocabulary is initial; will expand with community contributions.

---