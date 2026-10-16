# A02: reviewed source refresh preserves customer intent

## Delivered behavior

Source refresh captures the current head, source epoch and workspace generation
under the application lock, commits before provider I/O, and checks all three
again with current editing authority before publishing. Another edit, repository
change or newer refresh conflicts instead of overwriting work. Failed, timed-out
or cancelled analysis leaves the saved head intact and permits retry.

For an existing saved design (including an empty canvas), analysis publishes a
SOURCE_REFRESH proposal linked to the captured head and epoch. The saved graph,
evidence and configurations remain unchanged until the customer reviews and
applies it. Apply creates a new version and acknowledges the source epoch;
discard keeps the saved version. First analysis with no saved version can create
the initial draft. Pending proposals block another refresh.

Merging preserves every existing component field, ID, edge and position, resource
configuration, customer requirement and environment binding. New component IDs
are additive suggestions placed in available grid slots. Removed/renamed source
identities are retained with an explicit review notice, not silently deleted or
claimed to have current source evidence. Existing records win on ID collisions.
Unknown existing extensions remain preserved. This is a conservative merge;
it does not automatically reconfigure existing customer resources from new code.

Server Apply revalidates graph preservation, base fingerprints, configuration
identity, source epoch, current head, source access and editor role. Source
proposals stay reviewable after a repository change only for their matching
current epoch; another link change makes them ineligible. Historical approvals
remain historical evidence and the resulting version requires a new approval.

The UI shows the source snapshot, retained-component count and exact graph/resource
changes, opens the assistant panel for review, and supports preview/apply/discard.
Refresh is blocked while local changes are unsaved. ZIP uploads use the same
snapshot/activity boundary and can refresh without GitHub configuration.

## Validation at this checkpoint

- Focused editor/activity/source invalidation collection: 27 passed (38.52s).
- Final refresh collection: **16 passed** (34.03s), including duplicate-edge/configuration tamper
  coverage, including timeout,
  cancellation/retry, superseded refresh, stale source apply, empty-canvas review,
  retained bindings, VPC/storage configuration, manual edges/placement and unknown
  extensions.
- Production frontend build and its lint/type checks passed after correcting an
  introduced text encoding error in the review panel.
- Real local browser/API source workflow: initial pass (31.5s); final UI
  pass **1 passed (19.5s)** including startup,
  actual ZIP intake, manual private storage configuration, review, discard,
  refresh, apply and historical graph check. No intercepted API responses.
- Full local API collection: **367 passed, 4 opt-in live checks skipped**
  (235.29s). This collection preceded the last empty-canvas test and the upload
  capability adjustment; the final focused collection covers those changes.
  Final PostgreSQL/CI verification pending. PostgreSQL adds simultaneous
  refresh and simultaneous apply checks against real row locks, requiring one
  winner per phase and raw original snapshot preservation.

Provider doubles in API tests are explicit offline source fixtures. Local
browser ZIP intake uses actual bounded archive inspection. None proves live
GitHub availability, AWS provisioning or a deployed customer workload.

## Rollout and boundaries

Ship the matching API and frontend together; activity migration b03c7d8e9f10
from the prior slice is required. Saved versions are not rewritten. Retain old
versions and pending activity during any forward repair; do not restore an old
writer that mutates snapshot JSON. Disable new refresh entry during a recovery
rather than applying unreviewed or incompatible proposals.

A02 is not marked complete until final checks pass. R0-R4 remain unaccepted.
Canonical design v2 (A03), accurate source refs/evidence (A04-A05), richer editor
and AI controls, and supported real AWS deployment/operations are still pending.
No AWS resources or billable provider actions were created in this slice.
