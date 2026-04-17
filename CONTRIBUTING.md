# Contributing to AurelianAegis Attestation Schema

Thank you for your interest in contributing. This document explains how to propose changes, report issues, and add to the controlled vocabulary.

---

## Code of Conduct

Be respectful and constructive. We aim for an inclusive, professional community.

---

## How to Contribute

### Reporting Issues

1. Open a [GitHub Issue](https://github.com/aurelian-aegis/aurelianaegis-attestation-schema/issues).
2. Use the appropriate template: Bug, Schema Change Proposal, or Vocabulary. Documentation issues can be filed with the bug template or a normal issue.
3. Include:
  - Clear description of the problem or proposal
  - `spec_id` (e.g. `aurelianaegis.envelope.v1`)
  - Example attestation (redacted) if relevant

### Proposing Schema Changes

Schema changes require careful review to preserve interoperability.

1. **Open an issue** with the label `schema-change`.
2. Describe the change, rationale, and impact on existing consumers.
3. Provide a JSON Schema diff or updated schema snippet.
4. If adding fields, ensure they are optional or backward-compatible.
5. Maintainers will review and may request a pull request with tests.

**Chain integrity fields:** Changes to `previous_event_hash`, `sequence_number`, or the chain hash computation in [SIGNING.md](spec/SIGNING.md) are breaking changes requiring coordination with [CHAIN-INTEGRITY.md](spec/CHAIN-INTEGRITY.md). Both documents must stay in sync.

**Breaking changes** (e.g. removing required fields, changing types) will result in a new major version. Discuss in an issue first.

### Proposing Vocabulary Entries

The [VOCABULARY.md](spec/VOCABULARY.md) defines controlled vocabularies for `regulatory.classifications.framework`, `capability.id` patterns, and `violation_flags` codes.

1. Open an issue with the label `vocabulary`.
2. Propose the new term, definition, and usage context.
3. Include a reference (e.g. regulation, standard) if applicable.
4. Maintainers will review and add to VOCABULARY.md.

### Pull Requests

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-change`.
3. Make your changes. Ensure examples and fixtures still validate.
4. Run validation: `npm run check`
5. Update CHANGELOG.md if applicable.
6. Submit a pull request with a clear description.

---

## Validation

Before submitting:

```bash
npm run validate
npm run verify:test-vectors
```

`npm run validate` checks current examples only. Use `npm run validate:release` when preparing a frozen release snapshot.

---

## Schema evolution

- **Additive (default):** New optional fields, new enum values, new `artifact_type` values; keep `**spec_id`** `aurelianaegis.envelope.v1` and stable `**$id**` until a breaking migration.
- **Breaking:** New `**spec_id`** (e.g. `aurelianaegis.envelope.v2`), coordinated with maintainers and [CHANGELOG.md](CHANGELOG.md).

The payload `**spec_id**` identifies the spec era; the JSON Schema file evolves with additive changes without bumping `spec_id`.

---

## Questions?

Open an issue with the label `question` or email [info@aurelianaegis.io](mailto:info@aurelianaegis.io).