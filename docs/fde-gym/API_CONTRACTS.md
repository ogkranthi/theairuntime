# API contracts

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
