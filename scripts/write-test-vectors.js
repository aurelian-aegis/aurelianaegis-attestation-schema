#!/usr/bin/env node
/**
 * Regenerates Ed25519 interoperability test vectors for execution_receipt (spec_id aurelianaegis.envelope.v1)
 * and minimal payload_object fixtures. Run from package root:
 *   node scripts/write-test-vectors.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const canonicalize = require("canonicalize");

const root = path.join(__dirname, "..");
const keysDir = path.join(root, "test-vectors/keys");
const privPath = path.join(keysDir, "ed25519-test-private-key.pem");
const pubPath = path.join(keysDir, "ed25519-test-public-key.pem");
const priv = crypto.createPrivateKey(fs.readFileSync(privPath, "utf8"));
const pubPem = fs.readFileSync(pubPath, "utf8");

function resolvePointer(obj, pointer) {
  if (pointer === "") return obj;
  if (!pointer.startsWith("/")) return undefined;
  let node = obj;
  const parts = pointer
    .slice(1)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  for (const part of parts) {
    if (node === null || node === undefined || !(part in node)) return undefined;
    node = node[part];
  }
  return node;
}

function signPayload(payloadObject) {
  const canonical = canonicalize(payloadObject);
  const canonicalHex = Buffer.from(canonical, "utf8").toString("hex");
  const sig = crypto.sign(null, Buffer.from(canonical, "utf8"), priv).toString("base64url");
  return { canonical_json: canonical, canonical_hex: canonicalHex, signature_base64url: sig };
}

function buildPayload(envelope, signedFields) {
  const env = JSON.parse(JSON.stringify(envelope));
  delete env.signature;
  const payload = {};
  for (const p of signedFields) {
    const v = resolvePointer(env, p);
    if (v === undefined) throw new Error(`Missing ${p}`);
    payload[p] = v;
  }
  return payload;
}

function writeVector(filename, doc) {
  fs.writeFileSync(path.join(root, "test-vectors", filename), JSON.stringify(doc, null, 2) + "\n");
  console.log("wrote", filename);
}

const keyMaterial = {
  private_key_pem_path: "test-vectors/keys/ed25519-test-private-key.pem",
  public_key_pem_path: "test-vectors/keys/ed25519-test-public-key.pem",
  warning: "TEST KEY ONLY. Never use this key in production.",
};

// --- minimal-ed25519 (payload_object only) ---
const minimalPayload = {
  "/actor": {
    agent_id: "urn:aurelianaegis:agent:acme:test",
    passport_hash: "sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  "/event_id": "urn:aurelianaegis:event:tenant:12345678-1234-1234-1234-123456789012",
  "/spec_id": "aurelianaegis.envelope.v1",
};
const minimalExp = signPayload(minimalPayload);
writeVector("minimal-ed25519.json", {
  name: "minimal-ed25519",
  algorithm: "Ed25519",
  payload_object: minimalPayload,
  expected: {
    ...minimalExp,
    public_key_pem: pubPem,
  },
});

// --- full execution receipt (9 core + artifact + admissibility link) ---
const admId = "urn:aurelianaegis:event:tenant:42345678-1234-1234-1234-123456789012";
const fullSigned = [
  "/spec_id",
  "/artifact_type",
  "/event_id",
  "/timestamp",
  "/tenant_id",
  "/admissibility_event_id",
  "/actor",
  "/capability",
  "/context",
  "/policy",
  "/outcome",
];
const fullEnvelope = {
  spec_id: "aurelianaegis.envelope.v1",
  artifact_type: "execution_receipt",
  event_id: "urn:aurelianaegis:event:tenant:42345678-1234-1234-1234-123456789012",
  timestamp: "2026-02-26T12:34:56.789Z",
  tenant_id: "tenant_acme_corp",
  admissibility_event_id: admId,
  actor: {
    agent_id: "urn:aurelianaegis:agent:acme:payment-bot-001",
    passport_hash: "sha256:d1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  capability: { id: "finance.approve_payment", domain: "finance.payments" },
  context: { correlation_id: "corr_full_fixture_001", telemetry: { latency_ms: 14 } },
  policy: {
    governance_profile_id: "gp_payments_dual_control",
    decision: "allow",
    trust_scores: { overall: 0.87 },
    trust_score_model: "trust-v1",
  },
  outcome: { status: "success", enforcement_component: "sdk-openai-v0.2.1" },
  signature: {
    algorithm: "Ed25519",
    value: "PLACEHOLDER",
    signer_id: "sdk-openai-v0.2.1",
    signer_type: "enforcement",
    signed_fields: fullSigned,
    signing_canonical_method: "RFC8785",
  },
};
const fullPayload = buildPayload(fullEnvelope, fullSigned);
const fullExp = signPayload(fullPayload);
fullEnvelope.signature.value = fullExp.signature_base64url;
writeVector("full-envelope-ed25519.json", {
  name: "full-envelope-ed25519",
  description: "Full execution_receipt fixture (core signed fields + artifact_type + admissibility_event_id). TEST-ONLY Ed25519 key.",
  algorithm: "Ed25519",
  key_material: keyMaterial,
  signed_fields: fullSigned,
  envelope: fullEnvelope,
  expected: { ...fullExp, public_key_pem: pubPem },
});

// --- deny scenario ---
const denySigned = [
  "/actor",
  "/capability",
  "/event_id",
  "/outcome",
  "/policy",
  "/spec_id",
  "/artifact_type",
  "/admissibility_event_id",
  "/sequence_number",
  "/tenant_id",
];
const denyEnvelope = {
  spec_id: "aurelianaegis.envelope.v1",
  artifact_type: "execution_receipt",
  event_id: "urn:aurelianaegis:event:tenant:62345678-1234-1234-1234-123456789012",
  timestamp: "2026-02-26T15:00:00.000Z",
  tenant_id: "tenant_acme_corp",
  admissibility_event_id: "urn:aurelianaegis:event:tenant:62345678-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  sequence_number: 1,
  actor: {
    agent_id: "urn:aurelianaegis:agent:acme:loan-bot-003",
    external_id: "did:web:agents.acme-corp.com:loan-bot-003",
    passport_hash: "sha256:d1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  capability: { id: "finance.approve_loan", domain: "finance.lending" },
  context: { correlation_id: "corr_deny_test_001" },
  policy: {
    governance_profile_id: "gp_loans_dual_control",
    decision: "deny",
    policy_inputs_ref: "https://evidence.acme-corp.com/policy-inputs/62345678",
    policy_inputs_hash: "b4c3d2e1f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
  },
  outcome: {
    status: "blocked",
    enforcement_component: "sdk-openai-v0.2.1",
    blocking_reason: "dual_control_required",
  },
  signature: {
    algorithm: "Ed25519",
    value: "PLACEHOLDER",
    signer_id: "sdk-openai-v0.2.1",
    signer_type: "enforcement",
    signed_fields: denySigned,
    signing_canonical_method: "RFC8785",
  },
};
const denyPayload = buildPayload(denyEnvelope, denySigned);
const denyExp = signPayload(denyPayload);
denyEnvelope.signature.value = denyExp.signature_base64url;
writeVector("deny-scenario-ed25519.json", {
  name: "deny-scenario-ed25519",
  description:
    "Deny/blocked execution_receipt with external_id, blocking_reason, policy_inputs_ref/hash, sequence_number, artifact fields.",
  algorithm: "Ed25519",
  key_material: keyMaterial,
  signed_fields: denySigned,
  envelope: denyEnvelope,
  notes: [
    "execution_receipt requires admissibility_event_id (synthetic UUID for this deny fixture).",
    "policy_inputs_ref + policy_inputs_hash pair per Policy conditional.",
  ],
  expected: { ...denyExp, public_key_pem: pubPem },
});

// --- chain integrity (receipt + sequence + previous hash; minimal extra fields) ---
const chainSigned = [
  "/actor",
  "/event_id",
  "/previous_event_hash",
  "/spec_id",
  "/artifact_type",
  "/admissibility_event_id",
  "/sequence_number",
  "/tenant_id",
];
const chainEnvelope = {
  spec_id: "aurelianaegis.envelope.v1",
  artifact_type: "execution_receipt",
  event_id: "urn:aurelianaegis:event:tenant:52345678-1234-1234-1234-123456789012",
  timestamp: "2026-02-26T16:00:00.000Z",
  tenant_id: "tenant_acme_corp",
  admissibility_event_id: "urn:aurelianaegis:event:tenant:52345678-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  sequence_number: 2,
  previous_event_hash: "sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  actor: {
    agent_id: "urn:aurelianaegis:agent:acme:payment-bot-001",
    passport_hash: "sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  capability: { id: "finance.approve_payment", domain: "finance.payments" },
  context: { correlation_id: "corr_chain_test_001" },
  policy: { governance_profile_id: "gp_payments_dual_control", decision: "allow" },
  outcome: { status: "success", enforcement_component: "sdk-openai-v0.2.1" },
  signature: {
    algorithm: "Ed25519",
    value: "PLACEHOLDER",
    signer_id: "sdk-openai-v0.2.1",
    signer_type: "enforcement",
    signed_fields: chainSigned,
    signing_canonical_method: "RFC8785",
  },
};
const chainPayload = buildPayload(chainEnvelope, chainSigned);
const chainExp = signPayload(chainPayload);
chainEnvelope.signature.value = chainExp.signature_base64url;
writeVector("chain-integrity-ed25519.json", {
  name: "chain-integrity-ed25519",
  description: "Chain fields on execution_receipt: sequence_number + previous_event_hash + envelope headers.",
  algorithm: "Ed25519",
  key_material: keyMaterial,
  signed_fields: chainSigned,
  envelope: chainEnvelope,
  notes: [
    "Signed payload excludes capability/context/policy/outcome when not listed — only listed pointers are canonicalized (matches SIGNING subset style).",
  ],
  expected: { ...chainExp, public_key_pem: pubPem },
});

// --- multi-agent ---
const multiSigned = [
  "/actor",
  "/capability",
  "/event_id",
  "/outcome",
  "/parent_event_id",
  "/policy",
  "/previous_event_hash",
  "/root_event_id",
  "/spec_id",
  "/artifact_type",
  "/admissibility_event_id",
  "/sequence_number",
  "/tenant_id",
];
const multiEnvelope = {
  spec_id: "aurelianaegis.envelope.v1",
  artifact_type: "execution_receipt",
  event_id: "urn:aurelianaegis:event:tenant:72345678-1234-1234-1234-123456789012",
  timestamp: "2026-02-26T17:00:00.000Z",
  tenant_id: "tenant_acme_corp",
  admissibility_event_id: "urn:aurelianaegis:event:tenant:72345678-cccc-cccc-cccc-cccccccccccc",
  parent_event_id: "urn:aurelianaegis:event:tenant:62345678-1234-1234-1234-123456789012",
  root_event_id: "urn:aurelianaegis:event:tenant:62345678-1234-1234-1234-123456789012",
  sequence_number: 3,
  previous_event_hash: "sha256:d1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  actor: {
    agent_id: "urn:aurelianaegis:agent:acme:executor-002",
    external_id: "spiffe://acme-corp.com/agent/executor-002",
    passport_hash: "sha256:b4e3d2c1f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
  },
  capability: { id: "finance.execute_payment", domain: "finance.payments" },
  context: { correlation_id: "corr_multi_chain_001" },
  policy: { governance_profile_id: "gp_payments_dual_control", decision: "allow" },
  outcome: { status: "success", enforcement_component: "sdk-openai-v0.2.1" },
  signature: {
    algorithm: "Ed25519",
    value: "PLACEHOLDER",
    signer_id: "sdk-openai-v0.2.1",
    signer_type: "enforcement",
    signed_fields: multiSigned,
    signing_canonical_method: "RFC8785",
  },
};
const multiPayload = buildPayload(multiEnvelope, multiSigned);
const multiExp = signPayload(multiPayload);
multiEnvelope.signature.value = multiExp.signature_base64url;
writeVector("multi-agent-chain-ed25519.json", {
  name: "multi-agent-chain-ed25519",
  description: "Multi-agent DAG + chain on execution_receipt.",
  algorithm: "Ed25519",
  key_material: keyMaterial,
  signed_fields: multiSigned,
  envelope: multiEnvelope,
  notes: ["parent_event_id, root_event_id, sequence_number, previous_event_hash; SPIFFE external_id."],
  expected: { ...multiExp, public_key_pem: pubPem },
});

// --- shadow AI ---
const shadowSigned = [
  "/actor",
  "/capability",
  "/context",
  "/detection",
  "/event_id",
  "/outcome",
  "/policy",
  "/spec_id",
  "/artifact_type",
  "/admissibility_event_id",
  "/sequence_number",
  "/tenant_id",
];
const shadowEnvelope = {
  spec_id: "aurelianaegis.envelope.v1",
  artifact_type: "execution_receipt",
  event_id: "urn:aurelianaegis:event:tenant:82345678-1234-1234-1234-123456789012",
  timestamp: "2026-02-26T18:00:00.000Z",
  tenant_id: "tenant_acme_corp",
  admissibility_event_id: "urn:aurelianaegis:event:tenant:82345678-dddd-dddd-dddd-dddddddddddd",
  sequence_number: 1,
  actor: {
    agent_id: "urn:shadow:chatgpt:acme:user-emp-8821",
    registration_status: "unregistered",
  },
  capability: { id: "shadow.external_ai.prompt_submission", domain: "shadow.ai" },
  context: {
    correlation_id: "corr_shadow_proxy_001",
    user: { type: "employee", id: "emp-8821" },
  },
  detection: {
    detection_method: "network_proxy",
    action_completed: false,
    detection_confidence: 1.0,
    unauthorized_tool: "chatgpt",
    data_classification_exposed: "confidential",
  },
  policy: {
    governance_profile_id: "gp_shadow_ai_block_all",
    decision: "deny",
    violation_flags: ["shadow_ai_detected", "data_exfiltration_risk"],
  },
  outcome: {
    status: "blocked",
    enforcement_component: "dlp-proxy-v2.1.0",
    blocking_reason: "unauthorized_ai_tool",
  },
  signature: {
    algorithm: "Ed25519",
    value: "PLACEHOLDER",
    signer_id: "dlp-proxy-v2.1.0",
    signer_type: "detection",
    signed_fields: shadowSigned,
    signing_canonical_method: "RFC8785",
  },
};
const shadowPayload = buildPayload(shadowEnvelope, shadowSigned);
const shadowExp = signPayload(shadowPayload);
shadowEnvelope.signature.value = shadowExp.signature_base64url;
writeVector("shadow-ai-detection-ed25519.json", {
  name: "shadow-ai-detection-ed25519",
  description: "Shadow AI detection as execution_receipt; signer_type=detection.",
  algorithm: "Ed25519",
  key_material: keyMaterial,
  signed_fields: shadowSigned,
  envelope: shadowEnvelope,
  notes: [
    "Synthetic admissibility_event_id for schema validity (shadow events may omit real PEP token in some deployments; this fixture includes a placeholder URN).",
  ],
  expected: { ...shadowExp, public_key_pem: pubPem },
});

console.log("Done.");
