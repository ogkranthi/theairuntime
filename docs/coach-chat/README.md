# Bounded personalized FDE Coach beta

PR A, stacked on `feat/integrate-coach-security` at `a8424849b524ebdd22dca3c6f2cf31784ce12f8f`, implements issue #154's conversation engine. Both flags default off. Nothing is merged, deployed, provisioned, or collected from real learners.

## Conversation behavior

The approved Astro/React chat remains one interface with the same three starters, branding, illustration, colors, and learning routes. A starter now opens goal-specific intake when the build flag is enabled and the server admits the beta. Intake is authored and labeled; it does not pretend a model ran. Each subsequent learner turn invokes Workers AI for an actual contextual response. A free-form first question uses the same scoped start handshake, then goes directly to inference without showing a fake intake answer.

The model receives the selected goal, a bounded recent exchange, exact learner-evidence profile facts, the previous task, and 2-3 lexically retrieved curriculum excerpts. It can explain concepts, examine the learner's own engineering decision, identify up to two gaps supported by quoted evidence, and propose one realistic task with an observable definition of done. It asks at most one focused question, without using the six-stage lesson as a pretend general assistant. Profile updates must quote the current learner message exactly. They are signed and stay scoped to that chat. There is no saved profile or cross-device history feature.

Interview coaching always offers an explicit Gym reference when relevant to the selected goal. It does not start a Gym session, request research consent, or claim a graded mock. The existing guided lesson remains available through its existing route.

General model text is labeled **AI guidance**. Canonical references show exact versioned excerpts behind a native disclosure; they do not certify that every model statement is supported by the curriculum. Missing models, unavailable quota, invalid model output, prompt-size overflow, and provider timeouts use an explicitly labeled authored fallback with useful existing resources. Disabling the beta retains the curated experience.

## Bounds and security

- `/api/coach-chat/health`, `/start`, and `/message` form a separate chat flow using the same Worker, KV replay cache, SQLite coordinator, and private scoped receipts as #153.
- Chat has 10 learner turns, 20 physical attempts, and a fixed one-hour lifetime. Legacy Coach stays at 12 turns/14 attempts; Gym stays at 40 turns/82 attempts. All share the same atomic 500-attempt UTC-day pool and shared start limits of 200/day and 12/IP/hour.
- Start is pure validation followed by admission, with no AI call. Every physical primary or fallback invocation reserves one durable slot before model execution. There are at most two slots per operation. The same checked shared model client handles the existing primary and fallback models.
- Per call: 900 generated tokens; 12,000 UTF-8 bytes of composed prompt; at most four recent messages of 700 characters each; current learner message at most 2,000 characters; three profile facts of at most 180 characters each; prior task at most 240 characters. No tokenizer-exact input billing cap is claimed. Oversized context uses a deterministic fallback, not another summarization call.
- Provider waits are 4.5 seconds each, at most two attempts. A timeout does not refund quota or cancel platform work already invoked. Late provider results are ignored. If a grant response arrives after the trusted per-call deadline, its reserved quota remains spent but the provider is never invoked from that late grant. The existing client deadline still covers the full response at 20 seconds; the coordinator lease is still 120 seconds with no takeover or renewal.
- Exact body/key/scope identity survives interruptions. Responses are validated before UI acknowledgement, stale generations cannot apply, explicit reset abandons the old client, and blocked/expired sessions cannot be revived with a new key.
- Chat tokens use a domain-separated HMAC with the existing signing secret. They cannot be adopted as six-stage lesson tokens. Signed tokens are bearer credentials, not encryption or an account identity. Do not log or put them in URLs.
- Models have no tools, browsing, code execution, email, subscriptions, permission changes, or database authority. All references are selected from the local catalog; generated URLs, HTML, unsupported evidence, multiple questions, common unsupported action/score claims, and obviously unsafe instructions are rejected or use authored fallback. These checks do not prove semantic correctness or complete jailbreak resistance.

## Curriculum and versions

`node scripts/build-coach-catalog.mjs` extracts 22 canonical public resources from existing modules, case studies, career/path pages, and Gym. The committed catalog includes original source hashes and a deterministic retrieval version. Root `npm run build` regenerates it; tests reject stale output. Lexical retrieval selects 2-3 excerpts with no vector store or framework. The browser test checks every URL against built assets.

Prompt version: `fde-mentor-v1`. Primary: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, overridable with server-only `FDE_COACH_CHAT_MODEL`. Existing fallback: `@cf/meta/llama-3.1-8b-instruct-fast`. Model IDs do not pin provider weights or prove current plan availability. Real model evaluation is a release gate before enablement or a model change.

## Privacy

No raw transcript is logged, stored in the coordinator, or saved as an evaluation dataset. Only the current request and bounded history are sent transiently to Workers AI. The app does not opt learners into provider training or export conversations. Cloudflare processing/retention terms still require owner review; no provider-wide no-retention promise is made.

The existing KV replay mechanism retains generated chat responses and concise signed profile/task state until the chat's original one-hour expiry. This can include quoted or reflected learner input. It is a recovery cache, not a permanent conversation or prompt cache. The six-stage lesson keeps its existing three-hour recovery window. Physical expiry/backup behavior is separate from immediate server deadline checks. Reset discards client credentials/context but does not retroactively erase spent reservations or the short-lived cache.

Server-only cache metadata is limited to template ID, model name when known, prompt/retrieval versions, resource IDs, physical granted-attempt count, latency, provider-reported token count and completeness when available, outcome, and coarse error category. There is no raw question, answer, exception text, email, or learner profile in that metadata. DO storage remains IDs/hashes/revisions/counters/deadlines/pointers only. Metadata is not a public endpoint or dashboard.

The UI explains processing, replay retention, absence of long-term history, and independent consent. Obvious contact/credential formats are rejected before mutation. This is a narrow filter, not comprehensive DLP: learners must use fictional/non-sensitive material. Capture is hard-off, health reports `captureEnabled:false`, and there is no share button or contribution endpoint. PR B contains only synthetic evaluation work and a held private-capture design. D1 and real-data capture require separate approval.

## Evidence

- 254 tests across 16 files, including actual local SQLite admission, chat/legacy/Gym final-slot concurrency, fallback accounting, lost commits, replay, scope isolation, token/protocol rejection, turn/session expiry, privacy defaults, output/source/evidence validation, UTF-8 budget and timeout behavior, and preview isolation.
- Worker and Learn checks pass; Learn has zero errors/warnings and four existing hints. Additional focused backend/test/preview TypeScript check passes.
- Full root/Pagefind/Learn build passes, with 42 root pages and 148 Learn pages. Existing build notices remain.
- Wrangler dry run passes; no deploy command without `--dry-run` was run.
- [Beta browser evidence](screenshots/browser-checks.json): 17 checks across 360/390/768/1440 widths, contextual fixture turns, tasks, privacy, canonical URLs, retries, reset, honest fallback, keyboard/IME/reduced motion.
- [Legacy browser evidence](legacy-browser/browser-checks.json): 33 inherited checks with the public beta flag off.
- Gym report UI: all nine local uncertainty/acceptance scenarios pass.

[Example conversations](EXAMPLES.md) and [model evaluation status](MODEL_EVALUATION.md) distinguish synthetic fixtures from actual inference. [Release instructions](RELEASE.md) describe approval gates and isolated configuration. No physical Android/iOS, Safari, or device screen-reader test was available. Existing broad-root Astro diagnostic limitations remain as documented in #153; scoped checks pass.
