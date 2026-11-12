# Approved FDE Coach UI review, issue #151

The visuals approved in PR #152 are preserved on the combined branch. See [integration implementation and current test evidence](integration/README.md). The UI-only validation below records the original visual review.

Branch: `feat/chat-first-fde-coach`, based on main `3976ef2b02247cda10fd1ef07c7b8b22d5f9bea3`.

The welcome screen and conversation share one React island in the existing Learn Astro site. There are exactly three starter actions, a single composer, an original architecture SVG, and a compact Resources menu. The original Commons homepage is preserved byte for byte at `/commons/`. Existing courses, paths, assessments, Gym, diagrams, and continuation URLs remain available.

## Targeted polish review

Orange card, composer, and arrow accents are stronger without changing shared brand tokens. The original desktop system-design illustration is larger with clearer connectors and node outlines. Mobile introduction, starter descriptions, conversation text, resource links, and capability disclosure use larger type. A visible notice before the three starters says **Curated guidance, not personalized AI.** The composer has an accessible description of that limitation, and the same boundary remains visible during general conversation.

The existing learning routes, content, API transport, backend, and infrastructure are unchanged by this polish. No security code was copied from #150.

## Screenshots

| View | Welcome | Conversation |
| --- | --- | --- |
| Mobile, 390 x 844 | [Welcome](mobile-welcome.png) | [Conversation](mobile-conversation.png) |
| Desktop, 1440 x 1000 | [Welcome](desktop-welcome.png) | [Conversation](desktop-conversation.png) |

These are actual Chromium captures of built pages, with authored resource guidance. They do not depict generated AI answers. The referenced mockup attachment was unavailable in the task and issue. Implementation follows issue #151's written visual specification; image-specific fidelity still needs review.

## Functional boundary

- The three starters, four quick prompts, and free-text topic routing show clearly labeled, authored guidance and links to existing learning content. They make no API calls.
- Personalized chat, architecture analysis, uploads, personal learning plans, generated project rewrites, history, and persistent progress are not implemented or simulated.
- Only explicit selection of the guided lesson, or `/coach/?lesson=agent-system-design`, uses the existing `/api/coach/health`, `/start`, and `/message` protocol. Authored fallback is labeled as a written lesson. All existing principles, six stages, recap, design summary, and continuation link are rendered.
- Client requests time out after 20 seconds, never retry automatically, and can be canceled by starting a new conversation. A manual retry preserves the original token, answer, and context without adding a second learner turn. The combined branch uses PR #150's hardened server contract with stable per-operation keys, private client scopes, whole-response timeouts, immutable unresolved retry identity, validated reply acknowledgement, and explicit restart handling. See the [reviewed security integration specification](SECURITY_INTEGRATION.md) and [current implementation evidence](integration/README.md). Neither original draft is merged or modified.
- Conversations live only in component memory. No local history, analytics events, third-party requests, infrastructure, new AI endpoints, or production changes were added.

## UI-only review validation (before integration)

Passed:

- `npm test`: 82 tests across 6 files, including 21 new guidance and transport tests.
- `npm run check:worker`.
- `npm run check --prefix learn`: 0 errors, 0 warnings, 4 existing hints.
- `npm run build`: root site, Pagefind, and Learn site, 42 root pages and 148 Learn pages. Existing large-chunk warning remains.
- `npx --yes wrangler@4.160.1 deploy --dry-run --outdir /tmp/air-ui151-worker`: Worker bundle only, exited without deployment. Existing configured binding names were inspected, not contacted or changed.
- `node scripts/test-fde-coach-ui.mjs`: 26 browser checks, no JavaScript exceptions or external requests. See [machine-readable results](browser-checks.json).
- `git diff --check`.

The polish adds visible pre-action capability disclosure, accessible textbox descriptions, readable mobile text, 44px chat controls, a larger desktop illustration, keyboard-only starter activation and transcript focus, text contrast checks, and desktop reflow at a 720px CSS viewport (equivalent to 200-percent zoom on a 1440px viewport). This is viewport-based reflow coverage, not a physical-browser zoom certification.

Browser coverage includes exact 360/390/768/1440 viewport widths, no horizontal overflow, all starters and quick prompts, resource URLs, visible composer, menu Escape and focus return, IME-safe Enter, Shift+Enter, textarea growth, resized visual viewport, real local lesson protocol with no AI binding, loading, failed response, exact manual retry, complete authored lesson, reduced motion, and meaningful no-JavaScript links. The script serves built assets and the actual existing Coach handler locally, using a synthetic signing secret only.

Broader repository check limitation: the earlier plain root `npx astro check` included nested generated Learn bundles and exhausted the default Node heap. The current source-only root check, excluding generated output and dependency directories with a temporary tsconfig, completed with 308 existing errors. The same check on clean main produced exactly the same 308 diagnostic locations, codes, and messages; there were no feature-only diagnostics. These cross-project collection/type issues are outside this UI change. The scoped Learn check and Worker check pass.

Physical iOS/Android keyboards, VoiceOver/TalkBack, and Safari have not been tested. Chromium visual-viewport resizing is coverage for layout behavior, not physical-device certification. AI model execution and real Cloudflare admission are deliberately outside these local UI tests.

## Reproduce

From the repository root, install locked dependencies, run the checks and full build above, then run the browser script with Chromium available on PATH (or `CHROMIUM_BIN=/absolute/path/to/chromium`). It starts ephemeral loopback servers, blocks external browser DNS, writes the four screenshots and JSON result here, and cleans up its browser profile. No Cloudflare credentials are needed. Local browser execution requires permission to bind loopback in restricted environments.

To repeat the extra source-only root comparison, create a temporary tsconfig extending the root tsconfig. Set `include` to the repository's absolute `**/*` and `.astro/types.d.ts` paths. Exclude absolute `dist`, `learn/dist`, `lab/dist`, `node_modules`, `learn/node_modules`, and `lab/node_modules` directories. Run `npx astro check --tsconfig /tmp/your-config.json --minimumSeverity error` from this branch and a clean worktree at the base SHA. Do not change the committed tsconfig merely to hide unrelated diagnostics.

## Review boundaries

No deployment command without `--dry-run` was run. No merge, provisioning, secret update, production request, or live configuration change was performed. PR #150 and its feature worktree were left untouched. Shared AIR Worker behavior and other AIR properties have no source or configuration changes in this branch. The Learn shared layout changes are opt-in to Coach pages, apart from making the existing skip-link target focusable.
