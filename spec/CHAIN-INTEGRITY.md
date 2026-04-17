# Attestation Chain Integrity

**Version:** 1.0 (chain fields apply to `**execution_receipt`**; not used on `**admissibility_token`**)  
**Status:** Normative — implementations that claim chain integrity support MUST follow this specification  
**References:** [SIGNING.md](SIGNING.md) §8, [RFC 8785 (JCS)](https://www.rfc-editor.org/rfc/rfc8785.html)

---

## 1. Overview

The AurelianAegis Attestation Envelope provides two distinct layers of integrity assurance:


| Layer                | Mechanism                                 | What It Proves                                                       |
| -------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| **Record integrity** | Ed25519 / ECDSA signature (per record)    | This individual record has not been modified since it was signed     |
| **Chain integrity**  | `previous_event_hash` + `sequence_number` | No records have been inserted, deleted, or reordered in the sequence |


Record integrity alone is necessary but not sufficient for regulated audit trails. A tamper-evident store that allows deletion of individual records provides no guarantee that a complete, uninterrupted audit trail exists. Chain integrity closes this gap.

---

## 2. Chain Model

### 2.1 Chain Scope

Each chain is scoped to a single `tenant_id` + `actor.agent_id` combination. Records from different agents, even within the same tenant, are in independent chains. This design ensures:

- Chain verification is agent-specific — auditors can verify the complete history of a single agent without traversing unrelated records.
- Chains scale independently per agent — no cross-agent coordination required.
- Regulatory queries ("show me all actions by agent X") map directly to chain queries.

### 2.2 Chain Structure

```
Record 1                Record 2                Record 3
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ sequence_number:1│   │ sequence_number:2│   │ sequence_number:3│
│ previous_event_  │   │ previous_event_  │   │ previous_event_  │
│   hash: (absent) │   │   hash: sha256(  │   │   hash: sha256(  │
│                  │──▶│     RFC8785(R1)) │──▶│     RFC8785(R2)) │
│ signature: {...} │   │ signature: {...} │   │ signature: {...} │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

Each record commits to the complete previous record (including its signature). A verifier who holds the first record and each subsequent record can verify the entire chain independently.

### 2.3 What the Chain Detects


| Attack / Failure                       | Detected by                               | How                                                                |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| Record content modified after signing  | Record signature                          | Signature verification fails                                       |
| Record deleted from sequence           | `sequence_number` gap                     | Sequence N and N+2 exist; N+1 absent                               |
| Record deleted AND sequence renumbered | `previous_event_hash`                     | Hash of record N+1's predecessor does not match remaining record N |
| Record inserted into sequence          | `sequence_number` + `previous_event_hash` | Inserted record breaks chain hash of next record                   |
| Record reordered                       | `previous_event_hash`                     | Hash chain is not consistent with claimed order                    |


**Limitation:** The chain does not detect deletion of the tail (most recent records). The most recent N records can always be silently dropped without breaking the chain that precedes them. Mitigate with: real-time export to immutable storage (WORM drives, write-once cloud storage), or periodic chain anchoring (see §6).

---

## 3. Field Definitions

### 3.1 `previous_event_hash`

```json
"previous_event_hash": "sha256:a3f2c8b1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
```

- **Type:** String, pattern `^sha256:[a-f0-9]{64}$`
- **Scope:** Per `tenant_id` + `actor.agent_id` chain
- **Computation:** `"sha256:" + SHA256(RFC8785(complete_previous_envelope)).hex()`
- **When present:** MUST be included in `signature.signed_fields`
- **First record:** MUST NOT be present when `sequence_number = 1`

### 3.2 `sequence_number`

```json
"sequence_number": 42
```

- **Type:** Integer, minimum 1
- **Scope:** Per `tenant_id` + `actor.agent_id` chain
- **Assignment:** Monotonically increasing, starting at 1. MUST be assigned by the enforcement layer or control plane — never by the agent.
- **When present:** MUST be included in `signature.signed_fields`
- **Gaps:** A gap in sequence numbers (N exists, N+1 absent, N+2 exists) is evidence of deletion.

---

## 4. Implementation Requirements

### 4.1 Chain Producers (Enforcement Layer / Control Plane)

Implementations that emit chain-linked attestations MUST:

1. Maintain a per-`tenant_id` + `actor.agent_id` counter for `sequence_number`.
2. Retrieve the RFC 8785 canonical form of the previous envelope before producing the next.
3. Compute `previous_event_hash = "sha256:" + SHA256(prev_canonical).hex()`.
4. Include `/previous_event_hash` and `/sequence_number` in `signed_fields`.
5. Sign the envelope with both fields present in the payload (per SIGNING.md §2).
6. Persist envelopes to a write-once or append-only store before acknowledging the action.

**Concurrency:** Sequence number assignment and `previous_event_hash` computation MUST be atomic within a single chain scope. Concurrent actions by the same agent MUST be serialized — the chain model does not support parallel branches.

### 4.2 Chain Verifiers (Audit Systems / Compliance Tools)

Implementations that verify chain integrity MUST:

1. Sort records for the target `tenant_id` + `actor.agent_id` by `sequence_number` ascending.
2. Verify `sequence_number` starts at 1 and is contiguous (no gaps).
3. For each consecutive pair (N, N+1):
  a. Compute `RFC8785(complete_envelope_N)` → `canonical_N`.
   b. Compute `SHA256(canonical_N)` → `digest_N`.
   c. Verify `record[N+1].previous_event_hash == "sha256:" + digest_N.hex()`.
4. For each individual record: verify the signature per SIGNING.md §3.
5. Report chain breaks with: which record pair failed, which check failed (gap / hash mismatch / signature), and what the expected vs. actual values were.

Verifiers MUST NOT consider a chain valid if any of the above checks fail. A chain with a valid tail but a broken link anywhere in history is a broken chain.

---

## 5. Relationship to Multi-Agent DAG

The chain integrity model and the multi-agent DAG (`parent_event_id` / `root_event_id`) are orthogonal:


| Mechanism                                 | Models                         | Proves                                           |
| ----------------------------------------- | ------------------------------ | ------------------------------------------------ |
| `previous_event_hash` + `sequence_number` | Sequential history per agent   | No records deleted from a single agent's history |
| `parent_event_id` + `root_event_id`       | Hierarchical orchestration DAG | How agents were invoked and in what order        |


A sub-agent's chain may include records that reference different `parent_event_id` values (it was called by different orchestrators at different times). Its chain integrity is verified independently of the DAG. DAG reconstruction uses `parent_event_id`; chain integrity uses `previous_event_hash`.

**DAG integrity limitation:** The orchestrator's chain does not commit to its sub-agents' chains. A complete sub-agent subtree can be deleted without breaking the orchestrator's chain. Mitigate by verifying chains for every agent involved in an orchestrated workflow, not just the root.

---

## 6. Chain Anchoring (Recommended Practice)

For regulated use cases where deletion-of-tail attacks are a concern, implement periodic chain anchoring:

1. At regular intervals (e.g., hourly, daily), record the `event_id`, `sequence_number`, and `previous_event_hash` (or SHA-256 of the most recent canonical envelope) in an **external, immutable anchor record** — e.g., a public blockchain timestamp, a notarized hash, or a write-once archival system.
2. The anchor proves that the chain existed up to position N at time T. Any deletion of records at positions ≤ N would break the chain link at N+1.
3. Anchors are not part of the attestation envelope schema — they are an operational practice layered on top.

For regulatory purposes, daily anchoring to a write-once archive (e.g., AWS S3 Object Lock, Azure Immutable Blob Storage) satisfies most financial regulator record-keeping requirements.

---

## 7. Chain Integrity vs. Competing Approaches


| Approach                  | Mechanism                                                       | AurelianAegis Equivalent                                                      |
| ------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Merkle tree (OpenBox AI)  | Tree root commits to all leaves; any leaf deletion changes root | Hash chain: similar guarantee, simpler verification, sequential only          |
| Hash chaining (Aegis OSS) | Each record hashes predecessor                                  | Same as `previous_event_hash` — identical model                               |
| Blockchain anchoring      | External immutable ledger commits to record hashes              | Operational practice (§6) — not in schema by default                          |
| WORM storage              | Write-once physical / logical storage prevents deletion         | Operational — schema-level chain provides evidence that WORM was not bypassed |


The AurelianAegis model (linear hash chain + sequence number gap detection) is functionally equivalent to hash chaining and provides sequential deletion detection without requiring a Merkle tree. Merkle trees provide better performance for proving inclusion of a specific record in a large set; linear chains provide better performance for proving completeness of an ordered sequence.

---

*For the signing protocol, see [SIGNING.md](SIGNING.md). For schema field definitions, see [attestation-envelope.json](../schema/attestation-envelope.json).*