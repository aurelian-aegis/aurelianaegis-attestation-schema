# Zenodo DOI — Citability

This repository is configured for automatic DOI assignment via [Zenodo](https://zenodo.org/) when you publish a GitHub release. This enables proper academic and industry citation of the attestation schema.

**Release checklist (tag, DOI in `CITATION.cff`, README):** [PUBLICATION.md](PUBLICATION.md).

---

## Setup (One-Time)

### 1. Connect GitHub to Zenodo

1. Sign in to [Zenodo](https://zenodo.org/) (or create an account).
2. Go to **Account** → **Applications** → **Personal access tokens** or use **Log in with GitHub**.
3. Navigate to **GitHub** in your Zenodo profile/settings.
4. Click **Sync now** to refresh your repository list.
5. Find `aurelian-aegis/aurelianaegis-attestation-schema` and **toggle the switch to enable** Zenodo archiving.

### 2. Metadata Files (Already Configured)

The repository includes:


| File           | Purpose                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| `.zenodo.json` | Zenodo-specific metadata (creators, keywords, license, description). Zenodo uses this with highest priority. |
| `CITATION.cff` | Citation File Format for GitHub's "Cite this repository" and fallback metadata.                              |


---

## How It Works

1. **Create a GitHub release** (e.g. `v1.0.0`) with a tag and release notes.
2. **Zenodo automatically** archives the repository as a ZIP, assigns a DOI, and publishes the record.
3. **The DOI is permanent** and can be used in papers, compliance documentation, and citations.

---

## Obtaining the DOI

After your first release:

1. Go to [Zenodo](https://zenodo.org/) and check **My deposits** or the repository's Zenodo page.
2. The DOI will look like: `10.5281/zenodo.1234567`
3. **Update `CITATION.cff`** — Uncomment and fill in the `identifiers` section with your DOI:

```yaml
identifiers:
  - type: doi
    value: 10.5281/zenodo.XXXXXXX
```

1. **Add to README** — Update the "How to cite" section with the DOI and BibTeX.

---

## Testing (Optional)

Use [Zenodo Sandbox](https://sandbox.zenodo.org/) to test the integration before publishing to production. Sandbox uses a separate GitHub connection; enable your repo there first to verify metadata and archiving.

---

## Citation Example (After DOI Is Assigned)

**BibTeX:**

```bibtex
@software{aurelianaegis_attestation_schema_2026,
  author       = {AurelianAegis},
  title        = {AurelianAegis Attestation Envelope Schema},
  year         = 2026,
  publisher    = {Zenodo},
  version      = {1.0.0},
  doi          = {10.5281/zenodo.XXXXXXX},
  url          = {https://doi.org/10.5281/zenodo.XXXXXXX}
}
```

**APA:**

> AurelianAegis. (2026). *AurelianAegis Attestation Envelope Schema* (Version 1.0.0) [Computer software]. Zenodo. [https://doi.org/10.5281/zenodo.XXXXXXX](https://doi.org/10.5281/zenodo.XXXXXXX)

---

*For more details, see [Zenodo GitHub integration](https://help.zenodo.org/docs/github/).*