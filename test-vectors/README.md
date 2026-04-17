# Test Vectors

This directory contains conformance and interoperability fixtures for the current specification.

- Top-level vector files are the current fixtures validated by repository scripts.
- `conformance/` contains C1/C2/C3 conformance-class fixtures.
- `keys/` contains TEST-ONLY key material for interoperability checks.
- `releases/v1.0.0/` contains the frozen vector set for the `v1.0.0` release snapshot.

Production systems MUST use real enforcement keys and MUST NOT reuse any key material from this directory outside testing.
