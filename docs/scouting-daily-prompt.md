# Daily Scouting Run (scheduled prompt)

This is the exact prompt a scheduled session runs every morning. It executes
the routine in `docs/scouting-routine.md` for all three pillars and appends
only net-new prospects. Paste this as the prompt when creating the scheduled
trigger (see "Scheduling" in `docs/scouting-routine.md`).

---

Run the daily scouting pass for The AI Runtime. Work on branch
`claude/elegant-noether-Qhlxg`.

1. Connect the Amplifiers tools (ToolSearch for
   `mcp__b6180238-bec6-4cd8-9a8c-d444def61af1__run_tool`). If they fail to
   load after a retry, stop and report.

2. Load state for dedupe. Read `docs/prospects.csv` and every
   `src/content/speakers/*.md`. Build a seen-set of normalized names (lowercase,
   trimmed) and of every `source_url` already recorded. These are OFF LIMITS:
   do not re-add or re-draft anyone already in the ledger.

3. Run all three pillars, in this order: Model Reliability Engineering for AI,
   Vertical Agents, Lessons from the Trenches for AI. For each pillar, follow
   `docs/scouting-routine.md`: seed with `search_web_grounded` /
   `search_google`, then verify the strongest leads on LinkedIn / Twitter /
   YouTube. Scope Reddit to named subreddits (r/LocalLLaMA, r/LLMDevs, r/MLOps,
   r/AI_Agents, r/AIEval), never an all-Reddit keyword search.

4. Keep it fresh, never repeat content. Set `freshness=week` (web) and
   `date_posted=last-week` / `uploadDate=this_week` on these daily runs so you
   surface people and material published since the last run. Rotate the search
   vocabulary: pick different pillar-phrase + signal-phrase combinations than
   the obvious ones, and page with `offset` when a query looks picked-over.
   Discard any hit whose name or source_url is in the seen-set from step 2.

5. Score each survivor with the rubric in the routine (out of 10). Aim for 3 to
   6 genuinely new, on-filter prospects per run. Quality over volume: if a
   pillar surfaces nothing new that passes the editorial filter, record nothing
   for it rather than padding.

6. Append only net-new rows to `docs/prospects.csv`. Start the batch with a
   comment line `# Run <YYYY-MM-DD> (daily)` and use the column order in the
   header. Quote any field containing a comma. Do not rewrite existing rows.

7. Draft outreach for the top 3 new prospects only (speaker / collaborator /
   amplifier template from the routine, brand voice, no em dashes). Put drafts
   in the run summary, not in the repo. Never send anything.

8. Commit and push. Message: `Daily scouting pass <YYYY-MM-DD>: <N> new
   prospects`. Then post a short summary: new prospects with scores and tracks,
   the 3 drafts, and anything that needs a human (identities to confirm,
   founders to vet for production specificity).

Hard rules: never auto-send outreach; never duplicate an existing prospect;
respect subreddit promo rules; keep all copy free of em dashes.
