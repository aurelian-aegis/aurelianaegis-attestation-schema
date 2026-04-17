#!/usr/bin/env node
/**
 * Computes canonical_json, canonical_hex, and Ed25519 signature for a test vector.
 * Usage: node scripts/generate-vector-expected.js <path-to-vector.json>
 * Reads vector.payload_object OR builds from vector.envelope + vector.signed_fields,
 * writes computed values to stdout as JSON (merge into expected manually).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const canonicalize = require("canonicalize");

const vectorPath = process.argv[2];
if (!vectorPath) {
  console.error("Usage: node scripts/generate-vector-expected.js <vector.json>");
  process.exit(1);
}

const vector = JSON.parse(fs.readFileSync(path.resolve(vectorPath), "utf8"));

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

let payloadObject;
if (vector.payload_object && typeof vector.payload_object === "object") {
  payloadObject = vector.payload_object;
} else if (vector.envelope && Array.isArray(vector.signed_fields)) {
  const envelopeWithoutSignature = { ...vector.envelope };
  delete envelopeWithoutSignature.signature;
  payloadObject = {};
  for (const pointer of vector.signed_fields) {
    const value = resolvePointer(envelopeWithoutSignature, pointer);
    if (value === undefined) {
      console.error("Missing pointer:", pointer);
      process.exit(1);
    }
    payloadObject[pointer] = value;
  }
} else {
  console.error("Need payload_object or envelope+signed_fields");
  process.exit(1);
}

const canonical = canonicalize(payloadObject);
const canonicalHex = Buffer.from(canonical, "utf8").toString("hex");

const keyPath = path.join(__dirname, "../test-vectors/keys/ed25519-test-private-key.pem");
const priv = crypto.createPrivateKey(fs.readFileSync(keyPath, "utf8"));
const sig = crypto.sign(null, Buffer.from(canonical, "utf8"), priv).toString("base64url");

const pubPath = path.join(__dirname, "../test-vectors/keys/ed25519-test-public-key.pem");
const pubPem = fs.readFileSync(pubPath, "utf8");

console.log(
  JSON.stringify(
    {
      canonical_json: canonical,
      canonical_hex: canonicalHex,
      signature_base64url: sig,
      public_key_pem: pubPem,
    },
    null,
    2
  )
);
