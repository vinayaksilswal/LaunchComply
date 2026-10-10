# Development tool and token use

Updated 2026-10-10. This controls development work, not the customer architecture assistant's provider routing.

## Division of work

Codex owns implementation, integration decisions, review of returned suggestions, commits, and browser verification. Antigravity is available for one bounded batch of small static reviews or documentation work per development cycle. Do not send the conversation history, customer repository contents, credentials, private keys, contact details, or production logs by default. Give it only the relevant non-secret excerpts and the expected output.

The user's browser-only verification preference remains in force: do not delegate automated tests or run test suites. Production builds, type checks and Python syntax checks remain separate from user workflow verification.

## Invocation and limits

The installed CLI is `C:\Users\Admin\AppData\Local\agy\bin\agy.exe`; it is not on this shell's PATH. Cached authentication successfully served a read-only prompt on 2026-10-10. List the available models before choosing a current Flash option. Use low effort for bounded copy/static review, an explicit timeout, and JSON output for observed usage. Run from a directory without the production workspace when it only needs supplied excerpts. Never use unrestricted auto-approval or permit background deployment work.

Batch related small questions into one prompt. Request a short response and explicitly prohibit tools, file edits, commands, browsing and tests for excerpt-only reviews. Do not retry a successful call simply because its suggestions are speculative. Validate findings against the actual code before applying them. Authentication failures, quota errors and timeouts require diagnosis rather than a blind retry loop or an unapproved paid provider.

Only resume a prior conversation when it is still the same narrow task. Start a fresh task when the scope changes; do not accumulate the whole project's history. Reuse existing evidence and builds until a new code change justifies another check.

## Measured baseline

One static qualification-endpoint review used `gemini-3.8-flash-low` at low effort, returned SUCCESS in one turn, and reported 12,177 input tokens + 343 output tokens = 12,520 total. The supplied excerpt was short; harness overhead dominates this kind of call. This is evidence for batching, not a claim that every Antigravity task saves tokens or incurs no charge. No monetary cost or Google subscription entitlement was verified.

The returned enum concerns were checked against the real SQLAlchemy Enum mapping and FastAPI serialization and were not applied. No correctness issue requiring a change was established by that review. Customer workflow acceptance continues in the live browser.

A second, description-only architecture checklist review used the same Flash model and low effort: 12,882 input + 303 output = 13,185 total tokens, one successful turn. Its claims about evaluation timestamps entering graph fingerprints and source invalidation without refresh were contradicted by the implementation. Pending proposals can be applied or discarded; the export restriction deliberately prevents confusing an unsaved proposal with saved evidence. VPC endpoints do not put S3/DynamoDB service resources into customer subnets. No proposed patch was accepted from this review. Future excerpt reviews should include exact expressions when their semantics matter and remain batched because harness overhead dominates.
