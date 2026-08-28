# Agentic System Threat-Model Template

Use this template before granting a model access to customer data or side-effecting tools.

## 1. Scope

- System/use case:
- Users and tenants:
- Data classes:
- Allowed actions:
- Prohibited actions:
- External systems:
- Model/providers:
- Deployment regions:
- Highest consequence:

## 2. Assets

List assets worth protecting:

- customer and personal data;
- source documents;
- prompts and policies;
- long-term memory;
- credentials and tokens;
- tool authority;
- approval decisions;
- workflow state;
- artifacts and citations;
- audit records;
- model/eval data;
- availability and budget.

## 3. Trust boundaries

Draw and label:

```text
user/client
→ API and identity
→ workflow/orchestrator
→ model gateway/provider
→ context/retrieval
→ tool gateway
→ internal/external systems
→ sandbox
→ telemetry/eval
→ human approval
```

For each boundary record:

- authentication;
- authorization;
- validation;
- encryption;
- data minimization;
- logging/audit;
- failure mode.

## 4. Threat inventory

| Threat | Example | Consequence | Prevent | Detect | Respond | Test |
|---|---|---|---|---|---|---|
| Direct injection | User asks to ignore policy | Unauthorized behavior | Instruction hierarchy, policy engine | Denial trace | Block/escalate | Adversarial case |
| Indirect injection | PDF asks agent to exfiltrate | Data/tool abuse | Treat content as data, least privilege | Tool proposal anomaly | Disable source/tool | Malicious fixture |
| Excessive agency | Agent can publish directly | Material unauthorized effect | Approval gate | Audit violation | Revoke capability | Policy test |
| Cross-tenant access | Wrong tenant ID in tool args | Confidentiality breach | Data-layer tenant scope | Security event | Isolate/revoke/investigate | Isolation suite |
| Memory poisoning | Untrusted claim retained | Persistent bad decisions | Governed writes/provenance | Memory anomaly | Quarantine/delete | Poison fixture |
| Tool result poisoning | Tool returns malicious text | Instruction confusion | Typed normalization | Content detector | Quarantine | Tool fixture |
| Insecure output | Generated query/code executes raw | Injection/RCE | Parameterization/sandbox | Runtime alert | Kill/revoke | Payload tests |
| Secret exposure | Token enters prompt/trace | Credential theft | Secret isolation/redaction | Secret scanner | Rotate/revoke | Canary secret test |
| Confused deputy | MCP server reuses broad token | Privilege escalation | Audience-bound tokens/consent | Auth audit | Revoke | Protocol test |
| Supply chain | Malicious tool/package/model | Compromise | Allowlist/signing/SBOM | Integrity monitoring | Disable/rollback | Dependency exercise |
| Denial of wallet | Infinite loop/tool fan-out | Cost/availability | Budgets/backpressure | Cost/loop alert | Stop/degrade | Load/adversarial test |
| Audit tampering | Edit approval history | Repudiation | Append-only audit | Integrity checks | Investigate/restore | Tamper test |

Add domain-specific threats.

## 5. Authority matrix

| Action | Model proposes | App authorizes | Human approval | Identity used | Reversible | Audit |
|---|---:|---:|---:|---|---:|---:|
| Search source | Yes | Yes | No | Scoped service/user | Yes | Yes |
| Request document | Yes | Yes | Policy-dependent | User/delegated | Partly | Yes |
| Publish packet | Yes | Yes | Yes | Publishing service + approver | Supersede | Yes |
| Final business decision | No | No | Authorized human/system only | Human | Domain-specific | Yes |

## 6. Security controls

### Identity

- OIDC/SSO;
- service/workload identities;
- delegated identity;
- short-lived tokens;
- tenant claims;
- role/attribute policy;
- revocation;
- separation of duties.

### Data

- classification;
- minimization;
- ACL filters before model access;
- encryption;
- regional storage;
- retention/deletion;
- derived-data handling;
- provider retention configuration.

### Tools

- allowlist;
- schemas;
- risk classes;
- policy checks;
- idempotency;
- rate limits;
- approval;
- sandbox;
- network egress;
- audit.

### Model/content

- instruction/data separation;
- structured outputs;
- output validation;
- source provenance;
- untrusted-content markers;
- adversarial evals;
- no ambient credentials.

### Operations

- telemetry redaction;
- security alerts;
- emergency capability disable;
- incident runbooks;
- dependency inventory;
- patch and model change management.

## 7. Abuse cases

Write at least five narratives:

```text
Given [attacker/user/content/dependency],
when [attempt],
then the system must [deny/contain/escalate],
and operators must observe [evidence].
```

## 8. Residual risk

For each accepted risk record:

- reason it cannot be eliminated;
- affected users/data;
- compensating controls;
- owner;
- review date;
- trigger to revisit.

## 9. Verification

Required evidence:

- code/architecture control;
- automated test;
- adversarial eval;
- trace/audit sample;
- incident drill;
- owner signoff for accepted residual risk.
