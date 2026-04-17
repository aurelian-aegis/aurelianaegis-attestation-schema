#!/usr/bin/env node
/**
 * Lints extension/profile registries without external YAML dependencies.
 */
const fs = require("fs");
const path = require("path");
const Ajv = require("ajv").default;
const addFormats = require("ajv-formats").default;

const root = path.join(__dirname, "..");
const extensionsDir = path.join(root, "registry/extensions");
const profilesDir = path.join(root, "registry/profiles");
const extensionSchemaPath = path.join(root, "registry/schemas/extension-registry-entry.schema.json");
const profileSchemaPath = path.join(root, "registry/schemas/profile-registry-entry.schema.json");

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

function getYamlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => path.join(dir, f));
}

const errors = [];
const extensionFiles = getYamlFiles(extensionsDir);
const profileFiles = getYamlFiles(profilesDir);

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const extensionSchema = JSON.parse(fs.readFileSync(extensionSchemaPath, "utf8"));
const profileSchema = JSON.parse(fs.readFileSync(profileSchemaPath, "utf8"));
const validateExtension = ajv.compile(extensionSchema);
const validateProfile = ajv.compile(profileSchema);

const extensionsById = new Map();

for (const file of extensionFiles) {
  const doc = parseSimpleYaml(file);
  if (!validateExtension(doc)) {
    errors.push(`${path.basename(file)} schema validation failed: ${ajv.errorsText(validateExtension.errors)}`);
  }
  if (doc.id) {
    if (extensionsById.has(doc.id)) {
      errors.push(
        `duplicate extension id '${doc.id}' in ${path.basename(file)} and ${path.basename(
          extensionsById.get(doc.id).file
        )}`
      );
    } else {
      extensionsById.set(doc.id, { file, doc });
    }
  }
}

for (const file of profileFiles) {
  const doc = parseSimpleYaml(file);
  if (!validateProfile(doc)) {
    errors.push(`${path.basename(file)} schema validation failed: ${ajv.errorsText(validateProfile.errors)}`);
  }
  for (const field of ["required_extensions", "optional_extensions"]) {
    const values = Array.isArray(doc[field]) ? doc[field] : [];
    for (const extensionId of values) {
      if (!extensionsById.has(extensionId)) {
        errors.push(`${path.basename(file)} references unknown extension '${extensionId}'`);
      }
      const extEntry = extensionsById.get(extensionId);
      if (extEntry) {
        const extDoc = extEntry.doc;
        if (!["active", "experimental"].includes(extDoc.status)) {
          errors.push(
            `${path.basename(file)} references extension '${extensionId}' with unsupported status '${extDoc.status}'`
          );
        }
      }
    }
  }
}

for (const error of errors) {
  console.error(`Error: ${error}`);
}

if (errors.length > 0) {
  process.exit(1);
}
console.log(
  `✓ Registry lint passed (${extensionFiles.length} extensions, ${profileFiles.length} profiles)`
);
