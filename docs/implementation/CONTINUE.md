# Continuation runbook for implementation sessions

Version 1.0, 14 October 2026. Intended for GPT-6.1 Sol or another selected model.
The current user request and applicable developer instructions override this file.

## Copy-paste continuation prompt

> Continue LaunchComply architecture development in this repository. Read
> AGENTS.md, docs/implementation/state.json and docs/implementation/CONTINUE.md.
> Use the plan in docs/implementation/README.md and implement the next eligible
> work package from WORK_PACKAGES.md against the current code. Read only the
> relevant sections of CONTRACTS.md and ACCEPTANCE.md, then inspect the actual
> affected files. Finish a tested vertical slice, preserve customer history and
> unrelated changes, and update state.json with evidence and the exact next step.
> Keep AI changes scoped and reviewable. Do not enable simulated deployment or
> claim enterprise readiness without its gate. Stay on architecture; do not fix
> the separate HRMS CORS issue or redesign marketing pages. Continue independent
> work when external credentials/budget are unavailable. Commit reviewed changes
> and push under the existing authorization when checks pass. Stop only at a
> concrete handoff, external prerequisite or session limit, with honest status.

This prompt resumes work when a session is started. It does not keep a model
running through usage limits, schedule a week of background jobs, or guarantee
seven-day completion. The user can send “continue” after a reset without repeating
the whole conversation. The saved state is the memory between sessions.

## Session algorithm

1. Read current git status/branch/HEAD, AGENTS.md and state.json. Preserve all
   unrelated dirty files; never reset or clean the workspace. Baseline 83a5d87 is
   historical, not a command to reset. New code may supersede audit findings.
2. If a task is IN_PROGRESS, read its checkpoint and resume. Otherwise choose the
   first TODO whose dependencies are DONE. BLOCKED_EXTERNAL needs a documented
   missing condition; use another independent eligible card rather than claiming
   success or repeatedly asking the same question.
3. Read that card, its acceptance cases and relevant contracts. Inspect current
   source/tests first. If the claimed gap is already fixed, prove it with evidence
   and update the card status instead of rewriting it. Do not trust old README
   capability claims over live code/provider evidence.
4. State the intended observable outcome in a short progress update. Write a
   small implementation checklist in the task checkpoint when work spans sessions.
   Resolve routine implementation choices without repeated permission questions.
5. Change the smallest coherent slice that preserves contracts. For schema changes,
   deploy additive reader/migration support before new writes. Keep UI/API paired;
   an isolated API stub or visual mock is not an implemented customer workflow.
6. Run focused meaningful checks; then the relevant release checks when the whole
   card/release warrants them. Include pytest for backend behavior and browser
   checks for interactions. Do not rerun broad suites without new cause. Negative
   authorization/preservation tests are mandatory for their affected invariants.
7. Inspect diff, remove accidental artifacts/secrets, record real results, commit
   explicit files and push if existing authorization applies. Do not stage
   `.artifacts/`, runtime databases or environment files. Deployment verification
   is separate from pushing code; record actual hosted revision when checked.
8. Update state.json and a dated evidence report. Summarize customer-visible result,
   checks, remaining limits and the next card. Never mark a gate accepted merely
   because a build passes or time is exhausted.

## First session: A01, then A02

- Inspect current pytest/Playwright fixture isolation and dependency setup. The
  current API suite forces a unique SQLite DB and DEMO_MODE=true, so it does not
  prove PostgreSQL or real AWS execution. Build a distinct PostgreSQL harness.
- Establish reproducible architecture fixtures and baseline checks; add CI with
  safe disposable services and no production credentials. Record external skips.
- After A01, reproduce the source-refresh/history preservation gaps with focused
  tests before modifying behavior. Implement A02 with minimal additive state and
  review/apply semantics; do not combine it with a renderer rewrite.

## State conventions

`state.json` is machine-readable planning state, not a server input. Keep schema
version, plan version, audited baseline, scope, release gates, ordered tasks,
dependencies, evidence, external prerequisites and handoff. The baseline commit
does not change when implementation advances; record new commits in evidence.

Allowed task statuses: TODO, IN_PROGRESS, BLOCKED_EXTERNAL, DONE. A blocking
condition and the exact evidence needed to unblock go in `checkpoint`. A card
with some code complete remains IN_PROGRESS until its acceptance is met; external
provider acceptance may instead block the card. Distinguish implemented portions
from missing live evidence in the checkpoint rather than fabricating a DONE.

Each evidence item should be an object with `kind`, `path_or_url`, `commit`,
`observed_at` and `summary`. Do not include secrets or full provider responses.
Useful kinds: test, browser, migration, provider, decision, release, customer.
For a just-created report whose commit is not yet known, record `working-tree`
temporarily and resolve the commit in the next state update; do not chase an
impossible self-referential commit hash.

Release gate statuses: NOT_ACCEPTED or ACCEPTED, with dated evidence and reviewer.
Task dependencies cannot form a cycle. A DONE task must have evidence and no
unfinished required acceptance steps. Splitting a card is allowed through explicit
substeps/checkpoint; changing dependencies requires a recorded plan decision and
updating both state and WORK_PACKAGES. Never renumber completed IDs.

## Interruption checkpoint

Before a limit or long external wait, save:

- Current task and exact completed/remaining steps.
- Modified files and any uncommitted changes, including unrelated user work.
- Last test command, outcome and evidence location; active server/job IDs if any.
- Decisions made, unresolved contract questions and external prerequisites.
- Exact next action, including a focused file/function/test target.

Do not discard partial work, repeatedly retry quota failures, leave unexplained
servers running, or say “still working for the week” after the session has ended.
If interrupted unexpectedly, the next session inspects git and tests before
assuming the last checkpoint describes current files completely.

## Token and tool efficiency

Use repository state and selected card instead of the entire chat history. Search
file/function names first, then read bounded relevant sections. Batch independent
reads and tests only when safe. Reuse unchanged evidence. Do not launch broad
parallel reviews or send customer code to another model by default. Subagent use
must follow current session instructions, not this plan's hypothetical parallelism.

For AI product tests prefer small synthetic fixtures; run a bounded live corpus
only when needed. Never repeat provider calls to polish cosmetic wording. Record
failure category so the next session does not retry a known auth/quota block.
Manual editor work can continue when free AI providers are unavailable.

## External action boundary

Repository changes, local tests and documentation are within the development
request. Actual AWS create/update/delete, load testing, paid providers, advertising,
customer messages and production data migration need the applicable explicit
scope/account/budget authority. Complete the local artifact/plan first so any
needed approval is concrete. Existing user authorization persists; do not ask
again for an already authorized action. Never treat payment or this roadmap as
approval for an unspecified infrastructure bill.

Plan documents can be revised as evidence changes. Record why, affected cards,
compatibility and test consequences. Keep the product outcome constant: trustworthy
source understanding, editable AWS intent, reviewed changes and observed results.
