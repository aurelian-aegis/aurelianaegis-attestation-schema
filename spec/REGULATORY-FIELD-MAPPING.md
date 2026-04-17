# Regulatory Field Mapping

**Purpose:** Auditor-facing mapping of attestation schema fields to regulatory requirements.  
**Schema:** [attestation-envelope.json](../schema/attestation-envelope.json) (fields below apply to **`execution_receipt`**; **`admissibility_token`** carries pre-execution policy and boundary claims)  
**Last Updated:** April 2026

---

## 1. EU AI Act

| Article / Annex | Requirement | Schema Field(s) | Notes |
|-----------------|-------------|-----------------|-------|
| **Art. 9** | Risk management (identification, evaluation, mitigation) | `policy.risk_tier`, `policy.decision`, `policy.violation_flags` | Risk tier: low, medium, high, critical |
| **Art. 13** | Transparency (information to users) | `actor.agent_id`, `capability.id`, `evaluation.human_involved` | Agent identity and capability disclosed |
| **Art. 14** | Human oversight measures | `policy.oversight_mode`, `evaluation.human_involved`, `evaluation.human_decision`, `evaluation.human_decision_timestamp` | Oversight modes: autonomous, supervised, human_in_loop, dual_control |
| **Art. 17** | Record-keeping (logs of AI operation) | Full attestation envelope | Signed, immutable attestation |
| **Art. 29** | High-risk: automatic logging | `event_id`, `timestamp`, `outcome`, `policy` | Per-action logging |
| **Annex III** | High-risk use case classification | `regulatory.classifications[].annex_iii_use_case` | When category is high_risk (e.g. credit_scoring, recruitment) |
| **Annex IV** | Technical documentation | `actor.passport_hash`, `policy.governance_profile_id` | Links to profile; full docs external |

---

## 2. SOX / IT General Controls (ITGC)

| Control | Requirement | Schema Field(s) | Notes |
|---------|-------------|-----------------|-------|
| **Change management** | Evidence of authorized changes | `policy.governance_profile_id`, `outcome.enforcement_component` | Version in enforcement_component |
| **Access controls** | Who/what accessed what | `actor.agent_id`, `actor.passport_hash`, `context.user` | Agent and initiator identity |
| **Segregation of duties** | Human approval for sensitive actions | `evaluation.human_involved`, `evaluation.human_decision`, `evaluation.human_decision_timestamp` | SOX-compliant timestamp |
| **Audit trail** | Immutable, tamper-evident | Signed attestation, `event_id`, `timestamp` | Ed25519/ECDSA signatures |
| **Financial materiality** | Amount thresholds | `capability.parameters.amount_usd` | SHOULD include when applicable (VOCABULARY §9) |

---

## 3. SOC 2

| Criterion | Requirement | Schema Field(s) |
|-----------|-------------|-----------------|
| **CC6.1** (Logical access) | Agent identity, initiator identity | `actor.agent_id`, `actor.passport_hash`, `context.user` |
| **CC7.2** (System monitoring) | Enforcement evidence, audit chain | `outcome.status`, `context.telemetry.latency_ms`, `event_id`, `timestamp`, `policy.governance_profile_id` |

---

## 4. Capability → Risk Tier Mapping

For auditors, map capability IDs to EU AI Act risk tier:

| Capability Pattern | Example | Typical Risk Tier |
|--------------------|---------|--------------------|
| `finance.*.approve_*` | finance.payments.approve_payment | high |
| `finance.*.execute_*` | finance.trading.execute_trade | high |
| `hr.recruitment.*` | hr.recruitment.screen_candidate | high |
| `data.read.*` | data.read.query | low |
| `customer.*` | customer.support.resolve | limited |

**Note:** Risk tier is set per governance profile; attestation records the applied `policy.risk_tier` and `policy.governance_profile_id`.

---

## 5. FCA SYSC (UK)

| Rule / Expectation | Requirement | Schema Field(s) | Notes |
|-------------------|-------------|-----------------|-------|
| **SYSC 7.1** | Systems and controls — model governance | `policy.governance_profile_id`, `actor.passport_hash` | Version-bound governance profile |
| **SYSC 7.1.7** | Record-keeping for algorithmic systems | Full attestation envelope | Signed, immutable per-decision record |
| **Algorithmic oversight** | Human review of high-risk algorithmic decisions | `evaluation.human_involved`, `evaluation.human_decision`, `evaluation.human_role` | Role-based, not name-based (privacy-preserving) |
| **Model risk** | Validation and ongoing monitoring of AI models | `policy.trust_scores.overall`, `policy.trust_score_model`, `policy.trust_score_version` | Versioned trust model enables drift detection |

---

## 6. Basel III / SR 11-7 (US / Global Model Risk Management)

| Control | Requirement | Schema Field(s) | Notes |
|---------|-------------|-----------------|-------|
| **SR 11-7 §1** | Model identification and inventory | `actor.agent_id`, `actor.passport_hash`, `policy.governance_profile_id` | Each model version uniquely identified |
| **SR 11-7 §2** | Model validation — conceptual soundness | `policy.trust_score_model`, `policy.trust_score_version` | Trust score methodology externally citable |
| **SR 11-7 §3** | Ongoing monitoring — performance tracking | `policy.trust_scores.overall`, `context.telemetry.latency_ms`, `outcome.status` | Enables drift detection dashboards |
| **SR 11-7 §4** | Model risk controls — governance | `policy.oversight_mode`, `policy.risk_tier`, `evaluation.human_involved` | Oversight mode captures control level |
| **BCBS 239** | Risk data aggregation — accuracy | `event_id`, `timestamp`, `actor.agent_id`, `outcome.status` | Per-decision, signed records enable aggregation |
| **BCBS 239 completeness** | Risk data completeness and traceability | `previous_event_hash`, `sequence_number` | Chain integrity enables completeness verification |
| **Model documentation** | Change management evidence | `actor.passport_hash`, `policy.governance_profile_id` | Hash-bound to exact governance profile version |

---

## 7. ISO/IEC 42001:2023 — AI Management System

| Clause | Requirement | Schema Field(s) | Notes |
|--------|-------------|-----------------|-------|
| **Clause 6.1** | Risk assessment and treatment | `policy.risk_tier`, `policy.decision`, `policy.violation_flags` | Risk tier + decision + violation evidence |
| **Clause 8.2** | AI system impact assessment | `regulatory.classifications`, `x-risk-category` | Multi-framework classification |
| **Clause 8.4** | AI system lifecycle — supplier obligations | `actor.agent_id`, `actor.runtime.type`, `actor.agent_version` | Runtime + version provenance |
| **Clause 9.1** | Monitoring, measurement, analysis | `policy.trust_scores.overall`, `context.telemetry.latency_ms` | Quantitative monitoring fields |
| **Clause 9.2** | Internal audit | Full attestation envelope | Signed, immutable audit record |
| **Clause 10.1** | Nonconformity and corrective action | `outcome.status`, `outcome.blocking_reason`, `policy.violation_flags` | Structured evidence of control failures |
| **Annex A (A.6.2)** | Data governance | `capability.contains_pii`, `capability.redaction_policy`, `io_refs.input_sha256` | Data handling evidence |

---

## 8. HIPAA (US Healthcare)

| Safeguard | Requirement | Schema Field(s) | Notes |
|-----------|-------------|-----------------|-------|
| **§164.312(a)** | Access controls — unique user/entity ID | `actor.agent_id`, `context.user.id` | Agent and initiating user identified |
| **§164.312(b)** | Audit controls — hardware/software activity records | Full attestation envelope, `event_id`, `timestamp` | Per-action signed record |
| **§164.312(c)** | Integrity controls — data not improperly altered | `io_refs.input_sha256`, `io_refs.output_sha256`, `signature.value` | Hash-verified I/O + envelope signature |
| **§164.312(d)** | Authentication — person or entity authentication | `actor.passport_hash`, `actor.passport_key_fingerprint`, `signature.signer_type` | Key-bound agent authentication |
| **§164.308(a)(1)** | Security management — risk analysis | `policy.risk_tier`, `x-risk-category` | Risk classification per action |
| **PHI disclosure** | Minimum necessary disclosure | `capability.contains_pii`, `capability.redaction_policy` | PII signal + redaction policy |
| **Workforce controls** | Supervision of AI acting on PHI | `evaluation.human_involved`, `evaluation.human_role`, `policy.oversight_mode` | Human oversight evidence |

---

## 9. Sample Audit Queries

**"Show me all high-risk agent actions in Q1 with human oversight evidence"**
- Filter: `policy.risk_tier = "high"` AND `evaluation.human_involved = true`
- Required fields: `event_id`, `timestamp`, `actor.agent_id`, `capability.id`, `policy.decision`, `evaluation.human_decision`, `evaluation.human_decision_timestamp`

**"Prove no records were deleted from the loan approval audit trail"**
- Verify `sequence_number` is gapless per `tenant_id` + `actor.agent_id`
- Verify `previous_event_hash` of record N+1 matches SHA-256 of RFC 8785 canonical form of record N
- Required fields: `event_id`, `sequence_number`, `previous_event_hash`, `signature.value`

**"Identify all EU AI Act high-risk actions missing Annex III classification"**
- Filter: `regulatory.classifications[].framework = "eu_ai_act"` AND `category = "high_risk"` AND `annex_iii_use_case` IS NULL
- Note: Schema v0.1+ enforces this at validation time — records missing `annex_iii_use_case` fail validation

**"FCA SYSC model risk — show all decisions where trust score was below threshold"**
- Filter: `policy.trust_scores.overall < 0.7` (threshold set per governance profile)
- Required fields: `event_id`, `timestamp`, `actor.agent_id`, `policy.trust_score_model`, `policy.trust_score_version`, `policy.decision`, `evaluation.human_involved`

---

*For schema details, see [attestation-envelope.json](../schema/attestation-envelope.json). For controlled vocabularies, see [VOCABULARY.md](VOCABULARY.md).*
