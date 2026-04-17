#!/usr/bin/env node
/**
 * Verifies schema host availability and immutable artifact serving.
 *
 * Checks:
 * - URL responds 200
 * - content-type includes json
 * - body bytes match canonical schema bytes from schema/attestation-envelope.json
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const targetUrl = process.env.SCHEMA_HOST_URL || "https://aurelianaegis.io/schema/attestation-envelope.json";
const localSchemaPath = path.join(__dirname, "../schema/attestation-envelope.json");
const expectedBytes = fs.readFileSync(localSchemaPath);
const expectedHash = crypto.createHash("sha256").update(expectedBytes).digest("hex");

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      })
      .on("error", reject);
  });
}

async function main() {
  const response = await fetch(targetUrl);
  if (response.statusCode !== 200) {
    throw new Error(`schema host returned status ${response.statusCode}`);
  }
  const contentType = String(response.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("json")) {
    throw new Error(`unexpected content-type '${contentType}'`);
  }
  const actualHash = crypto.createHash("sha256").update(response.body).digest("hex");
  if (actualHash !== expectedHash) {
    throw new Error(
      `immutable artifact mismatch: expected sha256 ${expectedHash}, got ${actualHash}`
    );
  }
  console.log(`✓ schema host healthy and immutable bytes match (${targetUrl})`);
}

main().catch((error) => {
  console.error(`Schema host check failed: ${error.message}`);
  process.exit(1);
});
