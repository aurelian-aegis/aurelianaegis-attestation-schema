# AurelianAegis Attestation Envelope Schema

**An open vocabulary and reference format for AI agent governance attestation.**

[License](LICENSE)
[Spec](schema/attestation-envelope.json)

---

## The Problem

Enterprises deploying AI agents face a governance evidence gap: they can demonstrate what their governance program *says*, but not what their agents *actually did* — at the action level, in a structured, verifiable format.

Regulations (EU AI Act, US EO 14110) and audit frameworks (SOX, SOC 2) require evidence that agent actions were authorized under the correct policy version and that records are consistent and tamper-evident. No open, interoperable format exists to structure that evidence today.

## The Solution

The **Attestation Envelope** splits **pre-execution** and **post-execution** evidence: an `admissibility_token` (PEP decision, short-lived) and an `execution_receipt` (what ran, I/O, outcome, chain). Payloads **must** include stable `spec_id` `aurelianaegis.envelope.v1` (unchanged across additive schema releases). The JSON Schema file is `schema/attestation-envelope.json` with stable `$id` `https://aurelianaegis.io/schema/attestation-envelope.json` — see [schema/spec.json](schema/spec.json).

Every governed action uses signed records that include:

- **Agent identity** — which agent, which passport version, optional cross-vendor external ID (DID/SPIFFE SVID/IANA URN)
- **Capability** — what action was performed (e.g. `finance.approve_payment`)
- **Policy** — governance profile applied, decision (allow/deny/escalate), trust scores, policy inputs evidence
- **Outcome** — final status (success, failure, pending_approval, blocked, timeout), enforcement component, structured blocking reason
- **Context.telemetry** — latency and observability metrics (SRE-facing)
- **Context.cost** — token and cost metrics for CFO/COO analytics (business outcome governance)
- **Context.business_outcome_ref** — URI to join with external KPIs (policy-outcome misalignment analysis)
- **Chain integrity** — `sequence_number` + `previous_event_hash` form an append-only hash chain (SHA-256 of RFC 8785 canonical form) for structured audit logs with gap and deletion detection. Note: concurrent actions per agent must be serialised; tail deletion requires WORM storage — see [CHAIN-INTEGRITY.md](spec/CHAIN-INTEGRITY.md) for full scope and known constraints

Parseable by any SIEM, observability, or GRC tool. Cryptographically integrity-verified. Extensible via `x-*` vendor fields for safe interoperability.

*Think of it as OpenTelemetry for agent governance — a shared vocabulary, not a mandatory runtime.*

**Scope:** this schema is designed for deployments where the operator controls the execution environment and can run a trusted enforcement layer (SDK, sidecar, or gateway) that intercepts capability calls. It is not designed for open-ended consumer AI agents or deployments without a controlled runtime boundary.

**Status:** v1.0.0 is a stable reference implementation and open vocabulary contribution. It is not yet widely adopted; the project is in active community building and standards engagement. Known v1 constraints (chain serialisation for high-throughput agents, multi-agent subtree commitment) are documented in [spec/CHAIN-INTEGRITY.md](spec/CHAIN-INTEGRITY.md) and targeted for v2.

**Repository posture:** this is a GitHub-published schema/specification repository with validation tooling and interoperability fixtures. It is not currently positioned as a separately published npm package.

---

## Domain-Agnostic Design

The schema is **domain-agnostic** and supports all horizontal functional domains (Finance, HR, Healthcare, Commerce, IT, CRM, etc.) without domain-specific structure. There is no domain-specific structure in the core schema — only generic extension points.

### Extension Points


| Extension Point         | Schema Type                                  | Domain-Specific?                 | Examples by Domain                                                                                                                                    |
| ----------------------- | -------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capability.id`         | Generic string                               | Domain extensions define IDs     | `finance.approve_payment`, `hr.screen_resume`, `healthcare.recommend_treatment`, `commerce.process_refund`                                            |
| `capability.domain`     | Generic string                               | Domain extensions define domains | `finance.payments`, `hr.recruitment`, `healthcare.clinical`, `it.deployment`                                                                          |
| `capability.parameters` | Generic object                               | Domain extensions define keys    | Finance: `amount_usd`, `currency`; HR: `candidate_id`, `role_id`; Healthcare: `phi_category`, `diagnosis_code`; Commerce: `order_id`, `refund_amount` |
| `x-domain-risk`         | Generic pattern `domain.subdomain.risk_type` | Domain extensions publish labels | `finance.lending.default_risk`, `hr.recruitment.bias_risk`, `healthcare.phi_risk`, `commerce.refund.fraud_risk`                                       |
| `x-risk-category`       | Domain-agnostic enum                         | Shared across all domains        | `operational`, `cost`, `quality`, `policy`, `scope`, `regulatory`                                                                                     |
| `regulatory`            | Framework-agnostic                           | Any jurisdiction/sector          | EU AI Act, SOX, HIPAA, FCA, etc.                                                                                                                      |


### Principle

Domain-specific vocabularies, governance profiles, and compliance reports live in **domain extensions**, not in the core schema. The core schema defines only the envelope structure; domain extensions (Finance, HR, Healthcare, Commerce, IT, CRM) implement their own capabilities, parameters, and risk labels. See [VOCABULARY.md](spec/VOCABULARY.md) for multi-domain examples.

---

## Trust Model

Attestations are produced by the **enforcement layer** (SDK, Sidecar, or Gateway), not by the agent. The trust boundary encloses server-side enforcement: policy evaluation, attestation signing, and ingestion. The agent runtime is outside this boundary and is not trusted; the enforcement layer intercepts capability calls, evaluates policy, and emits signed attestations to the ingestion API and SIEM.

```
Agent Runtime / Model          (untrusted — outside boundary)
        │  capability call
        ▼
┌─────────────────────────────────────────────────────┐  Trust boundary
│  Enforcement Layer (SDK / Sidecar / Gateway)        │  (server-side)
│  • policy evaluation   • attestation signing        │
└───────────────────────┬─────────────────────────────┘
                        │  signed Attestation Envelope
                        ▼
              Ingestion API / Router
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
        SIEM / GRC          Observability
```

For `admissibility_token`, `signature.signer_type` MUST be `enforcement` (PEP). For `execution_receipt`, `enforcement` or `control_plane` (or `detection` for shadow-AI events). Agent-signed payloads MUST be rejected. See [spec/SIGNING.md](spec/SIGNING.md).

---

## The Schema


| Attribute     | Value                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| **spec_id**   | `aurelianaegis.envelope.v1` (stable; additive evolution does not change this) |
| **Format**    | JSON Schema (draft-07)                                                        |
| **Structure** | Root `oneOf`: `AdmissibilityToken` \| `ExecutionReceipt`                       |
| **Location**  | `schema/attestation-envelope.json`                                            |
| **Schema ID** | `https://aurelianaegis.io/schema/attestation-envelope.json`                        |


### Required fields (summary)

- **Both:** `spec_id`, `artifact_type` (`admissibility_token` \| `execution_receipt`), `event_id`, `timestamp`, `tenant_id`, `actor`, `capability`, `context`, `policy`, `signature`.
- **Admissibility token only:** `valid_from`, `valid_until`, `nonce`, `asset`, `authority`, `risk`, `data_boundaries`, `liability`; `policy.policy_set_hash` and `policy.execution_intent_hash`.
- **Execution receipt only:** `outcome`, `admissibility_event_id` (links to the token’s `event_id`).

Payload MUST be serialized per RFC 8785 before signing.

See the schema file for the full required set per artifact.

### Optional Fields

- `parent_event_id`, `root_event_id` — Multi-agent chain of custody (orchestrator → sub-agent DAG reconstruction)
- `sequence_number` — Monotonic integer per tenant+agent for chain ordering; MUST be included in `signed_fields` when present
- `previous_event_hash` — SHA-256 of RFC 8785 canonical form of the complete previous envelope (including its signature); enables deletion detection. MUST be included in `signed_fields` when present. See [spec/CHAIN-INTEGRITY.md](spec/CHAIN-INTEGRITY.md)
- `actor.external_id` — Cross-vendor agent identity (DID, SPIFFE SVID, or IANA URN) for multi-cloud portability
- `evaluation` — Human-in-the-loop or LLM judge details
- `io_refs` — References to input/output data (stored externally; use `input_sha256`/`output_sha256` for integrity)
- `policy.policy_inputs_ref` + `policy.policy_inputs_hash` — URI and SHA-256 fingerprint of the facts evaluated by the policy engine (paired; proves what inputs drove the decision)
- `outcome.blocking_reason` — Structured reason for deny/escalate decisions (11 values: policy_violation, trust_score_below_threshold, human_escalation_required, dual_control_required, geo_restriction, time_window_restriction, rate_limit_exceeded, capability_not_authorized, pii_exposure_blocked, policy_eval_timeout, missing_approval)
- `regulatory` — Regulation-agnostic classifications and flags (any framework; `annex_iii_use_case` required by schema when `framework=eu_ai_act` and `category=high_risk`)
- `context.trace_id` — OpenTelemetry trace ID for distributed tracing interoperability
- `context.cost` — CostInfo (input_tokens, output_tokens, model_cost_usd) for cost drift detection
- `context.business_outcome_ref` — URI to join attestation with external business KPIs
- `x-risk-category` — Domain-agnostic risk category (operational, cost, quality, policy, scope, regulatory)
- `x-domain-risk` — Domain-specific risk label (pattern: `domain.subdomain.risk_type`; e.g. finance.lending.default_risk, hr.recruitment.bias_risk)
- `x-*` — Vendor-specific extension fields (supported at top-level and nested objects)

---

## Usage

### Validate an Attestation

```bash
# Using npm (recommended — includes ajv-formats for date-time validation)
npm install && npm run validate

# Validate current examples explicitly
npm run validate:current

# Validate the frozen release example set
npm run validate:release

# Validate all current + release examples
npm run validate:all

# Verify canonicalization + signature test vectors
npm run verify:test-vectors

# Or validate specific files
node scripts/validate.js examples/attestation-example.json examples/admissibility-token-example.json
```

**Note:** The schema uses `format: "date-time"` for timestamps. Use `ajv` with `ajv-formats` for full validation. See [spec/INTEGRATION.md](spec/INTEGRATION.md) for programmatic validation examples.

### Examples

- [examples/admissibility-token-example.json](examples/admissibility-token-example.json) — Pre-execution PEP token
- [examples/execution-receipt-example.json](examples/execution-receipt-example.json) — Pairing receipt with `admissibility_event_id`
- [examples/attestation-example.json](examples/attestation-example.json) — Rich execution receipt (finance, regulatory)
- [examples/attestation-multi-agent-example.json](examples/attestation-multi-agent-example.json) — Sub-agent receipt with DAG + chain fields
- [examples/attestation-shadow-ai-example.json](examples/attestation-shadow-ai-example.json) — Shadow AI / `detection` receipt
**Note:** The `examples/` files are illustrative and may use placeholder signatures or simplified policy IDs for readability. Use `test-vectors/` for verifiable interoperability fixtures. Interoperability vectors under `test-vectors/` use TEST-ONLY keys. Production MUST use real enforcement keys.

---

## Integration

- **SIEM**: Ingest attestations via Kafka, HTTP, or file export. Parse as structured JSON.
- **Business outcome governance**: Use `context.cost`, `context.business_outcome_ref`, `x-risk-category`, `x-domain-risk`, and `policy.trust_scores` for cost drift, quality drift, and policy-outcome misalignment analysis (CFO, COO, CPO use cases).
- **GRC**: Feed attestations into compliance reporting (EU AI Act technical file, SOC 2, ISO 42001) as structured evidence. Auditors accept a range of evidence formats; this schema provides a consistent, machine-parseable vocabulary for that evidence. See [spec/REGULATORY-FIELD-MAPPING.md](spec/REGULATORY-FIELD-MAPPING.md) for field-level mapping.
- **Observability**: Use `event_id`, `context.correlation_id`, `context.trace_id` for distributed tracing (W3C Trace Context / OpenTelemetry).

See [spec/INTEGRATION.md](spec/INTEGRATION.md) for detailed integration guidance.

**Operational enforcement:** [Universal enforcement (agentic platforms)](spec/usage/universal-enforcement-agentic-platforms.md) — PEP, LangGraph, CrewAI, Semantic Kernel, Strands/AgentCore, liability-first pattern. · [No-code / low-code](spec/usage/no-code-low-code-enforcement.md) — n8n, gateways, shadow discovery.

---

## Related Work

- **OpenPort Protocol** ([arXiv:2602.20196](https://arxiv.org/html/2602.20196v1)) — Security governance for AI agent tool access; conceptually aligned on server-side enforcement and audit events.
- **AIGN Framework** ([PDF](https://www.aigl.blog/content/files/2025/06/The-AIGN-Framework-1.0.pdf)) — Operational AI governance framework; attestations support its audit trail and governance trail requirements.

---

## Repository Structure

```
.
├── README.md                 # This file
├── LICENSE                   # Apache 2.0
├── CITATION.cff              # Citation metadata; add Zenodo `doi:` after first archived release
├── .zenodo.json              # Zenodo metadata for DOI
├── CHANGELOG.md              # Version history
├── CONTRIBUTING.md           # How to contribute
├── SECURITY.md               # Key compromise, responsible disclosure
├── package.json              # Validation and interoperability scripts
├── spec/
│   ├── SPECIFICATION.md      # Consolidated specification (conformance, normative refs, threat summary)
│   ├── PUBLICATION.md        # Release checklist, Zenodo DOI, immutable URLs
│   ├── SIGNING.md            # Normative signing protocol (RFC 8785) + chain hash protocol
│   ├── CHAIN-INTEGRITY.md    # Normative chain integrity spec (hash chain, deletion detection)
│   ├── INTEGRATION.md        # SIEM, GRC, observability integration
│   ├── VOCABULARY.md         # Controlled vocabularies (19 frameworks, blocking reasons, violation flags)
│   ├── REGULATORY-FIELD-MAPPING.md  # Auditor-facing mapping for compliance review
│   ├── ZENODO.md             # Zenodo DOI setup and citation
│   ├── VERSIONING.md         # Core versioning and compatibility policy
│   ├── GOVERNANCE.md         # Change ownership, RACI, and review gates
│   ├── SUPPORT.md            # Support window and end-of-support policy
│   └── usage/                # Operational enforcement patterns and usage guidance
├── schema/
│   ├── attestation-envelope.json       # Canonical JSON Schema (stable $id)
│   ├── attestation-envelope-diagram.md
│   ├── spec.json                       # spec_id + schema_id pointer for tooling
│   └── releases/
│       └── v1.0.0/                     # Frozen release snapshot
├── scripts/
│   ├── validate.js           # Schema validation
│   ├── verify-test-vectors.js # RFC 8785 + signature vector verification
│   ├── test-schema-constraints.js
│   ├── test-conformance-matrix.js
│   ├── test-extensions-digest.js
│   ├── check-compatibility.js
│   ├── lint-registry.js
│   ├── resolve-profile.js
│   ├── write-test-vectors.js
│   └── generate-vector-expected.js
├── examples/
│   ├── README.md
│   ├── admissibility-token-example.json
│   ├── execution-receipt-example.json
│   ├── attestation-example.json
│   ├── attestation-multi-agent-example.json
│   ├── attestation-shadow-ai-example.json
│   └── releases/
│       └── v1.0.0/
├── test-vectors/
│   ├── README.md
│   ├── minimal-ed25519.json  # Canonicalization + Ed25519 verification vector
│   ├── minimal-ecdsa-p256.json # Canonicalization + ECDSA-P256 verification vector
│   ├── full-envelope-ed25519.json # Full 9-field signed envelope fixture
│   ├── minimal-ecdsa-p384.json # Canonicalization + ECDSA-P384 verification vector
│   ├── conformance/
│   └── keys/
│       ├── ed25519-test-private-key.pem # TEST-ONLY Ed25519
│       ├── ed25519-test-public-key.pem
│       ├── ecdsa-p256-test-private.pem / ecdsa-p256-test-public.pem
│       └── ecdsa-p384-test-private.pem / ecdsa-p384-test-public.pem
├── registry/
│   ├── README.md
│   ├── schemas/
│   ├── extensions/           # Extension registry descriptors
│   ├── profiles/             # Profile registry descriptors
│   └── releases/
│       └── v1.0.0/
└── .github/
    ├── ISSUE_TEMPLATE/       # Bug, schema change, vocabulary templates
    └── workflows/
        └── validate.yml      # CI: validate current schema, vectors, and registry
```

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

## How to Cite

**Specification (single entry point):** [spec/SPECIFICATION.md](spec/SPECIFICATION.md) (normative references, conformance, threat summary, informative annexes). Export to PDF from Markdown if your process requires a portable document.

**Immutable schema bytes** (use after your Git release tag exists): `https://raw.githubusercontent.com/aurelian-aegis/aurelianaegis-attestation-schema/<tag>/schema/attestation-envelope.json`. The JSON Schema `$id` is `https://aurelianaegis.io/schema/attestation-envelope.json` (no version segment); dereferencing requires a host that serves this file, or use the raw Git URL.

**Zenodo DOI:** [10.5281/zenodo.19636844](https://doi.org/10.5281/zenodo.19636844)

**BibTeX:**

```bibtex
@software{aurelianaegis_attestation_schema_2026,
  author       = {AurelianAegis},
  title        = {AurelianAegis Attestation Envelope Schema},
  year         = 2026,
  publisher    = {Zenodo},
  version      = {1.0.0},
  doi          = {10.5281/zenodo.19636844},
  url          = {https://doi.org/10.5281/zenodo.19636844}
}
```

---

## Links

- [Specification](spec/SPECIFICATION.md) — consolidated spec (conformance, normative pointers, threat summary)
- [Publication checklist](spec/PUBLICATION.md) — release tag, Zenodo, DOI, `$id` host
- [Zenodo DOI Setup](spec/ZENODO.md) — citability and citation
- [Changelog](CHANGELOG.md) — version history
- [Integration Guide](spec/INTEGRATION.md)
- [Signing Protocol](spec/SIGNING.md) — normative specification for interoperability and chain hash protocol
- [Chain Integrity](spec/CHAIN-INTEGRITY.md) — normative hash chain specification for tamper-evident audit logs
- [Versioning Policy](spec/VERSIONING.md) — MAJOR/MINOR/PATCH policy and verifier compatibility expectations
- [Governance Model](spec/GOVERNANCE.md) — core vs extension decision process, RACI, and review gates
- [Vocabulary](spec/VOCABULARY.md) — controlled vocabularies (19 frameworks, blocking reasons, violation flags)
- [Regulatory Field Mapping](spec/REGULATORY-FIELD-MAPPING.md) — EU AI Act, SOX, SOC 2, FCA SYSC, Basel III, ISO 42001, HIPAA field mapping for auditors
- [Support Policy](spec/SUPPORT.md) — major-version support window and end-of-support behavior
- [Security](SECURITY.md) — key compromise, responsible disclosure
- [Contributing](CONTRIBUTING.md) — how to contribute
- [Example Attestation](examples/attestation-example.json)
- [Multi-Agent Example](examples/attestation-multi-agent-example.json) — sub-agent with chain fields (`sequence_number`, `previous_event_hash`)
- [Interoperability Test Vector](test-vectors/minimal-ed25519.json)
- [Interoperability Test Vector (ECDSA-P256)](test-vectors/minimal-ecdsa-p256.json)
- [Interoperability Test Vector (ECDSA-P384)](test-vectors/minimal-ecdsa-p384.json)
- [Full End-to-End Fixture (Ed25519)](test-vectors/full-envelope-ed25519.json)
- [JSON Schema](schema/attestation-envelope.json) · [spec.json](schema/spec.json)

