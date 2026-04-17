# Publication checklist (1.0.0+)

Use this when cutting a **Git release** (for example tag `**v1.0.0`**) and enabling **Zenodo** archiving. This repository cannot assign a DOI automatically from static files; the maintainer completes the steps below once per release.

## 1. Pre-release

- `npm ci && npm run check` passes locally.
- `schema/attestation-envelope.json` is the single canonical and published schema artifact for this repository.

## 2. GitHub release

1. Create an annotated tag on the commit you intend to ship (for example `v1.0.0`).
2. Create a **GitHub Release** with notes pointing to [CHANGELOG.md](../CHANGELOG.md).
3. Release notes MUST include a **Migration impact** section (required even when "none").
3. **Immutable artifacts:** citation and compliance SHOULD use the **tag** URL, not `main`:
  - Example: `https://github.com/aurelian-aegis/aurelianaegis-attestation-schema/releases/tag/v1.0.0`
  - Raw schema: `https://raw.githubusercontent.com/aurelian-aegis/aurelianaegis-attestation-schema/v1.0.0/schema/attestation-envelope.json`

## 3. Zenodo

1. Connect the GitHub repository to Zenodo (see [ZENODO.md](ZENODO.md)).
2. Publish the GitHub release; Zenodo creates an archive and assigns a **DOI**.

## 4. Fill the DOI (one-time per release)

After Zenodo shows the DOI:

1. **CITATION.cff** — Add the top-level field (CFF 1.2): `doi: 10.5281/zenodo.<RECORD_ID>`
2. **README.md** — In the BibTeX block under “How to Cite”, set `doi` and `url` to the same DOI.
3. Commit the citation update on `main` (or a docs branch) so the default branch shows the DOI.
4. Run `npm run check:release-metadata` to ensure DOI placeholders are removed and release metadata is complete.

## 5. Optional: `$id` host

Serve `attestation-envelope.json` from `aurelianaegis.io` so `https://aurelianaegis.io/schema/attestation-envelope.json` dereferences with `Content-Type: application/json` (or `application/schema+json`). Content MUST match the tagged file bytes.

### Host restore and monitoring baseline

- **Availability target:** maintain `https://aurelianaegis.io/schema/attestation-envelope.json` at **99.9%+** monthly availability.
- **Immutable serving requirement:** hosted bytes MUST match `schema/attestation-envelope.json` for the intended release line.
- **Repository monitor:** `.github/workflows/monitor-schema-host.yml` runs every 15 minutes and executes `npm run monitor:schema-host` to verify:
  - HTTP `200` response
  - JSON content type
  - SHA-256 byte-for-byte match to canonical schema artifact
- **Restore action:** if monitor fails, restore host routing/content and redeploy the canonical schema artifact before re-enabling downstream release steps.
- **Release smoke gate:** `.github/workflows/release-smoke.yml` enforces metadata completeness + `$id` endpoint availability on release branches/tags before publish steps proceed.

## Version policy

- **Additive evolution** — Prefer optional fields and new `artifact_type` values; keep `**spec_id`** `aurelianaegis.envelope.v1` until a breaking change (new spec era and migration).
- **Breaking changes** — Introduce a new `spec_id` (for example `aurelianaegis.envelope.v2`) and document migration in [CHANGELOG.md](../CHANGELOG.md).

## Changelog section standard

Every release entry in [CHANGELOG.md](../CHANGELOG.md) MUST include these sections:

- `### Breaking`
- `### Additive`
- `### Clarification`
- `### Security`