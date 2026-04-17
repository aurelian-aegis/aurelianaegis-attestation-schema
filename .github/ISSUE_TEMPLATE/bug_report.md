---
name: Bug Report
about: Report a schema validation bug, documentation error, or example inconsistency
title: '[Bug] '
labels: bug
assignees: ''
---

## Description

A clear description of the bug.

## spec_id

- [ ] `aurelianaegis.envelope.v1`
- [ ] Other (describe)

## Steps to Reproduce

1. 
2. 
3. 

## Expected Behavior

What should happen.

## Actual Behavior

What actually happens.

## Example

If applicable, attach a minimal attestation JSON (redact sensitive data) that fails validation.

```json

```

## Validation Command

```bash
npx ajv-cli validate -s schema/attestation-envelope.json -d <your-file>.json
```

## Environment

- OS:
- Node version (if used):
- ajv version (if used):
