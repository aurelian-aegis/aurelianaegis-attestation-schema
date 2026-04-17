# Security Policy

## Supported Versions


| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |


## Reporting a Vulnerability

**We take security seriously.** If you discover a vulnerability in the attestation schema, signing protocol, or related documentation:

1. **Do not** open a public GitHub issue.
2. Email security concerns to: **[security@aurelianaegis.io](mailto:security@aurelianaegis.io)**.
3. Include a clear description of the vulnerability, steps to reproduce, and potential impact.
4. We will acknowledge within 48 hours and provide an initial assessment within 7 days.
5. We will coordinate disclosure with you and credit you in any advisory, unless you prefer to remain anonymous.

**Responsible disclosure:** We ask for 90 days before public disclosure to allow remediation. We will work with you in good faith.

---

## Key Management and Compromise

### Key Compromise Procedure

If a signing key used to produce attestations is compromised:

1. **Immediate:** Revoke the key in the passport registry or key store.
2. **Immediate:** Rotate to a new key; re-issue passports or enforcement component credentials.
3. **Within 24 hours:** Assess scope — which attestations were signed with the compromised key?
4. **Within 72 hours:** Notify affected tenants or consumers if attestations may have been forged.
5. **Document:** Record the incident, root cause, and remediation in your audit trail.

### Key Rotation

- Signing keys SHOULD be rotated periodically (e.g. annually) and after any personnel change with key access.
- Verifiers SHOULD support multiple valid keys per `signer_id` during rotation windows.
- Old keys MAY be retained (read-only) for verification of historical attestations, but MUST NOT be used for new signatures.

### Key Custody

- Signing keys MUST be held by the enforcement layer (SDK, Sidecar, Gateway), **never** by the agent runtime.
- Keys SHOULD be stored in a hardware security module (HSM) or managed key service (e.g. AWS KMS, Azure Key Vault) for production.
- See [SIGNING.md](spec/SIGNING.md) for the normative signing protocol and signer identity requirements.

---

## Schema and Protocol Security

- **Algorithm restriction:** Only `Ed25519`, `ECDSA-P256`, and `ECDSA-P384` are permitted. Reject attestations with unknown or weak algorithms (e.g. MD5, SHA-1 for signatures).
- **Replay protection:** Use `valid_from` and `valid_until` when present. Enforce `event_id` uniqueness. See [INTEGRATION.md](spec/INTEGRATION.md) for verifier guidance.
- **Signer validation:** Reject attestations where `signature.signer_type` indicates agent self-signing. Valid values depend on `artifact_type` (see [SIGNING.md](spec/SIGNING.md)):
  - `admissibility_token`: `signer_type` MUST be `enforcement` only (PEP).
  - `execution_receipt`: `signer_type` MUST be one of `enforcement`, `control_plane`, or `detection` (e.g. shadow-AI / interception receipts).
- **Chain integrity:** When `previous_event_hash` is present, verify it covers the complete prior envelope including its `signature` block, serialized as RFC 8785 canonical JSON, and hashed with SHA-256. A gap in `sequence_number` or a hash mismatch indicates deletion, reordering, or insertion. See [CHAIN-INTEGRITY.md](spec/CHAIN-INTEGRITY.md) for the normative protocol.
- **Key compromise and chain:** When a signing key is compromised, assess whether an attacker could have injected or deleted records in the hash chain. If `previous_event_hash` gaps are found in the post-compromise window, treat all records in that window as suspect and escalate to tenants.

---

*Last updated: April 2026*