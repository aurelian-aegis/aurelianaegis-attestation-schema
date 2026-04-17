#!/usr/bin/env node
/**
 * Verifies interoperability test vectors for RFC 8785 canonicalization and signature checks.
 *
 * Usage: node scripts/verify-test-vectors.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const canonicalize = require("canonicalize");

const vectorsDir = path.join(__dirname, "../test-vectors");
if (!fs.existsSync(vectorsDir)) {
  console.error("Missing test-vectors directory.");
  process.exit(1);
}

const vectorFiles = fs
  .readdirSync(vectorsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => path.join(vectorsDir, f));

if (vectorFiles.length === 0) {
  console.error("No test vector files found.");
  process.exit(1);
}

let failures = 0;

function getVerifyOptions(algorithm) {
  switch (algorithm) {
    case "Ed25519":
      return { digest: null, keyOptions: undefined, signatureLength: 64, signatureEncoding: "raw" };
    case "ECDSA-P256":
      return { digest: "sha256", keyOptions: { dsaEncoding: "ieee-p1363" }, signatureLength: 64, signatureEncoding: "raw_p1363" };
    case "ECDSA-P384":
      return { digest: "sha384", keyOptions: { dsaEncoding: "ieee-p1363" }, signatureLength: 96, signatureEncoding: "raw_p1363" };
    default:
      return null;
  }
}

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

function buildPayloadObject(vector) {
  if (vector.payload_object && typeof vector.payload_object === "object") {
    return vector.payload_object;
  }

  if (!vector.envelope || !Array.isArray(vector.signed_fields)) {
    return null;
  }

  const envelopeWithoutSignature = { ...vector.envelope };
  delete envelopeWithoutSignature.signature;
  const payload = {};
  for (const pointer of vector.signed_fields) {
    const value = resolvePointer(envelopeWithoutSignature, pointer);
    if (value === undefined) {
      return null;
    }
    payload[pointer] = value;
  }
  return payload;
}

for (const file of vectorFiles) {
  const vector = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!vector.algorithm) {
    console.log(`- ${path.basename(file)} (skipped: not a signature test vector)`);
    continue;
  }
  const verifyOptions = getVerifyOptions(vector.algorithm);
  if (!verifyOptions) {
    console.error(`✗ ${path.basename(file)} — unsupported algorithm: ${vector.algorithm}`);
    failures++;
    continue;
  }

  const payloadObject = buildPayloadObject(vector);
  if (!payloadObject) {
    console.error(`✗ ${path.basename(file)} — missing/invalid payload source`);
    failures++;
    continue;
  }

  const canonical = canonicalize(payloadObject);
  if (typeof canonical !== "string") {
    console.error(`✗ ${path.basename(file)} — canonicalization failed`);
    failures++;
    continue;
  }

  if (canonical !== vector.expected.canonical_json) {
    console.error(`✗ ${path.basename(file)} — canonical JSON mismatch`);
    failures++;
    continue;
  }

  const canonicalBytes = Buffer.from(canonical, "utf8");
  const canonicalHex = canonicalBytes.toString("hex");
  if (canonicalHex !== vector.expected.canonical_hex) {
    console.error(`✗ ${path.basename(file)} — canonical hex mismatch`);
    failures++;
    continue;
  }

  const publicKey = crypto.createPublicKey(vector.expected.public_key_pem);
  const signature = Buffer.from(vector.expected.signature_base64url, "base64url");
  if (signature.length !== verifyOptions.signatureLength) {
    console.error(
      `✗ ${path.basename(file)} — signature length mismatch for ${vector.algorithm} (${signature.length} bytes)`
    );
    failures++;
    continue;
  }
  if (
    vector.expected.signature_encoding &&
    vector.expected.signature_encoding !== verifyOptions.signatureEncoding
  ) {
    console.error(
      `✗ ${path.basename(file)} — signature encoding mismatch (${vector.expected.signature_encoding})`
    );
    failures++;
    continue;
  }

  if (
    vector.envelope &&
    vector.envelope.signature &&
    vector.envelope.signature.value !== vector.expected.signature_base64url
  ) {
    console.error(`✗ ${path.basename(file)} — envelope signature value mismatch`);
    failures++;
    continue;
  }

  const verifyKey =
    verifyOptions.keyOptions === undefined
      ? publicKey
      : { key: publicKey, ...verifyOptions.keyOptions };
  const ok = crypto.verify(verifyOptions.digest, canonicalBytes, verifyKey, signature);
  if (!ok) {
    console.error(`✗ ${path.basename(file)} — signature verification failed`);
    failures++;
    continue;
  }

  if (
    vector.algorithm === "Ed25519" &&
    vector.key_material &&
    typeof vector.key_material.private_key_pem_path === "string"
  ) {
    const privateKeyPath = path.join(__dirname, "..", vector.key_material.private_key_pem_path);
    if (!fs.existsSync(privateKeyPath)) {
      console.error(`✗ ${path.basename(file)} — missing private key file`);
      failures++;
      continue;
    }
    const privateKeyPem = fs.readFileSync(privateKeyPath, "utf8");
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const reSigned = crypto.sign(null, canonicalBytes, privateKey).toString("base64url");
    if (reSigned !== vector.expected.signature_base64url) {
      console.error(`✗ ${path.basename(file)} — Ed25519 deterministic signature mismatch`);
      failures++;
      continue;
    }
  }

  console.log(`✓ ${path.basename(file)}`);
}

process.exit(failures > 0 ? 1 : 0);
