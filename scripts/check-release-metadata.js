#!/usr/bin/env node
/**
 * Release metadata gate:
 * - CITATION.cff must contain top-level doi: 10.5281/zenodo.<id>
 * - README must not contain ZENODO placeholder tokens
 * - README should reference the minted DOI URL
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const citationPath = path.join(root, "CITATION.cff");
const readmePath = path.join(root, "README.md");

const citation = fs.readFileSync(citationPath, "utf8");
const readme = fs.readFileSync(readmePath, "utf8");

const doiMatch = citation.match(/^doi:\s*(10\.5281\/zenodo\.\d+)\s*$/m);
if (!doiMatch) {
  console.error("Release metadata check failed: CITATION.cff missing top-level doi: 10.5281/zenodo.<RECORD_ID>");
  process.exit(1);
}

const doi = doiMatch[1];

if (readme.includes("ZENODO_RECORD_ID")) {
  console.error("Release metadata check failed: README still contains ZENODO_RECORD_ID placeholder.");
  process.exit(1);
}

const doiUrl = `https://doi.org/${doi}`;
if (!readme.includes(doiUrl)) {
  console.error(`Release metadata check failed: README missing minted DOI URL ${doiUrl}`);
  process.exit(1);
}

console.log(`✓ release metadata complete (DOI ${doi})`);
