# Governance Model

This document defines how core schema and extension/profile changes are proposed, reviewed, and approved.

## Decision Process

## Core Schema Changes

- Core schema changes affect `schema/attestation-envelope.json` and verifier interoperability.
- Any potential breaking change MUST include:
  - compatibility assessment,
  - migration mapping,
  - conformance fixture updates,
  - release-note impact statement.
- Core changes require two approvals: one platform maintainer and one security/compliance reviewer.

## Extension/Profile Changes

- Extensions are proposed through `registry/extensions/*.yaml`.
- Profiles are proposed through `registry/profiles/*.yaml`.
- Extensions MAY evolve independently if they do not alter core required behavior.
- Profiles MUST reference registry extension IDs only.

## Hard Rule: Security/Compliance Fields

Security- or compliance-affecting fields MUST NOT be introduced as ad hoc extension keys. They MUST be:

- reviewed through governance gates,
- registered in extension metadata (`security_impact`),
- documented in specification/security docs,
- covered by signing and conformance tests.

## RACI / Ownership

- **Responsible:** schema maintainers for implementation and CI enforcement.
- **Accountable:** repository owners for release decisions.
- **Consulted:** security and compliance reviewers for threat, signing, and regulatory implications.
- **Informed:** integration teams consuming schema/profile registries.

## Review Gates

- Gate 1: schema validation and compatibility CI passes.
- Gate 2: registry/profile lint passes and no unresolved policy violations.
- Gate 3: conformance matrix updated for affected classes (C1/C2/C3).
- Gate 4: release notes include migration and risk impact.

## Pull Request Policy Linkage

All pull requests modifying schema, registry, profiles, signing logic, or migration behavior MUST complete `.github/pull_request_template.md`, which links back to this governance policy and `spec/VERSIONING.md`.