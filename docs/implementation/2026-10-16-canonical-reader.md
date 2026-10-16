# A03: canonical reader, stable identity and saved-design inspection

## Delivered slice

A pure strict v2 read contract separates resource intent, workloads, connections,
view state and analysis/compatibility metadata. The bounded schema retains the
current 80-resource/160-declared-connection editor limits; typed configuration
references are separately derived, never arbitrary permission arrows. Resource
properties use the existing strict configuration union and frozen compiler
logical-ID function. Known account/region/environment scope conflicts, invalid
property references, missing workload/sizing/binding identities and forged
capability claims are rejected. Unknown legacy flows keep unknown protocol,
caller, TLS and authentication; application-layer cards do not prove execution.

The pure v1 adapter keeps IDs, labels, descriptions, positions, edge order and
multiplicity, explicit property-field presence, requirements, evidence and unknown
legacy metadata. Legacy connection IDs derive deterministically from the saved
revision ID plus original edge index. Configuration references have stable IDs
from their property owner. Unknown metadata is retained in the versioned
launchcomply.legacy extension and never compiled or hashed as executable intent.
A reverse projection reconstructs and re-adapts the whole document; any field
that would disappear causes a fixed unsupported-conversion error. No saved
snapshot is rewritten, and no fake persisted source-snapshot IDs are invented.

Semantic identity excludes revision IDs, timestamps, activity, resource display
labels and coordinates. Layout identity covers display/order/positions separately.
Artifact-input identity additionally binds tenant/asset/environment and explicit
compiler/policy versions. It is **not** an actual deployment artifact digest,
cloud receipt or approval. Existing version-specific design approval is unchanged;
actual artifact approval remains future C03-C05 work.

Tenant-scoped canonical/schema endpoints serve current or explicit historical
versions with an expected-head guard. The editor's Services & sizing section and
History preview expose an inspect/download dialog using TypeScript generated from
the checked-in JSON schema. The browser can download the actual canonical JSON,
compare layout versus infrastructure intent, and inspect an old version. Direct
native POST requests remain denied without parsing an executable design body.
Current v1 editing, source review, exports and history remain compatible.

## Compatibility matrix

| Input | Canonical reader | Legacy projection | Native writes |
| --- | --- | --- | --- |
| Supported repository-draft-v1/configuration schema 1 | Pure projection; original unchanged | Exact supported round-trip, including duplicate edges | Existing compatible editor only |
| Canonical schema 2 | Strict read with server-owned identity binding | Only if the whole document round-trips losslessly | Disabled |
| Canonical-only pinned/native fields or new extensions | Preserved by v2 model | Explicit rejection instead of field loss | Disabled |
| Future format/schema or resource schema | Actionable unsupported response | No silent fallback/down-conversion | Disabled |

The normal workspace head/history/render/write paths still require migration for
persisted native v2 designs. Canonical reads do not complete that cutover. The
new format is not yet a customer import/provisioning interface.

## Validation

- Full local API collection: **397 passed, 4 opt-in live checks skipped** (155.01s).
  It preceded the final frozen-golden and extra dangling-reference cases.
- Final focused contract/API collection: **32 passed** (23.57s), covering exact
  legacy round-trip, compiler SHA/logical-ID golden fixture, duplicate connections,
  semantic/layout/input identity, unsupported schemas, bounded/duplicate-key JSON,
  native-write gate, tenant/viewer denial and raw history preservation.
- Import isolation test confirms the reader loads without settings, database or
  HTTP provider modules. No environment/secret reads are part of this adapter.
- Production frontend build, lint and type checks passed.
- Real local browser/API journey: **1 passed** (22.2s including startup): inspect,
  download/read actual JSON, move/rename, compare identities and inspect History.
  No intercepted API/provider responses in that workflow.
- PostgreSQL extends the real concurrent-approval test with a canonical read and
  raw original snapshot preservation. Final CI pending at this checkpoint.

Shared artifacts: fixtures/architecture/design-v2.schema.json,
fixtures/architecture/canonical-v2-golden.json and generated canonical-types.ts.
Regenerate schema/types using python -m scripts.generate_design_contract from
apps/api. The golden compiler fixture changes only with a reviewed compatibility
and compiler/policy identity decision.

## Exact next A03 work

1. Migrate normal workspace latest/history/output and restore paths to read both
   persisted formats without treating an older v1 version as a newer native head.
2. Add explicit gated native writers with server-owned revision/tenant identity,
   expected head/source epoch, stable connection IDs and extension preservation.
3. Migrate editor/proposal/source/configuration/export consumers to canonical
   ownership; old clients must fail visibly when they cannot preserve native data.
4. Verify mixed populated history and the full v2 save/review/export/restore
   workflow before enabling writes or marking A03 complete. Read support ships
   before that writer switch; keep v1 records and disable writes on faults.

A03 stays IN_PROGRESS. No database migration, AWS action or paid model call was
performed. Hosted frontend/backend delivery and release gates remain unaccepted
by these local/CI implementation checks.
