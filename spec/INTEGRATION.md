# Attestation Envelope — Integration Guide

This guide explains how to consume and integrate the AurelianAegis Attestation Envelope schema (`admissibility_token` and `execution_receipt`, `spec_id` `aurelianaegis.envelope.v1`) into SIEM, GRC, and observability systems.

---

## 1. Schema Validation

### Using JSON Schema Validators

**Node.js (ajv):**

```javascript
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const schema = require("../schema/attestation-envelope.json");
const attestation = require("../examples/attestation-example.json");

const ajv = new Ajv();
addFormats(ajv);
const validate = ajv.compile(schema);
const valid = validate(attestation);

if (!valid) {
  console.error(validate.errors);
}
```

**Python (jsonschema):**

```python
import json
from jsonschema import validate, ValidationError

with open("schema/attestation-envelope.json") as f:
    schema = json.load(f)

with open("examples/attestation-example.json") as f:
    attestation = json.load(f)

try:
    validate(instance=attestation, schema=schema)
    print("Valid")
except ValidationError as e:
    print(e.message)
```

**CLI (ajv-cli):**

```bash
npm install -g ajv-cli
ajv validate -s schema/attestation-envelope.json -d examples/execution-receipt-example.json
```

---

## 2. Verification Requirements

When ingesting signed attestations, verifiers MUST:

- **Validate chain integrity** — When `sequence_number` is present, verify it is ≥ 1 and monotonically increasing per tenant+agent. When `previous_event_hash` is present, compute SHA-256 of the RFC 8785 canonical form of the complete previous envelope (including its `signature`) and compare (lowercase hex, prefixed `sha256:`). A gap or mismatch indicates deletion or reordering. See [CHAIN-INTEGRITY.md](CHAIN-INTEGRITY.md) for the normative protocol.
- **Validate signature** — Verify the `signature` block. **The full protocol is defined in [SIGNING.md](SIGNING.md)** — this is the normative specification for interoperability. Summary:
  1. **Reject invalid signers:** For **`execution_receipt`**, `signature.signer_type` MUST be `enforcement`, `control_plane`, or `detection` (shadow-AI). For **`admissibility_token`**, MUST be `enforcement` only. Reject agent-signed payloads.
  2. Resolve the public key via `signature.signer_id`, `actor.passport_registry_ref`, `actor.public_key_ref`, or `actor.passport_public_key_inline`.
  3. Build the signing payload: from the envelope (minus `signature`), extract each field in `signature.signed_fields`; build a JSON object with pointer strings as keys and values as values; serialize with RFC 8785.
  4. Verify `signature.value` (Base64url, RFC 4648 §5, without padding) against the canonical payload. Tampering invalidates the signature.
  5. Fail closed if key resolution yields no key, multiple non-equivalent keys, or a key that cannot be bound to `signature.signer_id` for the tenant.
- **Validate passport_hash** — Fetch the passport via `actor.passport_registry_ref`, `actor.public_key_ref`, or `actor.passport_public_key_inline` (for air-gapped verification), or by `actor.agent_id` from the authoritative store. Compute the SHA-256 hash of the passport version and compare to `actor.passport_hash`. Do not trust agent-supplied values alone.
- **Validate passport_key_fingerprint** — When present, compute the SHA-256 fingerprint of canonical public key bytes and compare to `actor.passport_key_fingerprint` (lowercase hex, 64 chars). Canonical bytes are: Ed25519 raw 32-byte key; ECDSA DER SubjectPublicKeyInfo. Reject mismatch to detect registry compromise or URI redirection.
- **passport_public_key_format** — When `passport_public_key_inline` is present, `passport_public_key_format` (raw/der/pem) MUST be present to decode the key correctly.
- **Validate io_refs integrity** — When `io_refs.input_ref` or `io_refs.output_ref` are present, verify `input_sha256` and `output_sha256` (lowercase hex, 64 chars) against the fetched content to detect substitution.
- **Replay protection** — When `valid_from` or `valid_until` are present, verifiers SHOULD reject if current time is outside the validity window. Enforce `event_id` uniqueness. See [SECURITY.md](../SECURITY.md) for key compromise and replay guidance.

**Transport note (canonicalization safety):** Signature verification MUST use the original signed semantic payload reconstructed via `signed_fields` and RFC 8785, not a transport-mutated representation. Do not rely on broker/client re-serialization (field reordering, float formatting changes, Unicode escaping/normalization, or language-specific JSON encoding differences), because that can change bytes before canonicalization inputs are rebuilt and lead to false verification outcomes.

---

## 3. SIEM Integration

### Kafka Ingestion

Attestations can be streamed to a Kafka topic (e.g. `aurelianaegis.attestations`). Each message is a JSON document conforming to the schema.

**Example consumer (Python):**

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    "aurelianaegis.attestations",
    bootstrap_servers=["localhost:9092"],
    value_deserializer=lambda m: json.loads(m.decode("utf-8"))
)

for msg in consumer:
    attestation = msg.value
    # Index by event_id, agent_id, capability.id, policy.decision, etc.
    # Use correlation_id for distributed tracing
```

### Splunk HEC

POST attestations to Splunk HTTP Event Collector:

```bash
curl -X POST "https://splunk.example.com:8088/services/collector/event" \
  -H "Authorization: Splunk <token>" \
  -H "Content-Type: application/json" \
  -d '{"event": <attestation_json>, "sourcetype": "aurelianaegis:attestation"}'
```

### Indexing Recommendations

| Field | Purpose |
|-------|---------|
| `spec_id` | Stable spec era (`aurelianaegis.envelope.v1`); query-time detection |
| `event_id` | Deduplication; primary key |
| `artifact_type` | `admissibility_token` vs `execution_receipt` routing |
| `admissibility_event_id` | Join receipt to pre-execution token (`event_id`) |
| `parent_event_id`, `root_event_id` | Multi-agent chain reconstruction; DAG queries |
| `sequence_number` | Chain ordering; gap detection per tenant+agent |
| `previous_event_hash` | Hash chain integrity; deletion detection |
| `timestamp` | Time-series queries |
| `actor.agent_id` | Agent-level filtering |
| `actor.external_id` | Cross-vendor identity correlation (DID/SPIFFE/URN) |
| `capability.id` | Capability-level filtering |
| `policy.decision` | Filter allow/deny/escalate |
| `outcome.blocking_reason` | Structured denial analysis; SLA and policy tuning |
| `context.correlation_id` | Trace correlation |

---

## 4. GRC / Compliance Integration

### EU AI Act Technical File

The attestation provides runtime evidence for:

- **Article 9 (Risk management):** `policy.risk_tier`, `policy.decision`, `policy.violation_flags`
- **Article 14 (Human oversight):** `evaluation.human_involved`, `evaluation.human_decision`
- **Article 17 (Record-keeping):** Full attestation as immutable record; `previous_event_hash` + `sequence_number` for tamper-evident audit logs

Map `regulatory.classifications` by framework (e.g. filter `framework: "eu_ai_act"`) to high-risk / limited-risk / minimal-risk via `category`. When `category=high_risk`, `annex_iii_use_case` is schema-required. Use `version` for amendment-aware queries.

### SOC 2 / ISO 42001

- **CC6.1 (Logical access):** `actor.agent_id`, `actor.passport_hash`, `actor.external_id` — agent identity across vendors
- **CC7.2 (System monitoring):** `outcome.status`, `outcome.blocking_reason`, `context.telemetry.latency_ms` — enforcement evidence
- **Audit trail:** `event_id`, `timestamp`, `policy.governance_profile_id`, `sequence_number`, `previous_event_hash` — tamper-evident chain

### FCA SYSC / Basel III / SR 11-7

- **Model risk management:** `policy.policy_inputs_ref` + `policy.policy_inputs_hash` — evidence of what facts drove each decision
- **Model inventory and monitoring:** `actor.agent_id`, `actor.agent_version`, `capability.id` — per-model, per-capability audit
- **Chain completeness (BCBS 239):** `sequence_number` + `previous_event_hash` — detect record gaps in regulatory submissions

### HIPAA

- **§164.312 Access controls:** `actor.agent_id`, `actor.passport_hash` — agent identity bound to action
- **§164.312(b) Audit controls:** Full attestation as PHI access record; `capability.contains_pii` for PHI-flagged events
- **§164.308(a)(1) Risk analysis:** `policy.risk_tier`, `policy.violation_flags`, `outcome.blocking_reason` — operational risk evidence

See [REGULATORY-FIELD-MAPPING.md](REGULATORY-FIELD-MAPPING.md) for complete auditor-facing field mapping tables.

---

## 5. Observability

### Distributed Tracing

Use `context.correlation_id` to correlate attestations with OpenTelemetry traces.

### Multi-Agent Chain of Custody

When Agent B is invoked by Agent A, Agent B's attestation MUST include:
- `parent_event_id` = Agent A's `event_id`
- `root_event_id` = the top-level orchestrator's `event_id` (or same as `parent_event_id` if A is the root)

This enables DAG reconstruction of agent-to-agent call chains for EU AI Act traceability and audit.

### Dashboards

- **Trust trends:** `policy.trust_scores.overall` over time
- **Decision breakdown:** `policy.decision` (allow/deny/escalate) by agent
- **Latency:** `context.telemetry.latency_ms` percentiles

---

## 6. Extensions

The schema supports optional `regulatory` and vendor-specific extension fields prefixed with `x-` (for example `x-vendor-risk-model`). This keeps core fields strict while preserving interoperability for custom metadata.

---

## 7. Versioning

The JSON Schema **`$id`** is stable: `https://aurelianaegis.io/schema/attestation-envelope.json`. The payload **`spec_id`** is **`aurelianaegis.envelope.v1`** until a breaking spec migration. Additive schema releases do not change `spec_id`; see [spec.json](../schema/spec.json).

---

## 8. Related Frameworks

The attestation envelope supports governance frameworks that require audit trails and traceability:

- **[AIGN Framework](https://www.aigl.blog/content/files/2025/06/The-AIGN-Framework-1.0.pdf)** — The AIGN Framework defines "From Audit Trail to Governance Trail" as a core governance requirement. Attestations provide the immutable, signed records that satisfy AIGN's audit trail criteria (model version logs, decision explanation storage, governance events). Use `regulatory.classifications` with `framework: "aign_framework"` when mapping to AIGN Trust & Capability Indicators.

---

*For schema details, see [schema/attestation-envelope.json](../schema/attestation-envelope.json). For the signing protocol, see [SIGNING.md](SIGNING.md).*
