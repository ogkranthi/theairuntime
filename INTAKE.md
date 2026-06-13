# Field Lab intake setup

The intake page at `/field-lab/intake` is one on-ramp with three branches:

- **problem** writes a Field Brief draft (status `Draft`, never auto-published)
- **build** writes a builder-interest record
- **partner** writes a private partner-inquiry record

Submissions post to the in-Worker `POST /api/intake`. That handler writes to
**Airtable** (the readable review queue), mirrors to the **INTAKE KV** namespace
as a durable backup, and can also mirror to a webhook. If none of those is
configured, the endpoint returns 503 and the page falls back to the per-branch
`PUBLIC_*_INTAKE_URL` links (a Tally or Google Form, or a `mailto:`).

A submission is never a publication. Every problem lands as a `Draft`; a human
completes the editor-only fields and flips status to `Open` before anything is
public.

## 1. Create the Airtable base

Create one base (for example "Field Lab intake") with three tables. Column
names must match exactly (the Worker sends these field names).

### Table: `Problems`

| Column | Type | Notes |
| --- | --- | --- |
| Status | Single select | Options: `Draft`, `Open`, `Claimed`, `Shipped`, `Featured`. New rows arrive as `Draft`. |
| Conformance | Single select | Options: `draft`, `conformant`. Arrives `draft`. |
| Provenance | Single select | `company-submitted`, `operator-sourced`. Set automatically. |
| Submitted By | Single line text | |
| Company | Single line text | Empty when an individual submitted. |
| Email | Email | Submitter contact (internal). |
| Mention Company | Single select | `yes`, `no`, `anonymized`. |
| Persona | Long text | Who has the problem. |
| AI Workflow | Long text | What the agent or copilot would do. |
| Pain (raw) | Long text | Raw pain statement. Editor splits into why-it-matters and current-workflow. |
| Inputs | Long text | One per line. |
| Outputs | Long text | One per line. |
| Example Input | Long text | Required. The cheapest conformance gate. |
| Example Output | Long text | Required. |
| Reliability Focus | Long text | Seed list, one per line. |
| Definition of Done (raw) | Long text | Editor rewrites into a falsifiable, hard-case version. |
| Data Plan | Single line text | `synthetic` by default, empty when the submitter said no. |
| Track | Single line text | |
| Failure Family | Single line text | Empty when "Not sure". |
| Scoping Call | Checkbox | Open to a 20-minute call. |
| Submitted At | Single line text | ISO timestamp. |
| Editor Todo | Long text | The editor-only fields still to complete before publishing. |
| Draft JSON | Long text | The full schema-shaped draft, for the editor to lift into a brief. |

The **Editor Todo** lists the fields a human completes in review: `id`, `title`,
`one_line`, `definition_of_done` (rewritten), `run_level`, `difficulty`,
`build_type`, `non_goals`, `evaluation_ideas`, `vertical`.

### Table: `Builders`

| Column | Type |
| --- | --- |
| Name | Single line text |
| Email | Email |
| LinkedIn | URL |
| Portfolio | URL |
| Shipped | Long text |
| Track | Single line text |
| Target | Single line text |
| Solo OK | Single line text |
| Write-up OK | Single line text |
| Subscribe | Checkbox |
| Submitted At | Single line text |

### Table: `Partners`

| Column | Type |
| --- | --- |
| Name | Single line text |
| Company | Single line text |
| Role | Single line text |
| Email | Email |
| Partner Type | Single line text |
| Contribution | Long text |
| Note | Long text |
| Submitted At | Single line text |

`typecast` is on, so single-selects accept new option values without erroring,
and checkboxes accept booleans.

## 2. Create a token

In Airtable, go to the [builder hub tokens page](https://airtable.com/create/tokens),
create a personal access token with:

- Scope: `data.records:write`
- Access: the intake base only

Copy the token (starts with `pat...`). Find the base id (`app...`) in the base
URL or via the API docs for that base.

## 3. Set the Worker variables

In the Cloudflare dashboard: Workers & Pages > the `theairuntime` Worker >
Settings > Variables and Secrets. Add as **secrets**:

- `AIRTABLE_TOKEN` = the `pat...` token
- `AIRTABLE_BASE_ID` = the `app...` base id

Optional, only if you renamed the tables:

- `AIRTABLE_PROBLEMS_TABLE`, `AIRTABLE_BUILDERS_TABLE`, `AIRTABLE_PARTNERS_TABLE`

Redeploy. New submissions now appear as rows you can triage.

## 4. (Optional) durable KV backup

To also keep a copy in Cloudflare KV, independent of Airtable:

```sh
npx wrangler kv namespace create INTAKE
```

Paste the returned id into `wrangler.toml` (uncomment the `INTAKE` block) and
redeploy. Read entries with `npx wrangler kv key list --binding INTAKE`.

## How to review a problem submission

1. A row arrives in `Problems` with Status `Draft`.
2. Read **Draft JSON** and the raw fields. Rewrite **Definition of Done** into a
   falsifiable, hard-case statement. Complete the **Editor Todo** fields.
3. Build the brief JSON in `src/content/problems/<id>.json` to the Field Brief
   Standard (see `FIELD_BRIEFS.md`), set a real `id`, `title`, `one_line`,
   `run_level`, `difficulty`, etc.
4. Flip the row Status to `Open` once the brief is published.
