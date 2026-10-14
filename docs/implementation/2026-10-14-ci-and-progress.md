# A01 acceptance and visible request tracker

14 October 2026.

The first CI run at `6b422bc` passed API and browser jobs but failed PostgreSQL
schema comparison. Actual logs identified an extra duplicate experiment-name
unique constraint and four naive timestamp columns left by historical migrations.

Commit `97918cc` adds a forward reconciliation: retain the unique index before
removing the duplicate constraint, and convert the four UTC-written timestamps
with explicit `AT TIME ZONE 'UTC'`. No production migration was run manually.
Local migration checks passed (2 tests). The subsequent fresh Linux checkout
passed all three jobs, including populated PostgreSQL migration, drift comparison,
API tenant/history tests and real row-lock checks:

https://github.com/vinayaksilswal/LaunchComply/actions/runs/38552779669

A01 is now DONE. This is baseline acceptance, not acceptance of R1–R4 or actual
AWS/customer deployment. A02 remains next and has not been implemented this turn.

Added PROGRESS.md at the user's request: a side-panel checklist of historical
requests, new business/customer goals, engineering work packages and retained
strikethrough completion. Existing partially implemented features remain open
until their complete workflows are verified. The user's delivery-model preference
is pending; no sales/intake workflow was changed on an assumed answer.
