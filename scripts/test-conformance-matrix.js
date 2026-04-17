#!/usr/bin/env node
/**
 * Conformance matrix smoke tests:
 * - C1: core-only producer fixture validates
 * - C2: profile fixture validates and profile resolves
 * - C3: unknown extension handling fixture validates (schema-only class)
 */
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv").default;
const addFormats = require("ajv-formats").default;

const root = path.join(__dirname, "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "schema/attestation-envelope.json"), "utf8"));
const fixturesDir = path.join(root, "test-vectors/conformance");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function parseSimpleYaml(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const obj = {};
  let activeList = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const listMatch = rawLine.match(/^\s*-\s+(.+)$/);
    if (listMatch && activeList) {
      obj[activeList].push(listMatch[1].trim());
      continue;
    }
    const keyMatch = rawLine.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!keyMatch) continue;
    const key = keyMatch[1].trim();
    const value = keyMatch[2].trim();
    if (value === "") {
      obj[key] = [];
      activeList = key;
    } else if (value === "[]") {
      obj[key] = [];
      activeList = null;
    } else {
      obj[key] = value;
      activeList = null;
    }
  }
  return obj;
}

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name), "utf8"));
}

function assertValid(name, label) {
  const doc = readJson(name);
  if (!validate(doc)) {
    console.error(`Conformance failure (${label}): ${name}`);
    console.error(validate.errors);
    process.exit(1);
  }
  return doc;
}

function loadRegistry() {
  const extensionDir = path.join(root, "registry/extensions");
  const profileDir = path.join(root, "registry/profiles");
  const extensions = new Map();
  for (const file of fs.readdirSync(extensionDir).filter((name) => name.endsWith(".yaml"))) {
    const doc = parseSimpleYaml(path.join(extensionDir, file));
    extensions.set(doc.id, doc);
  }
  const profiles = new Map();
  for (const file of fs.readdirSync(profileDir).filter((name) => name.endsWith(".yaml"))) {
    const doc = parseSimpleYaml(path.join(profileDir, file));
    profiles.set(doc.id, doc);
  }
  return { extensions, profiles };
}

function assertProfileFixture(doc, registry) {
  if (!doc.profile_id) {
    console.error("Conformance failure (C2): missing profile_id");
    process.exit(1);
  }
  const profile = registry.profiles.get(doc.profile_id);
  if (!profile) {
    console.error(`Conformance failure (C2): unknown profile_id '${doc.profile_id}'`);
    process.exit(1);
  }
  const extensionIds = Array.isArray(doc.extension_ids) ? doc.extension_ids : [];
  const extensionKeys = Object.keys(doc.extensions || {});
  for (const requiredExtension of profile.required_extensions || []) {
    if (!extensionIds.includes(requiredExtension)) {
      console.error(`Conformance failure (C2): missing required extension_id '${requiredExtension}'`);
      process.exit(1);
    }
    const extensionDoc = registry.extensions.get(requiredExtension);
    if (!extensionDoc) {
      console.error(`Conformance failure (C2): unknown registry extension '${requiredExtension}'`);
      process.exit(1);
    }
    if (!extensionKeys.includes(extensionDoc.namespace)) {
      console.error(
        `Conformance failure (C2): required extension namespace '${extensionDoc.namespace}' missing from extensions`
      );
      process.exit(1);
    }
  }
}

assertValid("c1-core-only.json", "C1");
const registry = loadRegistry();
const c2Doc = assertValid("c2-core-plus-profile.json", "C2");
assertProfileFixture(c2Doc, registry);
assertValid("c3-unknown-extension.json", "C3");

console.log("✓ Conformance matrix passed (C1/C2/C3)");
