#!/usr/bin/env node
/**
 * Schema constraint tests — positive (valid) and negative (invalid) cases
 * (admissibility_token | execution_receipt).
 *
 * Usage: node scripts/test-schema-constraints.js
 */
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv").default;
const addFormats = require("ajv-formats").default;

const schemaPath = path.join(__dirname, "../schema/attestation-envelope.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const SIG_TOKEN_FIELDS = [
  "/spec_id",
  "/artifact_type",
  "/event_id",
  "/timestamp",
  "/tenant_id",
  "/valid_from",
  "/valid_until",
  "/nonce",
  "/actor",
  "/asset",
  "/authority",
  "/risk",
  "/capability",
  "/context",
  "/policy",
  "/data_boundaries",
  "/liability",
];

const SIG_RECEIPT_FIELDS = [
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

const tokenSig = {
  algorithm: "Ed25519",
  value: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  signer_id: "pep-test-v1",
  signer_type: "enforcement",
  signed_fields: SIG_TOKEN_FIELDS,
  signing_canonical_method: "RFC8785",
};

const receiptSig = {
  algorithm: "Ed25519",
  value: "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
  signer_id: "sdk-test-v1.0",
  signer_type: "enforcement",
  signed_fields: SIG_RECEIPT_FIELDS,
  signing_canonical_method: "RFC8785",
};

const BASE_TOKEN = {
  spec_id: "aurelianaegis.envelope.v1",
  artifact_type: "admissibility_token",
  event_id: "urn:aurelianaegis:event:tenant:aaaaaaaa-1234-1234-1234-aaaaaaaaaaaa",
  timestamp: "2026-04-14T10:00:00.000Z",
  tenant_id: "tenant_test",
  valid_from: "2026-04-14T10:00:00.000Z",
  valid_until: "2026-04-14T10:15:00.000Z",
  nonce: "nonce-test-12345678",
  actor: {
    agent_id: "urn:aurelianaegis:agent:test:bot-001",
    passport_hash: "sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  asset: { id: "urn:test:asset:1", type: "workflow" },
  authority: { basis: "policy" },
  risk: {},
  capability: { id: "test.action", domain: "test.domain" },
  context: { correlation_id: "corr_test" },
  policy: {
    governance_profile_id: "gp_test",
    decision: "allow",
    policy_set_hash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    execution_intent_hash: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
  },
  data_boundaries: {},
  liability: { liability_owner: { legal_entity_name: "Test Legal Entity Inc" } },
  signature: tokenSig,
};

const BASE_RECEIPT = {
  spec_id: "aurelianaegis.envelope.v1",
  artifact_type: "execution_receipt",
  event_id: "urn:aurelianaegis:event:tenant:aaaaaaaa-1234-1234-1234-aaaaaaaaaaaa",
  timestamp: "2026-04-14T10:00:00.000Z",
  tenant_id: "tenant_test",
  admissibility_event_id: "urn:aurelianaegis:event:tenant:bbbbbbbb-1234-1234-1234-bbbbbbbbbbbb",
  actor: {
    agent_id: "urn:aurelianaegis:agent:test:bot-001",
    passport_hash: "sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  capability: { id: "test.action", domain: "test.domain" },
  context: { correlation_id: "corr_test" },
  policy: { governance_profile_id: "gp_test", decision: "allow" },
  outcome: { status: "success", enforcement_component: "sdk-test-v1.0" },
  signature: receiptSig,
};

function merge(base, overrides) {
  return JSON.parse(JSON.stringify(Object.assign({}, base, overrides)));
}

function deepMerge(base, pathStr, value) {
  const copy = JSON.parse(JSON.stringify(base));
  const parts = pathStr.split(".");
  let node = copy;
  for (let i = 0; i < parts.length - 1; i++) {
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
  return copy;
}

const PASS = true;
const FAIL = false;

const cases = [
  { name: "base execution_receipt is valid", expect: PASS, doc: BASE_RECEIPT },
  { name: "base admissibility_token is valid", expect: PASS, doc: BASE_TOKEN },

  {
    name: "eu_ai_act high_risk WITH annex_iii_use_case — valid (receipt)",
    expect: PASS,
    doc: merge(BASE_RECEIPT, {
      regulatory: {
        classifications: [
          {
            framework: "eu_ai_act",
            version: "2024",
            category: "high_risk",
            jurisdiction: "eu",
            annex_iii_use_case: "credit_scoring",
          },
        ],
      },
    }),
  },
  {
    name: "eu_ai_act high_risk WITHOUT annex_iii_use_case — invalid (receipt)",
    expect: FAIL,
    doc: merge(BASE_RECEIPT, {
      regulatory: {
        classifications: [{ framework: "eu_ai_act", version: "2024", category: "high_risk", jurisdiction: "eu" }],
      },
    }),
  },

  {
    name: "policy_inputs_ref + policy_inputs_hash — valid (receipt)",
    expect: PASS,
    doc: merge(BASE_RECEIPT, {
      policy: {
        governance_profile_id: "gp_test",
        decision: "deny",
        policy_inputs_ref: "https://evidence.example.com/inputs/001",
        policy_inputs_hash: "b4c3d2e1f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
      },
    }),
  },
  {
    name: "policy_inputs_ref without policy_inputs_hash — invalid (receipt)",
    expect: FAIL,
    doc: merge(BASE_RECEIPT, {
      policy: {
        governance_profile_id: "gp_test",
        decision: "deny",
        policy_inputs_ref: "https://evidence.example.com/inputs/001",
      },
    }),
  },

  {
    name: "sequence_number present AND in signed_fields — valid (receipt)",
    expect: PASS,
    doc: merge(BASE_RECEIPT, {
      sequence_number: 1,
      signature: Object.assign({}, BASE_RECEIPT.signature, {
        signed_fields: [...SIG_RECEIPT_FIELDS, "/sequence_number"],
      }),
    }),
  },
  {
    name: "sequence_number present NOT in signed_fields — invalid (receipt)",
    expect: FAIL,
    doc: merge(BASE_RECEIPT, { sequence_number: 1 }),
  },

  {
    name: "previous_event_hash present AND in signed_fields — valid (receipt)",
    expect: PASS,
    doc: merge(BASE_RECEIPT, {
      previous_event_hash: "sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
      signature: Object.assign({}, BASE_RECEIPT.signature, {
        signed_fields: [...SIG_RECEIPT_FIELDS, "/previous_event_hash"],
      }),
    }),
  },
  {
    name: "previous_event_hash present NOT in signed_fields — invalid (receipt)",
    expect: FAIL,
    doc: merge(BASE_RECEIPT, {
      previous_event_hash: "sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    }),
  },

  {
    name: "parent_event_id present AND in signed_fields — valid (receipt)",
    expect: PASS,
    doc: merge(BASE_RECEIPT, {
      parent_event_id: "urn:aurelianaegis:event:tenant:cccccccc-1234-1234-1234-cccccccccccc",
      signature: Object.assign({}, BASE_RECEIPT.signature, {
        signed_fields: [...SIG_RECEIPT_FIELDS, "/parent_event_id"],
      }),
    }),
  },
  {
    name: "parent_event_id present NOT in signed_fields — invalid (receipt)",
    expect: FAIL,
    doc: merge(BASE_RECEIPT, {
      parent_event_id: "urn:aurelianaegis:event:tenant:cccccccc-1234-1234-1234-cccccccccccc",
    }),
  },

  {
    name: "blocking_reason: policy_violation — valid (receipt)",
    expect: PASS,
    doc: merge(BASE_RECEIPT, {
      outcome: { status: "blocked", enforcement_component: "sdk-test-v1.0", blocking_reason: "policy_violation" },
    }),
  },
  {
    name: "blocking_reason: unknown_value — invalid (receipt)",
    expect: FAIL,
    doc: merge(BASE_RECEIPT, {
      outcome: { status: "blocked", enforcement_component: "sdk-test-v1.0", blocking_reason: "not_a_real_reason" },
    }),
  },

  {
    name: "actor.external_id: DID — valid (receipt)",
    expect: PASS,
    doc: deepMerge(BASE_RECEIPT, "actor.external_id", "did:web:agents.acme-corp.com:bot-001"),
  },

  {
    name: "runtime.type: anthropic — valid (receipt)",
    expect: PASS,
    doc: deepMerge(BASE_RECEIPT, "actor.runtime", { type: "anthropic", runtime_id: "claude-test" }),
  },
  {
    name: "runtime.type: unknown_platform — invalid (receipt)",
    expect: FAIL,
    doc: deepMerge(BASE_RECEIPT, "actor.runtime", { type: "unknown_platform" }),
  },

  {
    name: "redaction_policy: hash_sensitive_only — valid (receipt)",
    expect: PASS,
    doc: deepMerge(BASE_RECEIPT, "capability.redaction_policy", "hash_sensitive_only"),
  },
  {
    name: "redaction_policy: invalid_value — invalid (receipt)",
    expect: FAIL,
    doc: deepMerge(BASE_RECEIPT, "capability.redaction_policy", "partially_redact"),
  },

  {
    name: "missing tenant_id — invalid (receipt)",
    expect: FAIL,
    doc: (() => {
      const d = JSON.parse(JSON.stringify(BASE_RECEIPT));
      delete d.tenant_id;
      return d;
    })(),
  },
  {
    name: "signer_type: agent — invalid (receipt)",
    expect: FAIL,
    doc: deepMerge(BASE_RECEIPT, "signature.signer_type", "agent"),
  },

  {
    name: "shadow AI: unregistered, no passport_hash — valid (receipt)",
    expect: PASS,
    doc: merge(BASE_RECEIPT, {
      actor: {
        agent_id: "urn:shadow:chatgpt:acme:user-emp-001",
        registration_status: "unregistered",
      },
    }),
  },
  {
    name: "registered without passport_hash — invalid (receipt)",
    expect: FAIL,
    doc: merge(BASE_RECEIPT, {
      actor: { agent_id: "urn:aurelianaegis:agent:acme:bot-001", registration_status: "registered" },
    }),
  },

  {
    name: "detection block — valid (receipt)",
    expect: PASS,
    doc: merge(BASE_RECEIPT, {
      actor: { agent_id: "urn:shadow:chatgpt:acme:user-001", registration_status: "unregistered" },
      detection: { detection_method: "network_proxy", action_completed: false },
    }),
  },
  {
    name: "detection: missing action_completed — invalid (receipt)",
    expect: FAIL,
    doc: merge(BASE_RECEIPT, {
      actor: { agent_id: "urn:shadow:chatgpt:acme:user-001", registration_status: "unregistered" },
      detection: { detection_method: "dlp_scan" },
    }),
  },

  {
    name: "token: policy missing policy_set_hash — invalid",
    expect: FAIL,
    doc: merge(BASE_TOKEN, {
      policy: { governance_profile_id: "gp_test", decision: "allow", execution_intent_hash: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210" },
    }),
  },
  {
    name: "token: policy missing execution_intent_hash — invalid",
    expect: FAIL,
    doc: merge(BASE_TOKEN, {
      policy: { governance_profile_id: "gp_test", decision: "allow", policy_set_hash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" },
    }),
  },
  {
    name: "token: signature signer_type control_plane — invalid",
    expect: FAIL,
    doc: merge(BASE_TOKEN, {
      signature: Object.assign({}, tokenSig, { signer_type: "control_plane" }),
    }),
  },
  {
    name: "receipt: supervised_override decision — valid",
    expect: PASS,
    doc: merge(BASE_RECEIPT, { policy: { governance_profile_id: "gp_test", decision: "supervised_override" } }),
  },
  {
    name: "extensions namespaced key — valid (receipt)",
    expect: PASS,
    doc: merge(BASE_RECEIPT, {
      extensions: {
        "io.aurelianaegis.ext.finance-risk-controls": {
          control_level: "dual_control"
        }
      },
    }),
  },
  {
    name: "extensions non-namespaced key — invalid (receipt)",
    expect: FAIL,
    doc: merge(BASE_RECEIPT, {
      extensions: {
        finance: {
          control_level: "dual_control"
        }
      },
    }),
  },
];

let passed = 0;
let failed = 0;

for (const tc of cases) {
  const valid = validate(tc.doc);
  const ok = valid === tc.expect;
  if (ok) {
    console.log(`  ✓ ${tc.name}`);
    passed++;
  } else {
    console.error(`  ✗ ${tc.name}`);
    if (tc.expect === PASS && !valid) {
      console.error(`    Expected PASS:`, validate.errors);
    } else {
      console.error(`    Expected FAIL but schema accepted.`);
    }
    failed++;
  }
}

console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
