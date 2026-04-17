# AurelianAegis Attestation Envelope — Schema Diagram

**Canonical schema:** [attestation-envelope.json](./attestation-envelope.json) (`$id`: `https://aurelianaegis.io/schema/attestation-envelope.json`)

The envelope splits **pre-execution** governance (`**admissibility_token`**) from post-execution evidence (`**execution_receipt`**). The root schema is a `**oneOf**` over those two definitions. Payloads carry stable `**spec_id**` `aurelianaegis.envelope.v1` (unchanged across additive releases). Shared sub-schemas (e.g. `Actor`, `Capability`, `Policy`) live under `definitions` in the JSON Schema file.

---

## Flow Overview (PEP → execution → receipt)

```mermaid
flowchart LR
    subgraph pre["Pre-execution (PEP)"]
        T[admissibility_token]
    end
    subgraph run["Agent / runtime"]
        E[Execution]
    end
    subgraph post["Post-execution"]
        R[execution_receipt]
    end
    T -->|"authorize"| E
    E --> R
    T -.->|"event_id == admissibility_event_id"| R
```



- `**admissibility_token**`: Signed by PEP (`signature.signer_type` = `enforcement` only). Carries **no** `outcome`, **no** `io_refs` — only claims needed before side effects (`valid_from` / `valid_until` / `nonce`, `asset`, `authority`, `risk`, `data_boundaries`, `liability`, `policy` with `policy_set_hash` + `execution_intent_hash`).
- `**execution_receipt`**: Records what happened after execution; **must** include `admissibility_event_id` referencing the token’s `event_id`. May include chain fields, `outcome`, `io_refs`, `evaluation`, `detection`, `regulatory`.

---

## Class Diagram — Admissibility Token (pre-execution)

```mermaid
classDiagram
    direction TB

    class AdmissibilityToken {
        +string spec_id* "aurelianaegis.envelope.v1"
        +string artifact_type* "admissibility_token"
        +string event_id*
        +string timestamp*
        +string tenant_id*
        +string valid_from*
        +string valid_until*
        +string nonce*
        +Actor actor*
        +Asset asset*
        +Authority authority*
        +Risk risk*
        +Capability capability*
        +Context context*
        +PolicyAdmissibility policy*
        +DataBoundaries data_boundaries*
        +Liability liability*
        +SecretsHygiene secrets_hygiene
        +DependencyAttestation[] dependency_attestations
        +Regulatory regulatory
        +LegalExtensions x-legal
        +SignatureAdmissibility signature*
    }

    note for AdmissibilityToken "Policy MUST include policy_set_hash + execution_intent_hash\nSignature: signer_type enforcement only"

    class Asset {
        +string id*
        +string type*
        +string jurisdiction
        +string system_id
    }

    class Authority {
        +string basis*
        +string policy_version
        +string consent_ref
        +string contract_ref
    }

    class Risk {
        +string[] data_classes
        +string sensitivity
        +string external_exposure
        +string irreversibility
        +string blast_radius_estimate
        +boolean novelty_flag
        +number max_risk_score
        +string dynamic_assessment_ref
    }

    class DataBoundaries {
        +string[] data_sources_permitted
        +string[] data_sinks_prohibited
        +string data_residency
        +string boundary_enforcement
    }

    class Liability {
        +LiabilityOwner liability_owner*
    }

    AdmissibilityToken --> Asset
    AdmissibilityToken --> Authority
    AdmissibilityToken --> Risk
    AdmissibilityToken --> DataBoundaries
    AdmissibilityToken --> Liability
```



---

## Class Diagram — Execution Receipt (post-execution)

```mermaid
classDiagram
    direction TB

    class ExecutionReceipt {
        +string spec_id* "aurelianaegis.envelope.v1"
        +string artifact_type* "execution_receipt"
        +string event_id*
        +string timestamp*
        +string tenant_id*
        +string admissibility_event_id*
        +string admissibility_token_hash
        +string parent_event_id
        +string root_event_id
        +string previous_event_hash
        +integer sequence_number
        +Actor actor*
        +Asset asset
        +Authority authority
        +Risk risk
        +Capability capability*
        +Context context*
        +Policy policy*
        +DataBoundaries data_boundaries
        +Liability liability
        +Evaluation evaluation
        +IoRefs io_refs
        +Outcome outcome*
        +Detection detection
        +Regulatory regulatory
        +LegalExtensions x-legal
        +SignatureReceipt signature*
    }

    note for ExecutionReceipt "admissibility_event_id links to token event_id\nChain / DAG fields optional; must be in signed_fields when present"

    class Outcome {
        +string status*
        +string enforcement_component*
        +string blocking_reason
    }

    ExecutionReceipt --> Outcome
```



---

## Signature profiles


| Artifact              | Definition               | `signer_type`                                  | Must include in payload (minimum)                                                                                                                                                                                                 |
| --------------------- | ------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admissibility_token` | `SignatureAdmissibility` | `enforcement` only                             | `/spec_id`, `/artifact_type`, `/event_id`, `/timestamp`, `/tenant_id`, `/valid_from`, `/valid_until`, `/nonce`, `/actor`, `/asset`, `/authority`, `/risk`, `/capability`, `/context`, `/policy`, `/data_boundaries`, `/liability` |
| `execution_receipt`   | `SignatureReceipt`       | `enforcement`, `control_plane`, or `detection` | Includes `/outcome`, `/admissibility_event_id`. See [SIGNING.md](../spec/SIGNING.md) §4                                                                                                                                           |


---

## Evolution

Additive changes extend the JSON Schema without changing `spec_id`. Breaking changes would introduce a new `spec_id` (e.g. `aurelianaegis.envelope.v2`) and a migration; see [spec.json](./spec.json) and [CHANGELOG.md](../CHANGELOG.md).