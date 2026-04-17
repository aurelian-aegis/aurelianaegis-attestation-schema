# Implementation Guide

How teams implement the AurelianAegis Attestation Envelope schema in real deployments.

Schema baseline:
- `schema/attestation-envelope.json`
- Payload `spec_id`: `aurelianaegis.envelope.v1`
- Artifact types: `admissibility_token` and `execution_receipt`

Normative references:
- `spec/SIGNING.md`
- `spec/CHAIN-INTEGRITY.md`
- `spec/SPECIFICATION.md`
- `spec/INTEGRATION.md`

---

## Why this exists

Publishing the schema creates a shared, machine-verifiable contract for agent governance evidence. Instead of custom logs per platform, developers can emit and consume a stable envelope across policy engines, runtimes, SIEM, GRC, and observability systems.

---

## Consumption path 1: CI and release validation

Use this when teams need contract checks in pull requests and release gates.

```bash
npm install
npm run validate
npm run validate:current
npm run validate:release -- --release=v1.0.0
npm run check
```

What this gives:
- Early detection of schema drift
- Repeatable checks for examples and release fixtures
- Interoperability confidence before publish

---

## Consumption path 2: Runtime schema validation (fast path)

Use this when ingress pipelines, API gateways, or workers need structural validation only.

### Node.js example (Ajv)

```javascript
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const schema = require("../schema/attestation-envelope.json");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function assertEnvelope(doc) {
  if (!validate(doc)) {
    throw new Error(JSON.stringify(validate.errors, null, 2));
  }
}
```

### Python example (`jsonschema`)

```python
import json
from jsonschema import validate, ValidationError

with open("schema/attestation-envelope.json") as f:
    schema = json.load(f)

def assert_envelope(doc):
    try:
        validate(instance=doc, schema=schema)
    except ValidationError as err:
        raise RuntimeError(err.message)
```

Important:
- This is equivalent to conformance class C3 (schema-only).
- C3 is useful for ingestion, but not full verifier conformance.

---

## Consumption path 3: Full verifier (audit-grade path)

Use this when security, audit, or regulated workloads need cryptographic assurance.

Verifier responsibilities:
- Validate schema structure
- Verify `signature` using RFC 8785 canonical payload reconstruction via `signed_fields`
- Verify chain integrity (`sequence_number`, `previous_event_hash`) when present
- Verify passport bindings and optional `io_refs` integrity when present
- Enforce replay checks (`event_id` uniqueness, validity window checks)

Recommended validation commands:

```bash
npm run verify:test-vectors
npm run test:conformance
```

This path corresponds to verifier conformance class C2 in `spec/SPECIFICATION.md`.

---

## Consumption path 4: Producer integration in agent runtimes

Use this when building PEP/runtime integrations that emit attestations.

Flow:
1. Runtime requests or presents a valid `admissibility_token`
2. PEP evaluates policy and signs token (`signer_type: enforcement`)
3. Runtime executes only on allow
4. Runtime emits `execution_receipt` linked by `admissibility_event_id`
5. Optional chain fields (`sequence_number`, `previous_event_hash`) are added for tamper-evident logs

Minimal pseudocode:

```text
token = pep.issueAdmissibilityToken(intent, actor, capability, policy_context)
if token.policy.decision != "allow":
    block_execution()
    return

result = execute_tool_or_action()
receipt = emitExecutionReceipt({
    admissibility_event_id: token.event_id,
    outcome: result.outcome,
    io_refs: result.io_refs,
    context: result.context
})
```

---

## Consumption path 5: Streaming ingestion (Kafka or equivalent)

Use this when central data/security platforms ingest attestations as JSON events.

Example consumer shape:

```python
for msg in consumer:
    envelope = msg.value
    # route by envelope["artifact_type"]
    # index by envelope["event_id"], envelope["spec_id"], envelope["timestamp"]
```

Suggested indexed fields:
- `spec_id`
- `event_id`
- `artifact_type`
- `admissibility_event_id`
- `parent_event_id`
- `root_event_id`
- `actor.agent_id`
- `capability.id`
- `policy.decision`
- `outcome.status`
- `context.correlation_id`

---

## Consumption path 6: SIEM integration

Use this when SOC teams need searchable governance events and detections.

Pattern:
- Send each attestation as an event payload
- Apply source typing for parsing and dashboards
- Build saved searches for denial patterns, escalation volume, and policy drift

Example dimensions:
- Decision ratio (`allow` vs `deny` vs `escalate`)
- Top blocked capabilities
- Agents with repeated policy violations

---

## Consumption path 7: Observability and tracing

Use this when SRE and platform teams need governance + runtime correlation.

Pattern:
- Join `context.correlation_id` with OpenTelemetry traces
- Plot latency via `context.telemetry.latency_ms`
- Track cost via `context.cost` for operational efficiency

---

## Consumption path 8: GRC and regulatory evidence

Use this when compliance teams need control-aligned runtime evidence.

Pattern:
- Map envelope fields to internal controls and regulatory obligations
- Export immutable records for audits
- Use chain fields to detect deletion or reordering in audit trails

See `docs/REGULATORY-FIELD-MAPPING.md` for detailed mapping.

---

## Consumption path 9: Multi-agent chain-of-custody

Use this when orchestrator/sub-agent graphs require traceable accountability.

Required linkage:
- Child receipt sets `parent_event_id` to parent event
- Child receipt sets `root_event_id` to top-level orchestrator event

This enables DAG reconstruction for investigations and governance reviews.

---

## Consumption path 10: Profiles, registry, and extensions

Use this when organizations need domain-specific controls while preserving core interoperability.

Pattern:
- Keep core envelope stable
- Add controlled extension fields (`x-*`)
- Use registry profiles/extensions for environment-specific governance overlays

Useful scripts:
- `npm run resolve:profile`
- `npm run lint:registry`
- `npm run test:extensions-digest`

---

## Quick selection guide

- Need fast ingestion checks only: Path 2
- Need full cryptographic assurance: Path 3
- Need runtime enforcement integration: Path 4
- Need SOC dashboards and detections: Paths 5 and 6
- Need compliance evidence packages: Path 8
- Need multi-agent provenance: Path 9

