# Registry

This directory contains the public registry metadata that supports the attestation envelope governance model.

- `schemas/` defines the expected shape of registry metadata files.
- `extensions/` contains extension descriptors referenced by `extension_ids`.
- `profiles/` contains profile bundle descriptors referenced by `profile_id`.
- `releases/v1.0.0/` contains the frozen registry snapshot for the `v1.0.0` release.

The envelope schema does not directly import these registry schemas. Instead, repository tooling validates the registry and checks semantic alignment between envelopes, profiles, and extensions.
