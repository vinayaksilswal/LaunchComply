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
OPENROUTER_ARCHITECTURE_MODELS=thinkingmachines/inkling-small:free,thinkingmachines/inkling:free,nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-26b-a4b-it:free,google/gemma-4-31b-it:free,nvidia/nemotron-3.5-lightning:free
OPENROUTER_API_KEY=YOUR_PRIVATE_KEY
```

OpenRouter receives sanitized source evidence, the proposal, customer requirements and the last six chat messages. Raw uploaded source and credentials are not sent. Model IDs must end with `:free` when free-only mode is enabled, and provider pricing is capped at zero. Provider data collection is denied. Free models can have quotas or unavailable privacy-compatible endpoints.

Native model fallback handles provider errors. Invalid or incomplete successful responses trigger bounded application retries (three requests, 85 seconds overall). Prompted JSON enables free models without response-format support; every response is locally validated against the graph schema before being saved. Broken edges, extra fields and truncated responses are rejected. All failures leave the saved design unchanged. The selected provider model is stored with the proposal for operational diagnosis.

Redeploy Render after changing the environment. A client key must not be committed or placed in a `NEXT_PUBLIC_` variable. Use a scoped replacement key for anything previously shared in chat.

## Activation and boundaries

Apply Alembic migration `ad0e4f5a6b7c` before enabling uploads. API startup initializes all ORM mappings and checks the schema. Configure the existing `ENCRYPTION_KEY` before uploads; preserve it to retain access to stored archives.

Design approval is not deployment approval. AWS connection, a costed infrastructure plan, payment and deployment execution are separate controls. This change does not implement an AWS provisioning worker or certify production readiness.
