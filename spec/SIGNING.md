# Attestation Signing Protocol

**Version:** 1.0 (aligned with `schema/attestation-envelope.json`, `spec_id` `aurelianaegis.envelope.v1`)  
**Status:** Normative — implementations MUST follow this protocol for interoperability  
**Reference:** [RFC 8785 (JCS)](https://www.rfc-editor.org/rfc/rfc8785.html), [RFC 4648 §5 (Base64url)](https://www.rfc-editor.org/rfc/rfc4648#section-5)

---

## 1. Who Signs (Architecture Decision)

**The attestation is signed by the enforcement layer, never by the agent.**

| Signer | Valid? | Description |
|--------|--------|-------------|
| **Enforcement** (SDK, Sidecar, Gateway) | ✅ Yes | Primary signer. Intercepts capability calls, evaluates policy, signs with a key held by the enforcement component — not by the agent. |
| **Control plane** (API, countersign service) | ✅ Yes | Optional countersign for high-risk actions. Server-side only. Valid on **`execution_receipt`**. |
| **Detection** (DLP, proxy, UEBA) | ✅ Yes | Valid on **`execution_receipt`** for shadow-AI / interception events. Not valid for **`admissibility_token`** (PEP MUST use `enforcement` only). |
| **Agent** | ❌ No | The agent is untrusted. Agent self-attestation is undetectable if the agent is compromised; the cryptographic guarantee collapses. Verifiers MUST reject attestations where `signature.signer_type` indicates agent signing. |

**`signature.signer_id`** identifies the enforcement component (e.g. `sdk-openai-v0.2.1`, `sidecar-envoy-v0.1.0`), not the agent. The agent is identified by `actor.agent_id`; the signer is the component that enforced policy and produced the attestation.

---

## 2. Signing Protocol — Step by Step

Two compliant implementations following this protocol will produce identical byte strings and verification will succeed. Deviations will cause cross-vendor verification failure.

### 2.1 Inputs

- **Envelope** — The attestation document (JSON object) before the `signature` block is populated. This is either an **`admissibility_token`** or an **`execution_receipt`** (`artifact_type` discriminates).
- **`signature.signed_fields`** — Array of JSON pointers. **Execution receipts** MUST include at least `/spec_id`, `/artifact_type`, `/event_id`, `/timestamp`, `/tenant_id`, `/actor`, `/capability`, `/context`, `/policy`, `/outcome`, `/admissibility_event_id`. **Admissibility tokens** MUST include the fields listed in schema `SignatureAdmissibility` (no `/outcome`).
- **Private key** — Held by the enforcement component; never exposed to the agent.

### 2.2 Step 1: Build the Signing Payload Object

1. Create a copy of the envelope **excluding** the `signature` key. Call this `envelope_without_signature`.
2. For each JSON pointer in `signed_fields` (in array order):
   - Resolve the pointer against `envelope_without_signature`.
   - If the pointer is invalid or the value is missing, the implementation MUST fail (do not sign).
3. Build a JSON object `payload_object` where:
   - **Keys** are the JSON pointer strings exactly as they appear in `signed_fields` (e.g. `"/event_id"`).
   - **Values** are the resolved values (primitives, objects, or arrays — unchanged).
4. The order of keys in `payload_object` does not affect the output; RFC 8785 will sort them.

**Example:** For `signed_fields: ["/spec_id", "/event_id", "/actor"]`, the payload object is:

```json
{
  "/actor": { "agent_id": "urn:...", "passport_hash": "sha256:..." },
  "/event_id": "urn:aurelianaegis:event:tenant:...",
  "/spec_id": "aurelianaegis.envelope.v1"
}
```

(Key order in the example is irrelevant; RFC 8785 produces deterministic output.)

### 2.3 Step 2: Canonicalize the Payload

1. Serialize `payload_object` using **RFC 8785 (JSON Canonicalization Scheme)**.
2. The output is a UTF-8 byte string `canonical_bytes`.
3. This is the **exact byte string** that gets signed. No additional encoding, no prefix, no suffix.

**RFC 8785 requirements (summary):**

- Keys sorted lexicographically (Unicode code point order).
- No whitespace. No duplicate keys.
- Numbers in IEEE 754 representation. Strings in UTF-8.
- See [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html) for full algorithm.

### 2.4 Step 3: Sign the Canonical Bytes

1. Apply the signature algorithm (e.g. Ed25519) to `canonical_bytes`.
2. The algorithm MUST be one of: `Ed25519`, `ECDSA-P256`, `ECDSA-P384`.
3. Produce raw signature bytes `signature_bytes`: Ed25519 is 64 bytes; ECDSA MUST use raw `r||s` (IEEE P1363) — 64 bytes for P-256 and 96 bytes for P-384 (DER-encoded ECDSA signatures are not permitted).

### 2.5 Step 4: Encode the Signature

1. Encode `signature_bytes` using **Base64url** (RFC 4648 §5).
2. **Omit padding** (no `=` characters).
3. Set `signature.value` to this string.

### 2.6 Step 5: Populate the Signature Block

Populate the `signature` block:

| Field | Value |
|-------|-------|
| `algorithm` | e.g. `"Ed25519"` |
| `value` | Base64url-encoded signature (no padding) |
| `signer_id` | Identifier of the enforcement component (e.g. `"sdk-openai-v0.2.1"`) |
| `signer_type` | `"enforcement"` or `"control_plane"` or `"detection"` (receipt only; **`admissibility_token`** requires `"enforcement"` only) |
| `signed_fields` | The array of JSON pointers used to build the payload |
| `signing_canonical_method` | `"RFC8785"` |

---

## 3. Verification Protocol — Step by Step

### 3.1 Step 1: Reject Invalid Signers

1. Read `signature.signer_type` and `artifact_type`.
2. If `signer_type` is absent or indicates agent signing, **reject** the attestation.
3. If `artifact_type` is **`admissibility_token`**, `signer_type` MUST be `enforcement`.
4. If `artifact_type` is **`execution_receipt`**, `signer_type` MUST be one of `enforcement`, `control_plane`, or `detection`.

### 3.2 Step 2: Resolve the Public Key

1. Use `signature.signer_id` to identify the signer.
2. Resolve the public key via (in order of preference):
   - `actor.passport_public_key_inline` (for offline verification)
   - `actor.passport_registry_ref` or `actor.public_key_ref` (fetch from registry)
   - Tenant-specific key store keyed by `signer_id`
3. Verifiers MUST fail closed if no key can be resolved, if multiple non-equivalent keys resolve, or if the resolved key cannot be bound to `signature.signer_id` in the tenant trust domain.

### 3.3 Step 3: Rebuild the Signing Payload

1. Create `envelope_without_signature` = envelope minus the `signature` key.
2. For each pointer in `signature.signed_fields`, resolve against `envelope_without_signature`.
3. Build `payload_object` with pointer strings as keys and resolved values as values.
4. Serialize `payload_object` with RFC 8785 → `canonical_bytes`.

### 3.4 Step 4: Verify the Signature

1. Decode `signature.value` from Base64url (add padding if required by your library).
2. Verify `signature_bytes` against `canonical_bytes` using the public key and `signature.algorithm`.
3. If verification fails, **reject** the attestation (tampering or invalid signature).

---

## 4. Minimum Required signed_fields

**`execution_receipt`:** include at least:

- `/spec_id`, `/artifact_type`, `/event_id`, `/timestamp`, `/tenant_id`, `/admissibility_event_id`, `/actor`, `/capability`, `/context`, `/policy`, `/outcome`

**`admissibility_token`:** include at least the pointers required by schema `SignatureAdmissibility` (includes `/valid_from`, `/valid_until`, `/nonce`, `/asset`, `/authority`, `/risk`, `/data_boundaries`, `/liability`; no `/outcome`).

Additional pointers (e.g. `/root_event_id`, `/regulatory`) MAY be included. The `signature` block itself is never in `signed_fields`.

Implementations MUST treat `signed_fields` as an allowlisted subset of the envelope root and MUST reject `/signature` (or any `/signature/...` pointer).

**Conditional requirements — implementations MUST include these pointers when the corresponding field is present in the envelope:**

| Field present | Must add to `signed_fields` |
|---------------|----------------------------|
| `parent_event_id` | `/parent_event_id` |
| `previous_event_hash` | `/previous_event_hash` |
| `sequence_number` | `/sequence_number` |

These rules are also enforced by `allOf` conditionals in the JSON Schema.

### 4.1 Extension integrity requirements

If extension data can influence policy decisions, outcomes, compliance status, or admissibility, that extension data is decision-relevant and MUST be cryptographically bound.

Implementations MUST use at least one of these binding methods:

1. Include `/extensions` in `signature.signed_fields` (pointer-bound method), or
2. Include `/extensions_digest` in `signature.signed_fields` and compute `extensions_digest` as defined in §4.2.

When both are present, verifiers SHOULD validate both.

Unsigned decision-relevant extension data MUST be treated as tampered/untrusted and verification MUST fail.

### 4.2 `extensions_digest` deterministic method

When using `extensions_digest`, implementers MUST compute:

1. Extract root `extensions` object.
2. Canonicalize with RFC 8785.
3. Compute SHA-256 over canonical bytes.
4. Encode as lowercase hex and prefix with `sha256:`.
5. Set `extensions_digest = "sha256:" + hex_digest`.

Pseudo-form:

`extensions_digest = "sha256:" + SHA256(RFC8785(extensions)).hex()`

Verifiers MUST recompute and compare for exact equality when `extensions_digest` is present.

---

## 5. Test Vectors (Interoperability)

### 5.1 Minimal Payload Object

**Input (payload_object):**

```json
{
  "/actor": {
    "agent_id": "urn:aurelianaegis:agent:acme:test",
    "passport_hash": "sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
  },
  "/event_id": "urn:aurelianaegis:event:tenant:12345678-1234-1234-1234-123456789012",
  "/spec_id": "aurelianaegis.envelope.v1"
}
```

### 5.2 Expected RFC 8785 Canonical Output

**Canonical JSON (UTF-8 bytes):**

```
{"/actor":{"agent_id":"urn:aurelianaegis:agent:acme:test","passport_hash":"sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"},"/event_id":"urn:aurelianaegis:event:tenant:12345678-1234-1234-1234-123456789012","/spec_id":"aurelianaegis.envelope.v1"}
```

**Canonical bytes (hex):**

```
7b222f6163746f72223a7b226167656e745f6964223a2275726e3a617572656c69616e61656769733a6167656e743a61636d653a74657374222c2270617373706f72745f68617368223a227368613235363a61316232633364346535663661376238633964306531663261336234633564366537663861396230633164326533663461356236633764386539663061316232227d2c222f6576656e745f6964223a2275726e3a617572656c69616e61656769733a6576656e743a74656e616e743a31323334353637382d313233342d313233342d313233342d313233343536373839303132222c222f737065635f6964223a22617572656c69616e61656769732e656e76656c6f70652e7631227d
```

### 5.3 Interoperability Verification

Two implementations MUST:

1. Build the payload object from the input above.
2. Apply RFC 8785 to produce `canonical_bytes`.
3. Compare `canonical_bytes` (as hex or UTF-8) — they MUST be identical to the above.
4. Sign `canonical_bytes` with Ed25519 or ECDSA; verify with the same public key. Both MUST succeed.

**Reference implementations:** Use `rfc8785` (npm), `canonicalize` (npm), or `rfc8785.py` (Python) to verify your canonical output.

**Executable vector check:** Run `npm run verify:test-vectors` to verify canonical JSON, canonical bytes, and detached signatures against:
- `test-vectors/minimal-ed25519.json`
- `test-vectors/minimal-ecdsa-p256.json`
- `test-vectors/minimal-ecdsa-p384.json`

### 5.4 Full End-to-End Signed Fixture

Use `test-vectors/full-envelope-ed25519.json` as the canonical full-envelope pass/fail fixture. It publishes:
- The complete 9-field signed envelope (with signature block)
- Exact RFC 8785 canonical JSON and canonical bytes
- Expected Base64url signature
- A TEST-ONLY Ed25519 private/public key pair:
  - `test-vectors/keys/ed25519-test-private-key.pem`
  - `test-vectors/keys/ed25519-test-public-key.pem`

---

## 6. Implementation Notes

- **JSON Pointer escaping:** Pointer tokens use RFC 6901 escaping (`~1` for `/`, `~0` for `~`). Resolve pointers exactly; do not normalize token text.
- **Base64url decoding:** Accept unpadded Base64url input; decoders that require padding may add it internally before decode.
- **Key fingerprint canonical bytes:** `actor.passport_key_fingerprint` is SHA-256 over canonical key bytes — Ed25519 uses raw 32-byte public key; ECDSA uses DER SubjectPublicKeyInfo bytes.
- **Unicode normalization:** Implementations MUST NOT apply Unicode normalization transforms (e.g. NFC/NFD) to signed string values prior to RFC 8785 canonicalization.

---

## 7. Security Considerations

- **Key custody:** The signing key MUST be held by the enforcement component, never by the agent runtime.
- **Key rotation:** Document key rotation and compromise procedures; verifiers should support multiple valid keys per `signer_id` during rotation.
- **Replay:** `event_id` uniqueness and `timestamp` validation are separate from signing; see INTEGRATION.md for replay mitigation.

### Negative examples (must reject)

- Envelope where `extensions` includes decision-relevant controls but neither `/extensions` nor `/extensions_digest` is signed.
- Envelope where `extensions_digest` is signed but digest does not match canonicalized `extensions` content.
- Envelope where extension payload is modified post-signing while signature and digest remain stale.

---

## 8. Chain Hash Protocol (`previous_event_hash`)

The `previous_event_hash` field creates an append-only hash chain across sequential attestation records. This section defines the normative computation and verification protocol. For the full chain integrity model, see [CHAIN-INTEGRITY.md](CHAIN-INTEGRITY.md).

### 8.1 Purpose

Individual attestation signatures prove that a single record has not been tampered with. They do not prevent deletion of records from a sequence. `previous_event_hash` closes this gap: each record commits to the SHA-256 of the previous record, creating a chain where deletion of any record invalidates all subsequent records' chain links.

### 8.2 Scope

The chain is scoped per `tenant_id` + `actor.agent_id`. Records from different tenants or agents are in separate chains. Records from the same agent acting for the same tenant form a single linear chain, ordered by `sequence_number`.

### 8.3 Computing `previous_event_hash`

To compute `previous_event_hash` for record N+1, given record N:

1. Take the **complete signed attestation envelope** of record N as a JSON object — including the `signature` block.
2. Serialize it using **RFC 8785 (JSON Canonicalization Scheme)** — same algorithm used for the signature payload. This produces `prev_canonical_bytes`.
3. Compute `SHA-256(prev_canonical_bytes)` — produces a 32-byte digest.
4. Encode as lowercase hex (64 characters).
5. Set `previous_event_hash` = `"sha256:" + hex_digest`.

**Example:**

```
prev_canonical_bytes = RFC8785({ ...complete envelope N including signature... })
previous_event_hash  = "sha256:" + SHA256(prev_canonical_bytes).hex()
```

**Critical:** Use the complete envelope (including `signature`), not the signing payload object. The chain commits to the immutable final record, not to the pre-signature payload.

### 8.4 Verifying the Chain

For each consecutive pair of records (N, N+1) in chain order (by `sequence_number`):

1. Serialize record N with RFC 8785 → `canonical_bytes_N`.
2. Compute `SHA-256(canonical_bytes_N)` → `digest_N`.
3. Compare `"sha256:" + digest_N` to `record[N+1].previous_event_hash`.
4. If they do not match: the chain is broken — record N was modified after record N+1 was created, or a record was inserted or deleted between N and N+1.
5. Verify record N+1's signature independently using the standard protocol in §3.

**Verifiers MUST:**
- Verify signatures and chain hashes independently — a valid signature does not imply an intact chain.
- Treat a chain break as evidence of tampering or deletion and report it.
- Reject `previous_event_hash` values that do not match the `sha256:[a-f0-9]{64}` pattern.

### 8.5 First Record in a Chain

The first attestation record for a `tenant_id` + `actor.agent_id` combination has `sequence_number = 1` and MUST NOT include `previous_event_hash` (there is no previous record to commit to). Verifiers MUST treat a record with `sequence_number = 1` and a `previous_event_hash` present as an error.

### 8.6 Gap Detection via `sequence_number`

`sequence_number` provides a complementary deletion-detection mechanism:

- If records with `sequence_number` N and N+2 exist but N+1 is absent, record N+1 was deleted.
- If `sequence_number` values are non-monotonic (e.g., N+1 appears before N in the store), the sequence was manipulated.
- Verifiers SHOULD check that `sequence_number` is contiguous and strictly increasing within each `tenant_id` + `actor.agent_id` chain.

Gap detection via `sequence_number` is independent of `previous_event_hash` chain verification — use both for complete integrity assurance.

---

*This document is the normative specification for attestation signing. The schema constrains structure; this document constrains behavior.*
