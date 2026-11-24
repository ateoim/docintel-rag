import type { DocumentSource } from './types';

export const SAMPLE_DOCUMENTS: DocumentSource[] = [
  {
    id: 'doc-apra-cps234',
    title: 'APRA CPS 234 Information Security Standard Brief',
    filename: 'apra-cps-234-compliance-brief.md',
    category: 'Regulatory',
    uploadedAt: '2026-09-14',
    active: true,
    isSample: true,
    metadata: {
      author: 'Risk & Regulatory Compliance',
      jurisdiction: 'Australia (APRA)',
      effectiveDate: '2026-07-01',
      version: 'Rev 4.2',
    },
    content: `# APRA CPS 234 Information Security Standard Brief

## 1. Regulatory Scope and Board Accountability
Prudential Standard CPS 234 mandates that all APRA-regulated entities maintain an information security capability commensurate with the size and extent of threats to their information assets. The Board of Directors is ultimately responsible for information security across the enterprise and must ensure the entity maintains a clearly defined information security policy framework aligned with its operational risk appetite.

The Board must receive formal information security assurance reporting at least quarterly, including material control deficiencies, penetration testing remediation timelines, and third-party exposure metrics. Delegating day-to-day operational oversight to the CISO or Chief Risk Officer does not absolve the Board of accountability under APRA supervision.

## 2. Information Asset Classification and Control Capability
APRA-regulated entities must classify all information assets, including those managed by related parties and third-party providers, by criticality and sensitivity. Classification registers must be reviewed at least annually and updated within 15 business days of any material architectural change or new cloud workload deployment.

Controls protecting critical payment ledgers, customer identity stores, and settlement gateways must align with ISO 27001 and ACSC Essential Eight Maturity Level Two as a baseline. Privileged access to production infrastructure must enforce phishing-resistant multi-factor authentication, just-in-time elevation, and immutable audit logging retained for a minimum of 7 years in Australian sovereign storage (AWS ap-southeast-2).

## 3. Third-Party and Supply Chain Security
Where information assets are managed by a third-party provider or SaaS vendor, the entity must evaluate the design and operating effectiveness of the third party's information security controls prior to onboarding and annually thereafter. Acceptable assurance artifacts include an independent SOC 2 Type II report, ISO 27001 certification covering the in-scope services, and annual CREST-accredited penetration test summaries.

Contracts with material service providers must incorporate explicit right-to-audit clauses, mandatory subprocessor disclosure with 30 days' written notice, and clear incident escalation obligations. Under CPS 230 operational risk alignment, concentration risk across critical cloud vendors must be assessed semi-annually by the Risk Committee.

## 4. Mandatory APRA Incident Notification Windows
Under Paragraph 35 of CPS 234, an APRA-regulated entity must notify APRA as soon as possible and, in any case, no later than 72 hours after becoming aware of a material information security incident. A material incident includes any event that materially affects or has the potential to materially affect, financially or non-financially, the entity or the interests of depositors, policyholders, beneficiaries, or other customers, or any event notified to another regulator such as OAIC or ASIC.

In addition, under Paragraph 36, the entity must notify APRA as soon as possible and no later than 10 business days after becoming aware of a material information security control weakness which the entity expects it will not be able to remediate in a timely manner. Failure to meet notification deadlines may trigger supervisory action, enforceable undertakings, or capital add-ons imposed by APRA.

## 5. Testing, Internal Audit, and Incident Response
The entity must maintain documented incident response plans and conduct tabletop cyber resilience exercises at least annually, including executive crisis decision-making and external regulator communications. Systematic vulnerability scanning must run weekly across external perimeters and monthly across internal workloads, with critical CVSS 9.0+ vulnerabilities patched within 72 hours.

Internal Audit must review the design and operating effectiveness of information security controls, including those maintained by related parties and third parties, on an annual audit cycle. Audit personnel conducting the assurance review must possess specialist information security competence and report findings directly to the Board Audit Committee without management filtering.`,
  },
  {
    id: 'doc-melbourne-fintech-q3',
    title: 'Melbourne FinTech Q3 2026 Board Report',
    filename: 'southern-cross-fintech-q3-2026-board-report.md',
    category: 'Financial',
    uploadedAt: '2026-10-08',
    active: true,
    isSample: true,
    metadata: {
      author: 'Office of the CFO & COO',
      jurisdiction: 'Victoria, Australia',
      effectiveDate: '2026-09-30',
      version: 'Board Pack v1.0',
    },
    content: `# Southern Cross FinTech Pty Ltd — Q3 2026 Board Report

## 1. Executive Financial Performance
Southern Cross FinTech closed Q3 2026 (ended 30 September 2026) with Annual Recurring Revenue (ARR) of AUD 42.8 million, representing 28.4% year-on-year growth and exceeding the Board operating plan by AUD 1.9 million. Quarterly recognised revenue reached AUD 10.6 million, with gross margin improving by 210 basis points to 76.4% following database tier optimisation in AWS ap-southeast-2.

Net Revenue Retention (NRR) stood at 114.2% across the 68 institutional banking and wealth-management clients in Melbourne and Sydney. Annualised logo churn remained low at 2.8%, though two mid-market superannuation accounts flagged pricing pressure ahead of Q4 contract renewals representing AUD 1.4 million in combined ARR.

## 2. Cash Position, Burn Rate, and Capital Allocation
Cash and short-term term deposits totalled AUD 31.5 million at quarter-end, providing 26 months of operational runway at the current net monthly burn rate of AUD 620,000. Operating expenditure was AUD 9.1 million for the quarter, 4.2% above forecast primarily due to accelerated cloud compute spending (AUD 410,000 variance) from AI document-extraction workloads and external CPS 234 readiness advisory fees (AUD 185,000).

Management requests Board approval to reallocate AUD 1.2 million from Q4 marketing reserves into platform reliability engineering and sovereign AI inference capacity. Without this reallocation, peak end-of-quarter settlement batch latency risks breaching the 99.95% availability SLA committed in our tier-one banking agreements.

## 3. Product Delivery and Enterprise AI Adoption
The Automated Lending & Document Intelligence module reached general availability in August 2026 and is now deployed across 19 institutional customers, contributing AUD 4.6 million in expansion ARR. Average loan-pack underwriting turnaround dropped from 4.5 business days to 11 hours, with human-in-the-loop review catching 100% of low-confidence extraction flags.

Platform uptime across Q3 was 99.97%, exceeding the 99.95% contractual threshold. However, on 19 August 2026, a third-party identity provider outage caused a 22-minute degraded login window for Sydney enterprise tenants. No customer data was exposed, and the incident did not meet the APRA CPS 234 material incident threshold, though a formal post-incident review was delivered to three tier-one bank clients within 5 business days.

## 4. Regulatory, Risk, and Compliance Posture
Internal Audit completed its Q3 CPS 234 control effectiveness review on 22 September 2026. Of 44 tested controls, 41 passed without exception and 3 medium-severity findings were raised regarding subprocessor evidence currency and automated log-retention verification. All three findings are scheduled for full remediation by 15 November 2026 and do not constitute an un-remediable control weakness requiring 10-business-day APRA notification.

ASIC and OAIC regulatory horizon scanning highlights heightened scrutiny on automated credit decision explainability and Privacy Act 1988 statutory tort reforms expected to take effect in 2027. Legal and Risk are updating customer Master SaaS agreements to tighten AI output disclaimers and cap consequential loss exposure.

## 5. Q4 2026 Strategic Priorities and Board Resolutions
Management's priorities for Q4 2026 are: (1) closing AUD 5.4 million in late-stage enterprise pipeline across three ASX-listed financial institutions; (2) completing SOC 2 Type II surveillance audit with zero qualified exceptions; and (3) enforcing FinOps guardrails to bring monthly AI inference spend under AUD 190,000 per month while maintaining sub-2-second p95 query latency.`,
  },
  {
    id: 'doc-cloud-ai-governance',
    title: 'Enterprise Cloud Governance & AI Policy',
    filename: 'enterprise-cloud-governance-ai-policy.md',
    category: 'Governance',
    uploadedAt: '2026-08-29',
    active: true,
    isSample: true,
    metadata: {
      author: 'Architecture & AI Governance Council',
      jurisdiction: 'Australia',
      effectiveDate: '2026-09-01',
      version: 'Policy v3.1',
    },
    content: `# Enterprise Cloud Governance & AI Policy

## 1. Policy Purpose and Applicability
This policy establishes mandatory technical, security, and risk-governance controls for all cloud infrastructure and artificial intelligence systems operated by Southern Cross FinTech Pty Ltd. It applies to all personnel, contractors, engineering teams, and third-party providers building, fine-tuning, or deploying workloads that process corporate or customer data.

All production cloud workloads and AI pipelines must align with APRA CPS 234, ISO 27001, the Privacy Act 1988 (Cth), and the NIST AI RMF lifecycle controls. Exceptions require formal written sign-off from both the CISO and Chief Risk Officer and expire automatically after 90 calendar days.

## 2. Cloud Architecture and Australian Data Sovereignty
All customer personally identifiable information (PII), financial transaction records, and vector embeddings derived from customer documents must reside exclusively within Australian sovereign cloud regions (AWS ap-southeast-2 in Sydney or approved Melbourne availability zones). Offshore transfer or cross-region replication of production customer datasets is strictly prohibited without prior Legal and OAIC privacy impact assessment approval.

Data at rest must be encrypted using AES-256 with customer-managed keys (CMK) rotated at least annually, and data in transit must enforce TLS 1.3. Infrastructure-as-Code templates must pass automated policy-as-code checks before deployment, blocking public storage buckets, wildcard IAM policies, or unencrypted EBS volumes.

## 3. Generative AI and RAG Grounding Controls
Engineering teams must not transmit confidential, regulated, or customer-identifiable data to unapproved third-party or public generative AI endpoints that retain prompts for foundation-model training. Only enterprise-contracted inference endpoints with zero-data-retention guarantees or VPC-hosted models are permitted for production workloads.

All Retrieval-Augmented Generation (RAG) applications supporting legal, compliance, or credit workflows must implement verifiable source-citation binding, deterministic retrieval diagnostics, and explicit confidence thresholds. To mitigate model hallucination risk, high-stakes automated outputs affecting customer eligibility, regulatory filings, or contractual commitments must enforce human-in-the-loop sign-off prior to external release.

## 4. Model Risk Management and Drift Monitoring
Every production machine learning or LLM-backed service must be registered in the Enterprise Model Inventory with an assigned business owner, risk tier (Tier 1 High, Tier 2 Medium, Tier 3 Low), evaluation benchmark suite, and fallback deterministic mode. Tier 1 models must undergo independent validation before launch and semi-annual red-teaming for prompt injection, data exfiltration, and bias.

Platform Engineering must monitor production retrieval precision, citation faithfulness, and model drift continuously. If grounding faithfulness falls below 95% or p95 latency exceeds 3.5 seconds for more than 15 minutes, automated circuit breakers must alert Security Operations and degrade gracefully to extractive-only retrieval.

## 5. FinOps, Access Governance, and Policy Review
Every cloud account and AI inference API key must be scoped to a dedicated cost-centre tag with automated budget alerts at 75%, 90%, and 100% of monthly allocation. Static long-lived API credentials are prohibited in source repositories; secrets must be injected via short-lived OIDC federation or managed secrets vaults.

This policy is subject to annual review by the AI Governance Council and Chief Risk Officer, with interim updates triggered within 30 days of material APRA, ASIC, or OAIC regulatory guidance.`,
  },
  {
    id: 'doc-master-saas-agreement',
    title: 'Master SaaS Vendor Agreement',
    filename: 'master-saas-vendor-agreement-aurelia.md',
    category: 'Legal',
    uploadedAt: '2026-07-19',
    active: true,
    isSample: true,
    metadata: {
      author: 'Commercial Legal Counsel',
      jurisdiction: 'Victoria, Australia',
      effectiveDate: '2026-08-01',
      version: 'Executed v2.4',
    },
    content: `# Master SaaS Vendor Agreement — Aurelia Cloud Systems Pty Ltd

## 1. Parties, Term, and Subscription Scope
This Master SaaS Vendor Agreement ("Agreement") is entered into between Southern Cross FinTech Pty Ltd ("Customer") and Aurelia Cloud Systems Pty Ltd ("Vendor"), a company incorporated in Victoria, Australia. The initial subscription term is 36 months commencing 1 August 2026, with an annual platform license fee of AUD 480,000 payable quarterly in advance.

Unless either party provides at least 90 calendar days' written notice prior to the end of the initial term, this Agreement automatically renews for successive 12-month periods with annual fee increases capped at the lesser of Australian CPI or 4.0%.

## 2. Service Level Agreement (SLA) and Service Credits
The Vendor warrants that the production SaaS platform will achieve a minimum Monthly Uptime Percentage of 99.95%, excluding scheduled maintenance windows notified at least 7 business days in advance. Critical Severity-1 outages must receive an initial engineering response within 30 minutes and continuous remediation updates every 2 hours until resolved.

If Monthly Uptime falls below 99.95% in any calendar month, the Customer is entitled to service credits equal to 10% of the monthly fee for uptime between 99.50% and 99.94%, and 25% of the monthly fee for uptime below 99.50%. Three consecutive months of SLA breach below 99.50% constitutes a material breach granting the Customer the right to terminate for cause without early termination penalty and receive a pro-rata refund of prepaid unused fees.

## 3. Data Ownership, Sovereignty, and Security Obligations
All Customer Data, including uploaded documents, derived indexes, and query audit logs, remains the sole property of the Customer. The Vendor must store and process all Customer Data exclusively within AWS ap-southeast-2 (Sydney, Australia) and is strictly prohibited from using Customer Data to train or fine-tune shared AI or machine learning models.

The Vendor shall maintain ISO 27001 certification and an unqualified SOC 2 Type II report throughout the Term and provide copies to the Customer annually at no charge. The Vendor must notify the Customer in writing within 24 hours of confirming any security incident or unauthorized access affecting Customer Data, enabling the Customer to meet its 72-hour APRA CPS 234 and Privacy Act 1988 notification obligations.

## 4. Subprocessors and Right to Audit
The Vendor must maintain an up-to-date subprocessor register and provide at least 30 days' written notice before onboarding any new subprocessor that handles Customer Data. If the Customer reasonably objects on security or APRA regulatory grounds and the Vendor cannot provide a compliant alternative within 30 days, the Customer may terminate the affected services without penalty.

The Customer, its internal auditors, and APRA (or its appointed representatives) shall have the right to audit the Vendor's security controls, facilities, and compliance records once annually upon 15 business days' notice, or immediately following a confirmed security incident.

## 5. Liability Cap, Indemnities, and Termination
Except for excluded claims, each party's aggregate cumulative liability under this Agreement is capped at 12 months of fees paid or payable in the preceding year (AUD 480,000), and neither party is liable for indirect or consequential loss.

However, the liability cap does not apply — resulting in uncapped liability — to: (a) Vendor's breach of confidentiality or data sovereignty obligations; (b) third-party intellectual property infringement indemnification; (c) wilful misconduct or gross negligence; and (d) statutory fines arising directly from Vendor's breach of its security obligations causing a notifiable data breach. Upon termination, the Vendor must export all Customer Data in structured JSON/CSV format within 15 business days and cryptographically erase all copies within 30 days. This Agreement is governed by the laws of Victoria, Australia.`,
  },
];
