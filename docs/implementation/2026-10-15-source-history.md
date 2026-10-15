# A02: repository changes preserve saved versions

## Implemented slice

Repository add/remove now increments the current workspace source epoch instead
of rewriting every saved Architecture JSON. No-op edits do not increment it.
Latest design reads apply source eligibility in memory, without assigning the
overlay to the ORM JSON column. Historical previews retain their recorded
approval and graph as historical evidence.

Current approval checks, source readiness, AI result publication, editor writes,
service-request attachment and the dashboard map observe the stale epoch.
Unlinking and relinking the same repository cannot reactivate an old approval.
Late AI results are rejected after source changes. Initialize/save/restore/analyze
record the new head; source analysis acknowledges the current epoch. Writers
reconcile legacy heads created since the additive migration, under the existing
application lock. Latest-version lookup remains authoritative during cutover.

## Validation

- Local full API suite: **346 passed, 4 opt-in live checks skipped** (237.26s).
  That collection preceded the additional late-AI-response test.
- Final focused source invalidation suite: **3 passed** (32.46s), including
  serialized JSON/timestamp preservation, manual configuration/layout, historical
  approval, current denial, relink/no-op behavior, viewer denial and AI race.
- Real local API/browser workflow: **1 passed**, repository removal through UI,
  current architecture warning, preserved graph and historical version. GitHub
  setup uses the explicitly test-only fixture provider; not live GitHub evidence.
- PostgreSQL adds two simultaneous repository edits against the same expected
  links: require one success, one conflict, one epoch increment and unchanged
  serialized snapshot. PostgreSQL and API CI passed at `c753cfc`.
- Initial browser CI failed because its initial cursor held the hover sidebar
  over the Source code button. Test now moves into the workspace and waits for
  normal collapse (no forced click); local rerun passed in 1.5 minutes. Final
  browser CI result remains pending.

## Remaining A02 work

This does not complete immutable history or source-refresh review. Existing
chat/proposal/reference/approval writers still embed mutable state in design
JSON. Source analysis still generates a replacement version without review and
can drop manual configurations. Move those writers to scoped records and add
review/apply/discard with head and epoch checks before marking A02 complete.

Next writer audit: `approve-design`, both chat receipt/result/failure writes,
`references`, and `discard-proposal` in architecture_workspace.py. Keep immutable
version previews on raw historical state; the current-workspace adapter must
merge separately scoped activity without dirtying the mapped snapshot. Strip
mutable fields from new design snapshots only after the adapter is deployed.
Keep existing legacy metadata available for historical display. Test proposal
apply/discard, failure/retry, restore and source invalidation through that adapter.

No AWS resources were created, no production data was manually migrated, and no
enterprise release gate is accepted by these tests.
