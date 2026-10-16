# A02: version activity is separate from architecture snapshots

## Implemented

The editor now stores conversation messages, pending AI proposals, model request
receipts/failures, AWS documentation references and design approvals in a
version-linked activity record. Tenant/application/version foreign keys and
one-record-per-version uniqueness protect this boundary. Application row locks
serialize writers. New design versions contain intent and evidence, without
these mutable activity fields. Historical legacy JSON remains untouched and is
read through a compatibility adapter; the first activity write preserves its
messages and other recorded metadata.

Current and historical API responses keep their existing shape. Applying an AI
proposal creates a new version, carries the reviewed conversation decision and
requires a fresh approval. Discard and provider failure update activity only.
Restoring history starts fresh activity without reusing an earlier approval.
Current source eligibility continues to override active approval/proposals while
historical decisions remain inspectable.

AWS documentation lookup releases its database transaction before external I/O,
then reacquires the application lock and checks current version/source freshness
and active editor membership before publication. Delayed responses cannot write
over a newer head or publish after access revocation.

## Validation so far

- Focused API/provider/migration collection: 24 passed (169.15 seconds). This
  preceded the additional activity authorization test and expanded migration
  constraint fixture; the full collection covers the final files.
- Real local browser/API journey: 1 passed (1.3 minutes including server startup):
  approve, reload, edit, open History and restore; historical approval retained,
  new current version requires approval. No intercepted API responses in this test.
- Full local API collection: **354 passed, 4 opt-in live checks skipped**
  (242.24 seconds). API, PostgreSQL and browser CI all passed at `1085c2b`:
  https://github.com/vinayaksilswal/LaunchComply/actions/runs/38857710715.
- Final focused tenant/role check: 1 passed (35.25 seconds); final populated
  migration/constraint collection: 3 passed (123.63 seconds).
- Disposable migration rehearsal includes legacy conversations/proposals and
  raw JSON/timestamps. PostgreSQL adds simultaneous idempotent approvals; both
  requests must see one identical activity decision and an unchanged snapshot.

## Remaining and rollout

At this activity checkpoint A02 remained in progress. The subsequent
[reviewed refresh slice](2026-10-16-reviewed-refresh.md) replaces that behavior.
The remaining work at this checkpoint was to:
capture base head/source epoch before analysis, release locks for provider I/O,
produce a proposal that preserves manual intent/layout/configurations, then add
review/apply/discard with stale conflicts and browser coverage. Do not mark A02
complete until that workflow passes its acceptance cases.

Migration b03c7d8e9f10 is additive and does not backfill/rewrite saved designs.
The matching API requires this migration. Keep one active writer application
version during the cutover: old binaries still write embedded legacy activity.
Downgrade refuses to discard customer conversation/approval records; recovery
requires the pre-migration backup or a forward repair. Hosted migration/revision
and live provider behavior are not verified by local tests or a Git push.

No AWS resources were created. Release gates remain unaccepted.
