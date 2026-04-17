# Controlled Vocabulary

This document defines recommended values for interoperability. SIEM and GRC tools can use these for correlation and reporting. Extensions are allowed; propose new terms via [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## 1. Regulatory Framework IDs (`regulatory.classifications.framework`)


| ID | Description | Jurisdiction |
|----|-------------|--------------|
| `eu_ai_act` | EU AI Act (Regulation 2024/1689) | EU |
| `nist_ai_rmf` | NIST AI Risk Management Framework 1.0 | US |
| `nist_csf_2` | NIST Cybersecurity Framework 2.0 | US |
| `mas_notice_2024` | MAS Notice on AI in Financial Services | Singapore |
| `fca` | UK FCA AI/ML guidance (general) | UK |
| `fca_sysc` | UK FCA SYSC — Systems and Controls for algorithmic decision-making and model risk | UK |
| `pra` | UK Prudential Regulation Authority — model risk management (SS1/23) | UK |
| `ico` | UK ICO (Information Commissioner's Office) data protection / AI | UK |
| `sox` | Sarbanes-Oxley Act — financial controls and audit trail (ITGC) | US |
| `us_eo` | US Executive Order 14110 on Safe, Secure, and Trustworthy AI | US federal |
| `sr_11_7` | US Federal Reserve / OCC SR 11-7 — Model Risk Management guidance | US federal |
| `basel_iii` | Basel III / BCBS 239 — model risk, data aggregation, and reporting | Global / BIS |
| `hipaa` | US Health Insurance Portability and Accountability Act | US |
| `fair_lending` | US Fair Lending / Equal Credit Opportunity Act (ECOA) / Fair Housing Act | US |
| `iso_42001` | ISO/IEC 42001:2023 — AI Management System standard | Global |
| `iso_27001` | ISO/IEC 27001 — Information Security Management System | Global |
| `iosco` | IOSCO Principles for the Use of AI and Machine Learning by Market Intermediaries | Global |
| `esma` | European Securities and Markets Authority — AI in financial markets guidance | EU |
| `aign_framework` | AIGN Framework for Responsible AI Governance (v1.0) | Global |

**Format:** Lowercase, underscore-separated. Avoid spaces or special characters. Propose new IDs via GitHub Issues with label `vocabulary`.

---

## 2. Regulatory Categories (`regulatory.classifications.category`)

### EU AI Act

| Category | Description |
|----------|-------------|
| `prohibited` | Annex I prohibited practices |
| `high_risk` | Annex III high-risk AI systems — **requires `annex_iii_use_case` field** (schema-enforced) |
| `limited_risk` | Article 52 transparency obligations |
| `minimal_risk` | No specific obligations |

### NIST AI RMF

| Category | Description |
|----------|-------------|
| `govern` | Govern function — policies, accountability, culture |
| `map` | Map function — context, risk identification |
| `manage` | Manage function — risk response and treatment |
| `measure` | Measure function — risk analysis and monitoring |

### FCA SYSC (UK)

| Category | Description |
|----------|-------------|
| `material_ai_system` | AI system material to regulated business — subject to SYSC 7.1 governance |
| `algorithmic_decision_making` | Automated decision-making subject to model risk controls |
| `model_risk_in_scope` | Model covered by FCA / PRA model risk management expectations |

### Basel III / SR 11-7 (US / Global)

| Category | Description |
|----------|-------------|
| `model_in_scope` | Model subject to SR 11-7 / BCBS 239 model risk management |
| `high_materiality` | High-materiality model requiring enhanced validation and oversight |
| `data_aggregation_in_scope` | Data aggregation subject to BCBS 239 reporting requirements |

### ISO 42001

| Category | Description |
|----------|-------------|
| `ai_system_in_scope` | AI system within the scope of the ISO 42001 AI Management System |
| `high_impact_use` | High-impact use case requiring enhanced risk treatment under ISO 42001 Clause 8 |
| `supplier_obligation` | Third-party AI supplier obligation under ISO 42001 Clause 8.4 |

### HIPAA (US Healthcare)

| Category | Description |
|----------|-------------|
| `phi_processing` | AI system processing Protected Health Information |
| `clinical_decision_support` | Clinical decision support subject to HHS guidance |
| `covered_entity_in_scope` | Covered entity or business associate subject to HIPAA safeguards |

---

## 3. Capability ID Pattern (`capability.id`)

**Format:** `domain.action_verb` or `domain.subdomain.action_verb`

### Domain Examples


| Domain              | Description                  |
| ------------------- | ---------------------------- |
| `finance`           | Financial operations         |
| `finance.payments`  | Payment processing           |
| `finance.approvals` | Approval workflows           |
| `data`              | Data access and manipulation |
| `data.read`         | Read operations              |
| `data.write`        | Write operations             |
| `customer`          | Customer-facing actions      |
| `hr`                | Human resources              |
| `it`                | IT operations                |


### Action Verb Examples


| Verb      | Description                      |
| --------- | -------------------------------- |
| `approve` | Approve a request or transaction |
| `execute` | Execute a transaction            |
| `read`    | Read data                        |
| `query`   | Query or search                  |
| `create`  | Create a resource                |
| `update`  | Update a resource                |
| `delete`  | Delete a resource                |


**Example:** `finance.payments.approve_payment`, `data.read.query`

---

## 4. Violation Flags (`policy.violation_flags`)

| Code | Description |
|------|-------------|
| `amount_exceeds_limit` | Transaction amount exceeds policy limit |
| `amount_exceeds_autonomous_threshold` | Amount exceeds threshold for autonomous approval — escalation required |
| `missing_approval` | Required approval not obtained |
| `geo_restriction` | Action blocked by geographic policy |
| `time_window_violation` | Outside allowed time window |
| `capability_not_authorized` | Capability not in agent passport |
| `pii_exposure_risk` | Potential PII exposure detected |
| `rate_limit_exceeded` | Rate limit exceeded |
| `trust_score_insufficient` | Agent trust score below threshold for this capability |
| `dual_control_not_satisfied` | Dual-control requirement not met — second approver required |
| `regulatory_hold` | Action held pending regulatory clearance |
| `model_drift_detected` | Governance drift detected — policy re-evaluation required |
| `shadow_ai_detected` | Unauthorized AI tool usage detected — no governance passport present |
| `data_exfiltration_risk` | Sensitive data sent or attempted to be sent to unauthorized external AI service |

**Format:** Lowercase, underscore-separated. Propose new codes via contribution process.

---

## 4a. Blocking Reasons (`outcome.blocking_reason`)

Structured reason for a denied or blocked action. Use when `policy.decision` is `deny` or `outcome.status` is `blocked`. Enables structured denial analysis, policy improvement, and regulator-facing evidence of correct enforcement.

| Value | Description | Typical Decision |
|-------|-------------|-----------------|
| `policy_violation` | One or more policy rules were violated — see `violation_flags` | deny |
| `trust_score_below_threshold` | Agent trust score insufficient for this capability at this risk tier | deny / escalate |
| `human_escalation_required` | Policy requires human review before this action can proceed | escalate |
| `dual_control_required` | High-risk action requires two separate human approvals | escalate |
| `geo_restriction` | Action blocked by geographic or jurisdictional policy | deny |
| `time_window_restriction` | Action attempted outside allowed operating window | deny |
| `rate_limit_exceeded` | Agent or capability rate limit exceeded | deny |
| `capability_not_authorized` | Capability not listed in the agent's governance passport | deny |
| `pii_exposure_blocked` | Action would expose PII in violation of data policy | deny |
| `policy_eval_timeout` | Policy evaluation timed out — action blocked by fail-safe | deny |
| `missing_approval` | Required upstream approval record not present | deny / defer |
| `shadow_ai_detected` | Shadow AI tool usage detected — actor has no registered governance passport | deny / detection |
| `unauthorized_ai_tool` | Specific unauthorized AI service identified and blocked (e.g. ChatGPT, Gemini via personal account) | deny / detection |

**Format:** Enum value from schema. Use the most specific applicable value. For shadow AI events, use `shadow_ai_detected` when the tool is not positively identified; use `unauthorized_ai_tool` when the specific service is confirmed (and populate `detection.unauthorized_tool` with the tool name).

---

## 4b. Shadow AI Detection (`detection` block)

### Detection Method (`detection.detection_method`)

| Value | Description |
|-------|-------------|
| `network_proxy` | Intercepted at network egress — action may have been pre-execution blocked |
| `dlp_scan` | Data Loss Prevention tool scanned outbound content destined for AI service |
| `endpoint_agent` | Endpoint security agent detected AI tool installation, execution, or process |
| `ueba_anomaly` | User and Entity Behaviour Analytics detected anomalous AI usage pattern (post-hoc) |
| `browser_extension` | Corporate browser extension detected access to unauthorized AI web application |
| `user_report` | Usage self-reported by employee or reported by manager |

### Data Classification Exposed (`detection.data_classification_exposed`)

| Value | Description |
|-------|-------------|
| `public` | No sensitive data involved — publicly available information only |
| `internal` | Internal-only data (not regulated, but not for external sharing) |
| `confidential` | Confidential business data (trade, client, strategic) |
| `restricted` | Highly restricted data (board materials, M&A, personal sensitive) |
| `pii` | Personally Identifiable Information subject to GDPR / CCPA / HIPAA |
| `trade_secret` | Proprietary algorithms, formulas, or business processes |
| `unknown` | Content could not be inspected (encrypted channel, endpoint gap) |

### Actor Registration Status (`actor.registration_status`)

| Value | Description |
|-------|-------------|
| `registered` | Agent has a registered governance passport — default for governed agents |
| `unregistered` | Known shadow AI tool with no governance passport (e.g. personal ChatGPT account) |
| `heuristic` | Identity determined by network/DLP heuristics — may be uncertain |

### Signer Type — Detection (`signature.signer_type`)

| Value | Description |
|-------|-------------|
| `detection` | DLP system, network proxy, UEBA platform, or endpoint agent signing a shadow AI detection event. May be post-hoc (action already completed). Distinct from `enforcement` (pre-execution SDK/Sidecar signing). |

---

## 5. Redaction Policy (`capability.redaction_policy`)


| Value                   | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| `none`                  | No redaction applied                                       |
| `hash_sensitive_only`   | Only sensitive fields hashed                               |
| `hash_all`              | All parameter values hashed                                |
| `redact_sensitive_only` | Sensitive fields redacted (e.g. replaced with placeholder) |


---

## 6. Oversight Mode (`policy.oversight_mode`)


| Value           | Description                                 |
| --------------- | ------------------------------------------- |
| `autonomous`    | No human in loop                            |
| `supervised`    | Human monitors                              |
| `human_in_loop` | Human approval required for certain actions |
| `dual_control`  | Two humans required for high-risk actions   |


---

## 7. Risk Categories (Domain Extensions — Business Outcome Governance)

Domain extensions may tag attestations with risk categories for business outcome governance. Use top-level `x-risk-category` or `x-domain-risk` (explicit schema fields in `attestation-envelope.json`). **Schema is domain-agnostic**; each domain extension defines its own labels.

### Domain-Agnostic Risk Categories (`x-risk-category`)


| Value         | Description                         | Buyer     |
| ------------- | ----------------------------------- | --------- |
| `operational` | Agents breaking business processes  | COO, CRO  |
| `cost`        | Unpredictable AI spend              | CFO       |
| `quality`     | Agent drift before customers notice | CPO       |
| `policy`      | Policy followed but outcome wrong   | CFO, COO  |
| `scope`       | Agent doing unintended things       | CISO, CRO |
| `regulatory`  | Compliance and liability            | GC, CCO   |


### Domain Risk Labels (`x-domain-risk`) — Pattern: `domain.subdomain.risk_type`


| Domain         | Examples                                                                                   | Description                  |
| -------------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| `finance.`*    | `finance.lending.default_risk`, `finance.payments.fraud_risk`, `finance.payments.aml_risk` | Finance domain risks         |
| `hr.*`         | `hr.recruitment.bias_risk`, `hr.screening.fairness_risk`                                   | HR domain risks              |
| `healthcare.*` | `healthcare.phi_risk`, `healthcare.diagnosis_accuracy_risk`                                | Healthcare domain risks      |
| `commerce.*`   | `commerce.refund.fraud_risk`, `commerce.inventory.accuracy_risk`                           | Commerce domain risks        |
| `it.*`         | `it.deployment.rollback_risk`, `it.access.privilege_risk`                                  | IT domain risks              |
| `customer.*`   | `customer.support.escalation_risk`                                                         | Customer-facing domain risks |


**Format:** Lowercase, underscore-separated. Domain extensions publish their own vocabularies.

---

## 8. Context Extensions (Business Outcome Correlation)


| Field                          | Location              | Description                                                                                                                                                 |
| ------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `context.cost`                 | context object        | CostInfo: `input_tokens`, `output_tokens`, `model_cost_usd` — CFO/COO analytics. SHOULD be populated for cost drift detection and budget forecasting.       |
| `context.business_outcome_ref` | context object        | Optional URI to join attestation with external KPIs (resolution rate, CSAT, cost per action). SHOULD be populated for policy-outcome misalignment analysis. |
| `context.trace_id`             | context object        | OpenTelemetry trace ID for distributed tracing interoperability (W3C Trace Context).                                                                        |
| `context.x-cost`               | context (alternative) | Vendor extension if `context.cost` not in schema                                                                                                            |


---

## 9. Capability Parameters (Domain-Specific)

`capability.parameters` is a domain-agnostic object. Each domain extension defines which keys to include. Examples by domain:


| Domain         | Example Keys                                        | Use Case                          |
| -------------- | --------------------------------------------------- | --------------------------------- |
| **Finance**    | `amount_usd`, `currency`, `threshold_type`          | SOX materiality, approval limits  |
| **HR**         | `candidate_id`, `role_id`, `screening_stage`        | Recruitment, bias monitoring      |
| **Healthcare** | `phi_category`, `patient_consent`, `diagnosis_code` | HIPAA, clinical decision support  |
| **Commerce**   | `order_id`, `refund_amount`, `inventory_sku`        | Refunds, inventory actions        |
| **IT**         | `resource_id`, `deployment_target`, `change_type`   | Change management, access control |
| **Customer**   | `ticket_id`, `channel`, `escalation_reason`         | Support, escalation tracking      |


**Format:** Lowercase, underscore-separated. Sensitive values MUST be redacted or hashed per `redaction_policy`.

---

## 10. EU AI Act Annex III Use Cases (`regulatory.classifications[].annex_iii_use_case`)

When `category` is `high_risk`, use one of these identifiers for Annex III mapping:


| Value                     | Annex III Entry                                    |
| ------------------------- | -------------------------------------------------- |
| `credit_scoring`          | Biometric identification, creditworthiness         |
| `recruitment`             | Employment, worker management, self-employment     |
| `law_enforcement`         | Law enforcement, migration, asylum, border control |
| `justice`                 | Administration of justice, democratic processes    |
| `critical_infrastructure` | Critical infrastructure (e.g. energy, transport)   |
| `education`               | Education and vocational training                  |
| `access_services`         | Access to essential private/public services        |
| `health`                  | Health, emergency services                         |
| `other_high_risk`         | Other Annex III use case                           |


**Format:** Lowercase, underscore-separated. Propose new values via contribution process.

---

## 11. US Federal and State Flags (Controlled Vocabulary)

### US Federal (`regulatory.flags` with `framework: "us_eo"` or `"us_federal"`)


| Flag                          | Description                             |
| ----------------------------- | --------------------------------------- |
| `eo_14110_safety_testing`     | US EO 14110 safety testing requirements |
| `eo_14110_monitoring`         | Ongoing monitoring requirements         |
| `eo_14110_incident_reporting` | AI incident reporting                   |
| `critical_infrastructure`     | Critical infrastructure designation     |


### State Flags (use `framework` for state, e.g. `colorado_sb24_205`)


| Framework           | Example Flags                              |
| ------------------- | ------------------------------------------ |
| `colorado_sb24_205` | `impact_assessment`, `disclosure_required` |
| `california`        | State-specific (extend as needed)          |


**Format:** Lowercase, underscore-separated. Reference: `https://aurelianaegis.io/schema/regulatory/us-federal#<flag>`

---

*Version: 0.2. Propose additions via GitHub Issues with label `vocabulary`.*