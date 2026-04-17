#!/usr/bin/env node
/**
 * Resolve a profile to required and optional extensions.
 *
 * Usage:
 *   node scripts/resolve-profile.js io.aurelianaegis.profile.baseline-governed
 */
const fs = require("fs");
const path = require("path");

const profilesDir = path.join(__dirname, "../registry/profiles");

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

const profileId = process.argv[2];
if (!profileId) {
  console.error("Usage: node scripts/resolve-profile.js <profile_id>");
  process.exit(1);
}

const profileFile = fs
  .readdirSync(profilesDir)
  .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
  .map((f) => path.join(profilesDir, f))
  .find((file) => parseSimpleYaml(file).id === profileId);

if (!profileFile) {
  console.error(`Profile not found: ${profileId}`);
  process.exit(1);
}

const profile = parseSimpleYaml(profileFile);
const result = {
  id: profile.id,
  required_extensions: Array.isArray(profile.required_extensions) ? profile.required_extensions : [],
  optional_extensions: Array.isArray(profile.optional_extensions) ? profile.optional_extensions : [],
};
console.log(JSON.stringify(result, null, 2));
