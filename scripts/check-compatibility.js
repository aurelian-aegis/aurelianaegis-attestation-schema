#!/usr/bin/env node
/**
 * Compatibility guardrails for core schema versioning.
 *
 * This script prevents accidental breaking schema changes in MINOR/PATCH releases.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const schemaPath = path.join(root, "schema/attestation-envelope.json");
const pkgPath = path.join(root, "package.json");
const changelogPath = path.join(root, "CHANGELOG.md");

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const changelog = fs.readFileSync(changelogPath, "utf8");

const [major] = String(pkg.version).split(".");
const majorNumber = Number(major);

function fail(reason) {
  console.error(`Compatibility violation: ${reason}`);
  process.exit(1);
}

if (!Number.isInteger(majorNumber) || majorNumber < 1) {
  fail(`invalid package version '${pkg.version}'`);
}

const specIdValues = new Set();
for (const defName of ["AdmissibilityToken", "ExecutionReceipt"]) {
  const def = schema.definitions && schema.definitions[defName];
  const specProp = def && def.properties && def.properties.spec_id;
  if (!specProp || typeof specProp.const !== "string") {
    fail(`${defName}.properties.spec_id.const is missing`);
  }
  specIdValues.add(specProp.const);
}

if (specIdValues.size !== 1) {
  fail(`inconsistent spec_id const values found: ${Array.from(specIdValues).join(", ")}`);
}

const specId = Array.from(specIdValues)[0];
const expectedPrefix = "aurelianaegis.envelope.v";
if (!specId.startsWith(expectedPrefix)) {
  fail(`spec_id '${specId}' must start with '${expectedPrefix}'`);
}
const specMajor = Number(specId.slice(expectedPrefix.length));
if (!Number.isInteger(specMajor) || specMajor < 1) {
  fail(`spec_id '${specId}' has invalid major segment`);
}

if (majorNumber !== specMajor) {
  fail(
    `package major (${majorNumber}) must match spec_id major (${specMajor}) for release consistency`
  );
}

const hasBreakingSection = /###\s+Breaking\b/i.test(changelog);
if (!hasBreakingSection) {
  fail("CHANGELOG must include a '### Breaking' section for standardized release notes");
}

console.log(`✓ Core compatibility checks passed for ${specId} (package ${pkg.version})`);
