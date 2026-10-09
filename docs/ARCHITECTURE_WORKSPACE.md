# Architecture workspace

Onboarding offers GitHub or an encrypted ZIP upload on one page. ZIP uploads are limited to 3 MB compressed / 25 MB expanded, 2,000 entries, 30 dependency manifests and 40 static source files. No source is executed or extracted. Environment files, private keys, dependency folders, links and traversal paths are rejected. Application uploads are capped at 25 per organization.

Analysis pins the GitHub commit or ZIP SHA-256 and stores only dependency names, module paths, static imports and entry-point symbols as evidence. Python AST imports and JavaScript syntax clues are partial static evidence; they do not prove runtime dependencies. The source sample limit and coverage are visible. Unsupported files are not claimed as analyzed.

The cloud network view uses the saved logical proposal plus customer-entered peak requests/minute, concurrent users, region and availability. Availability-zone letters, private boundaries, initial compute replicas and RDS standby symbols are proposals. No subnet addresses, instance sizes, performance results, measured costs or deployed status are invented. Multi-region recovery still requires a replication/failover plan. Logical editing and AI proposals remain available; requirements and graph changes invalidate saved design approval.

## OpenRouter in Render

Set these variables on the API service, never the frontend:

```env
ARCHITECTURE_AI_PROVIDER=openrouter
ENABLE_AI_COPILOT=true
OPENROUTER_FREE_MODELS_ONLY=true
OPENROUTER_FREE_ROUTER_FALLBACK=true
OPENROUTER_ARCHITECTURE_MODELS=thinkingmachines/inkling-small:free,thinkingmachines/inkling:free,nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-26b-a4b-it:free,google/gemma-4-31b-it:free,nvidia/nemotron-3.5-lightning:free
OPENROUTER_API_KEY=YOUR_PRIVATE_KEY
```

OpenRouter receives sanitized source evidence, the proposal, customer requirements and the last six chat messages. Raw uploaded source and credentials are not sent. Model IDs must end with `:free` or be the explicit `openrouter/free` router when free-only mode is enabled, and provider pricing is capped at zero. Provider data collection is denied. Free models can have quotas or unavailable privacy-compatible endpoints.

Application routing tries up to six preferred models in priority order, then `openrouter/free` as a final general free-pool fallback. The fallback is enabled by default and can be disabled through `OPENROUTER_FREE_ROUTER_FALLBACK=false`; an explicitly configured free router still runs last. The 85-second deadline reserves 28 seconds for that final attempt, so slow preferred attempts may exhaust their allotted time before every preferred model is tried. Per-model wall-clock deadlines prevent slow connections from using the reserved time. Each provider request names one model, so a rejected fallback envelope cannot block every candidate. Invalid or incomplete responses and model-specific access denials move to the next candidate. Prompted JSON enables free models without response-format support; every response is locally validated against the graph schema before being saved. Broken edges, extra fields and truncated responses are rejected. Explicit authentication, credit and content-policy failures stop routing immediately. All failures leave the saved design unchanged. The selected provider model is stored with the proposal for operational diagnosis. The general router cannot restore an exhausted daily account allowance or bypass provider privacy policy; explicit daily allowance errors are distinguished from unspecified rate limits.

Redeploy Render after changing the environment. A client key must not be committed or placed in a `NEXT_PUBLIC_` variable. Use a scoped replacement key for anything previously shared in chat.

## Activation and boundaries

Apply Alembic migration `ad0e4f5a6b7c` before enabling uploads. API startup initializes all ORM mappings and checks the schema. Configure the existing `ENCRYPTION_KEY` before uploads; preserve it to retain access to stored archives.

Design approval is not deployment approval. AWS connection, a costed infrastructure plan, payment and deployment execution are separate controls. This change does not implement an AWS provisioning worker or certify production readiness.

## Multiple source repositories

My business assets supports one to six authorized GitHub repositories at creation. On the Source code tab, owners/admins can add repositories together or remove links, including the final link. Removing a link never deletes GitHub code. Changes invalidate design approval and require a new source refresh. Saves use an expected link set to reject stale concurrent edits, with business-scoped authorization and audit records.

Analysis pins every source commit, namespaces file/module identities by repository, and samples up to 40 source files across repository roots and languages. Separate source workloads retain their identities; cross-repository runtime interactions remain unverified until confirmed. Public ingress and supporting services are shared planning candidates. The component finder brings a selected resource into view for complex diagrams.

## Architecture agent

The assistant runs a LangGraph StateGraph with source-context preparation, an asynchronous LangChain RunnableLambda provider stage, and PydanticOutputParser graph validation. LangChain ChatPromptTemplate constructs provider messages; existing free-only OpenRouter failover remains bounded. Missing requirements and source snapshots are recorded in a small workflow receipt. Shared checkpointers, external tracing, code execution and AWS mutation tools are disabled. Durable conversations, proposals and customer approvals remain in the business-scoped database. Schema validation does not establish deployability or cloud readiness. No new agent credential is required beyond the configured model provider.

## Recorded operations and source organization

The internal service queue links to System operations. Its launch gates observe the migration revision, hosted configuration, provider configuration and latest saved AI outcome. Configured integrations remain distinct from verified delivery. Recovery, security acceptance, payment reconciliation and actual provisioning remain open gates until supported by real delivery evidence. The legacy delivery board no longer synthesizes customer names, invoices or measured timings.

AI calls release database locks before provider I/O. The response is saved only after checking the current design version, source state, request identity and active editing membership again. Saving a different version invalidates the request identity. Approval waits for active AI requests. Provider failures record bounded categories, model IDs, timing and response status; prompts, raw provider responses, source contents and credentials are not included in routing diagnostics. The customer receives a reference matching the admin event.

System operations also provides an explicit key-access and daily-free-allowance observation using OpenRouter's read-only key endpoint. Only the HTTP status, authentication state, bounded daily request counters and checked time are returned to platform administrators. Keys, labels, balances and raw provider errors remain private. A successful key observation does not prove model permission, eligible privacy endpoints or a successful proposal. Missing allowance fields remain unknown, never zero. No completion, business source upload or configuration change occurs during this observation.

## Deployment preparation

The deployment page evaluates the selected business asset against its latest saved architecture. It reports saved source findings, traffic targets, version-specific design approval, and matching-region AWS STS verification recorded within the previous 24 hours. STS verification proves role access only; it does not prove provisioning permissions. Unknown requirements remain action items. The infrastructure and cost review remains incomplete until an actual plan review workflow is implemented.

Deployment review requests retain the selected asset and exact architecture ID. The server checks that the version is still current, then adds its source snapshot, planning targets and approval state to the operations request. A changed source or design requires a refresh before submission. This request does not approve or execute infrastructure.

The legacy deployment trigger returns an unavailable response without creating a deployment row. Simulated deployment rows are excluded from customer deployment lists. Legacy release build, migration, deployment, promotion, rollback, domain and secret mutations are disabled when `DEMO_MODE=False`, including the old GET verification route that created simulated observations. Read paths remain available. A production provisioning worker, reviewed infrastructure plan, build isolation, secret handling, verification and recovery workflow are still required before automatic delivery can be offered.

Legacy admin `/delivery/*` paths are also unavailable outside an explicit demo runtime, except the read-only recorded delivery board. Their preset preconditions, monitoring/security/readiness reports, simulated apply, testimonials and unverified reconciliation cannot be used as real customer outcomes. The old apply service independently enforces the same boundary before writing any deployment or resource. The actual service queue, provider observations and launch-readiness report remain available.

Source sampling favors entry files, routes, services and data definitions over maintenance scripts. File-area labels describe source organization, not verified runtime roles. Code diagrams group inspected files by repository and area; connection lines are resolved static imports only. Full paths in the component finder distinguish repeated filenames. The sample remains bounded and explicitly reports coverage.
