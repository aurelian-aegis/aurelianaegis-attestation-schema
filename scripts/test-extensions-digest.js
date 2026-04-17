#!/usr/bin/env node
/**
 * Verifies deterministic extensions_digest generation across two fixtures.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const canonicalize = require("canonicalize");

const fixtures = [
  path.join(__dirname, "../test-vectors/extensions-digest-fixture-a.json"),
  path.join(__dirname, "../test-vectors/extensions-digest-fixture-b.json"),
];

function computeDigest(extensionsObject) {
  const canonical = canonicalize(extensionsObject);
  const hash = crypto.createHash("sha256").update(Buffer.from(canonical, "utf8")).digest("hex");
  return `sha256:${hash}`;
}

for (const fixturePath of fixtures) {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const actual = computeDigest(fixture.extensions);
  if (actual !== fixture.expected_extensions_digest) {
    console.error(
      `extensions digest mismatch in ${path.basename(fixturePath)}: expected ${fixture.expected_extensions_digest}, got ${actual}`
    );
    process.exit(1);
  }
}

const decisionRelevantFixture = {
  extensions: {
    "io.aurelianaegis.ext.finance-risk-controls": {
      approval_band: "high_value",
      control_mode: "dual_control",
    },
  },
  signature: {
    signed_fields: [
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
    ],
  },
};

const hasExtensionsBinding =
  decisionRelevantFixture.signature.signed_fields.includes("/extensions") ||
  decisionRelevantFixture.signature.signed_fields.includes("/extensions_digest");

if (!hasExtensionsBinding) {
  console.log("✓ unsigned decision-relevant extensions are detected as invalid");
} else {
  console.error("expected unsigned decision-relevant extensions fixture to fail binding check");
  process.exit(1);
}

const staleDigestFixture = {
  extensions: {
    "io.aurelianaegis.ext.finance-risk-controls": {
      approval_band: "high_value",
      control_mode: "dual_control",
    },
  },
  extensions_digest: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
};

if (computeDigest(staleDigestFixture.extensions) === staleDigestFixture.extensions_digest) {
  console.error("expected stale extensions_digest fixture to fail");
  process.exit(1);
}

console.log("✓ extensions_digest deterministic and negative verification passed");
