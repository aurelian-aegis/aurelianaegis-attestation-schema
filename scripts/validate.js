#!/usr/bin/env node
/**
 * Validates attestation JSON files against attestation-envelope.json (admissibility_token | execution_receipt).
 * Uses ajv-formats for date-time and other format validation.
 *
 * Usage:
 *   node scripts/validate.js [file1.json file2.json ...]
 *   node scripts/validate.js --scope=current
 *   node scripts/validate.js --scope=release --release=v1.0.0
 *   node scripts/validate.js --scope=all
 *
 * Default behavior validates only current top-level examples under examples/.
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

function collectJsonFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...collectJsonFiles(p));
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

function parseArgs(argv) {
  const options = {
    scope: "current",
    release: null,
    files: [],
  };
  for (const arg of argv) {
    if (arg.startsWith("--scope=")) {
      options.scope = arg.slice("--scope=".length);
    } else if (arg.startsWith("--release=")) {
      options.release = arg.slice("--release=".length);
    } else {
      options.files.push(arg);
    }
  }
  return options;
}

function collectCurrentExampleFiles(examplesDir) {
  if (!fs.existsSync(examplesDir)) return [];
  return fs
    .readdirSync(examplesDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(examplesDir, name));
}

const examplesDir = path.join(__dirname, "../examples");
const args = parseArgs(process.argv.slice(2));

let files = [];
if (args.files.length > 0) {
  files = args.files.map((f) => path.resolve(f));
} else if (args.scope === "current") {
  files = collectCurrentExampleFiles(examplesDir);
} else if (args.scope === "release") {
  if (!args.release) {
    console.error("Missing required --release=<version> for --scope=release");
    process.exit(1);
  }
  files = collectJsonFiles(path.join(examplesDir, "releases", args.release));
} else if (args.scope === "all") {
  files = collectJsonFiles(examplesDir);
} else {
  console.error(`Unknown scope '${args.scope}'. Use current, release, or all.`);
  process.exit(1);
}

if (files.length === 0) {
  console.error("No files to validate.");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    failed++;
    continue;
  }
  const data = JSON.parse(fs.readFileSync(resolved, "utf8"));
  const valid = validate(data);
  if (valid) {
    console.log(`✓ ${path.relative(process.cwd(), resolved)}`);
  } else {
    console.error(`✗ ${path.relative(process.cwd(), resolved)}`);
    console.error(validate.errors);
    failed++;
  }
}

process.exit(failed > 0 ? 1 : 0);
