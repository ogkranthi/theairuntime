# API contracts

## Security envelope

All stateful Gym POSTs now require a private UUID `Idempotency-Key` header.
The session returned by start includes `accessToken`, `revision`, and absolute
`expiresAt`; message, finish, and report must send that session. Feedback must
send `sessionId` and `accessToken`. Session IDs alone grant no access. Start
requires literal `true` research consent and confidentiality acknowledgement.
Before start admission, the Worker rejects invalid or unsupported options without
spending any start quota or creating a reservation. Omitted non-consent options
keep their defaults. Legacy sessions must restart.

Start requests additionally require a private random `X-Session-Client` header
(32-128 URL-safe characters). Reuse it with the same start key and payload for
retries; generate a fresh random scope for a different client. The browser clients
keep a token made from two UUIDs in page memory. Neither a shared IP nor a reused
idempotency key grants access to another client's start credentials. The scope is
a private bearer receipt, not an account identity.

Message and finish revisions advance atomically. Exact retries reuse the original
key and JSON payload. Finish, report, and feedback are one submission per session;
changing keys does not authorize another external delivery. Changed payloads
return 409. Server time, turn limits, per-session attempts, and a shared daily
AI budget are enforced by `AI_SECURITY`. Quota exhaustion uses deterministic
fallbacks; unavailable session admission fails closed.

See [the security runbook](../security/COACH_GYM_HARDENING.md) for full retention,
retry, uncertain-delivery, deployment, and rollback behavior. The runbook takes
precedence over older stateless or mutable-KV descriptions below.


All routes are same-origin and return JSON with `cache-control: no-store`.

## POST /api/fde-gym/start

### Request

```json
{
  "mode": "mock",
  "durationMinutes": 30,
  "level": "fde",
  "drillId": null,
  "researchConsent": true,
  "confidentialityAcknowledged": true
}
```

### Response

```json
{
  "session": {
    "id": "uuid",
    "scenarioId": "counterparty-due-diligence-v1",
    "mode": "mock",
    "durationMinutes": 30,
    "level": "fde",
    "status": "active",
    "startedAt": "ISO timestamp",
    "transcript": [
      {
        "id": "turn-1",
        "role": "interviewer",
        "content": "candidate-visible opening",
        "atSeconds": 0
      }
    ],
    "graph": { "nodes": [], "edges": [], "revision": 0 },
    "revisions": [],
    "revealedFactIds": [],
    "coverage": {}
  },
  "charter": "broad candidate-visible charter",
  "degraded": false
}
```

## POST /api/fde-gym/message

### Request

```json
{
  "session": {},
  "candidateMessage": "I want to understand who owns the final decision.",
  "graph": {
    "nodes": [],
    "edges": [],
    "revision": 1
  },
  "elapsedSeconds": 187,
  "requestHint": false
}
```

### Response

```json
{
  "session": {},
  "interviewerMessage": "For this scenario, ...",
  "phase": "discovery",
  "shouldEnd": false,
  "degraded": false
}
```

## POST /api/fde-gym/finish

### Request

```json
{
  "session": {},
  "graph": {},
  "elapsedSeconds": 1710
}
```

### Response

```json
{
  "session": {},
  "summary": {
    "verdict": "BORDERLINE PASS",
    "score": 68,
    "targetLevel": "fde",
    "strongest": {
      "label": "Architecture and decomposition",
      "reason": "..."
    },
    "biggestGap": {
      "label": "Action safety",
      "reason": "..."
    },
    "interviewerNote": "...",
    "barRelative": {
      "foundations": "PASS",
      "fde": "BORDERLINE PASS",
      "senior": "NOT YET"
    }
  }
}
```

`INCOMPLETE ASSESSMENT` is a valid verdict when critical coverage is missing.

## POST /api/fde-gym/report

A successful response confirms provider acceptance, not inbox delivery. The
client requires `ok: true` and `emailed: true` or `webhookDelivered: true` before
showing "REPORT REQUEST ACCEPTED" with delivery still unconfirmed. Unknown,
pending, malformed, or negative outcomes stay in the error state and cannot
trigger another external delivery.

### Request

```json
{
  "session": {},
  "email": "candidate@example.com",
  "subscribe": true
}
```

### Response

```json
{
  "ok": true,
  "subscribed": true,
  "emailed": true
}
```

The full report stays server-side until this route. The immediate result must
not contain all detailed competency evidence or reference architectures. This
route requires the canonical completed session in `FDE_GYM_SESSIONS` KV.

## POST /api/fde-gym/feedback

### Request

```json
{
  "sessionId": "uuid",
  "realismComparedToChatGPT": 5,
  "wouldReturnTomorrow": true,
  "comments": "The reliability follow-up felt realistic."
}
```

### Response

```json
{ "ok": true }
```

## GET /api/fde-gym/health

Returns configuration presence only. It never returns model names, keys, email
addresses, or stored content.

```json
{
  "ok": true,
  "aiConfigured": true,
  "retentionConfigured": true,
  "emailConfigured": true
}
```
