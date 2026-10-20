# A03 mixed-format readers and safe editor boundary

Implemented on 20 October 2026. This is a reader rollout, not native-write or AWS deployment acceptance.

## Customer-visible behavior

- The workspace, inspector, dashboard map and source-eligibility state select the same newest v1/v2 record, ordered deterministically by creation time and ID. A newer unsupported canonical schema never silently selects an older v1 design.
- Native v2 designs are displayed read-only using canonical resource properties, positions and ordered declared connections. The full original document remains available through the saved-design inspector and the main JSON download, including pinned positions, stable IDs and opaque extension data.
- Mixed history lists v1 and v2 snapshots. Unsupported versions remain listed with preview unavailable. A failed current-version read still exposes History, so older saved versions can be inspected without overwriting the head.
- Older editor writes, source refresh, AI requests/proposal decisions, resource export, approval and restore are refused for native heads. A legacy head cannot restore a native snapshot by silently down-converting it. Existing legacy editing and restore-as-new remain supported.
- Read-only controls are disabled in the UI and enforced on the server. Native projections do not promote opaque analysis/extension data or legacy activity into runtime evidence, active proposals or deployment approval. Complete canonical exports preserve that metadata as data.
- Source invalidation reconciles to the actual native head and changes eligibility separately, leaving every original snapshot unchanged. Dashboard locations and connection previews remain saved intent, never live reachability or health.

## Validation

- Initial full local API regression: 399 passed, 9 failed, 4 opt-in live skips (218.10s). All nine failures were the isolated AST handler harness missing the new writer guard; its synthetic legacy record also lacked its explicit format. The harness now binds the real guard and uses the actual legacy format.
- Final targeted handler/mixed-history/fixture-guard collection: **19 passed** (23.04s). Mixed reader plus existing canonical/adapter collection previously passed all 37 runnable cases, with one Windows temp-directory fixture setup error; the final targeted run verifies its corrected workspace-owned test directory.
- Production frontend build, lint and type checks passed.
- Actual isolated browser/API journeys: **2 passed** (30.2s). They verify read-only controls, complete native JSON download, pinned fields/extensions, historical inspection, dashboard status and recovery from an unsupported current version. No intercepted API results or test-only HTTP endpoints.
- The browser fixture seeder refuses databases outside the existing owned Playwright SQLite path and refuses non-test environments. Config is reloaded by workers, so the runner-owned database path is inherited without regeneration. An initial failing fixture run exposed this; it was corrected and the same real workflows passed.
- PostgreSQL adds concurrent source-invalidation coverage around a native head, raw JSON/timestamp preservation and mixed history. Final API/PostgreSQL/browser CI **all passed** for commit `c9766f9`, including full API regression after the harness fix, real PostgreSQL concurrent invalidation and the complete browser suite. [CI run 39460791870](https://github.com/vinayaksilswal/LaunchComply/actions/runs/39460791870).

No data migration or bulk snapshot rewrite. No AWS action or paid model invocation. Local/browser acceptance is not hosted deployment acceptance.

## Next A03 steps

1. Add a feature-gated explicit native migration/save contract: lock tenant asset, capture expected head/source epoch, bind server identities and parent, preserve unknown extensions and stable connection IDs; append a new immutable revision.
2. Implement native mutations against canonical owners rather than saving the legacy read projection. Preserve typed connection protocol/auth/execution, target/ownership/evidence and view metadata through layout and scoped edits. Invalid or lossy old-client requests must stay rejected.
3. Restore native snapshots as new native revisions under that writer gate, with current freshness and no reusable approval. Then migrate proposal/source review, resource configuration and compiler/export consumers deliberately; never enable a partial writer by removing these guards.
4. Verify v1/native save/history/proposal/export/restore round trips and migrated-copy rehearsal before enabling writes and marking A03 complete. Follow A04 source snapshots after A03 acceptance.

A03 stays IN_PROGRESS; all release gates remain NOT_ACCEPTED. Implementation status does not establish enterprise readiness.
