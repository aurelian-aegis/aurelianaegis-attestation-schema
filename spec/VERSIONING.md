# Versioning Policy

This document defines compatibility rules for `aurelianaegis.envelope.v1` and how schema releases are versioned.

## SemVer Rules

- `MAJOR`: breaking changes to core schema behavior or verifier expectations.
- `MINOR`: additive, backward-compatible changes (new optional fields, new enum values when explicitly allowed by verifier mode, new docs, new registries).
- `PATCH`: clarifications, typo fixes, CI/docs/test improvements, and non-behavioral metadata updates.

## Breaking Change Checklist

A change is **breaking** if any answer is "yes":

- Does it remove or rename an existing core field?
- Does it make a previously optional core field required?
- Does it tighten a type/pattern/range so a previously valid payload becomes invalid?
- Does it remove supported enum values used by existing emitters?
- Does it change signature verification or signed-field semantics in a non-additive way?
- Does it alter conformance behavior from pass/partial to fail for existing payloads?

## Additive vs Breaking Examples

### Additive (MINOR)

- Add new optional field `extensions` at root with namespace validation.
- Add optional `profile_id` and `extension_ids`.
- Add optional `schema_url` to support schema identity references.

### Breaking (MAJOR)

- Rename `admissibility_event_id` to `token_event_id`.
- Require `profile_id` for every receipt.
- Narrow `tenant_id` pattern so previously valid IDs fail.

### Clarification / Non-behavioral (PATCH)

- Improve wording in `spec/SIGNING.md` without changing algorithm steps.
- Add CI checks and extra fixtures with no schema constraints changed.
- Fix documentation examples and changelog classifications.

## Verifier Compatibility Expectations

- `MAJOR` upgrade:
  - Existing verifiers MUST reject payloads claiming an unsupported major core version.
  - Producers MUST coordinate upgrade window and publish migration notes.
- `MINOR` upgrade:
  - Existing verifiers SHOULD accept payloads if unknown optional fields are ignored safely.
  - If verifier enforces strict profiles/extensions, unknown profile handling MUST follow `spec/SPECIFICATION.md`.
- `PATCH` upgrade:
  - No payload compatibility change is expected.
  - Existing verifiers SHOULD behave identically.

## Release Mapping

- Core compatibility is governed by this document and enforced in CI via `scripts/check-compatibility.js`.
- Migration notes for each breaking release MUST be captured in the corresponding release notes and changelog entry.