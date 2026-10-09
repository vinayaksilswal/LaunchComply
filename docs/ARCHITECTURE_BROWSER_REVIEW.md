# Architecture browser review — 8 October 2026

This release was reviewed through the browser. No automated test suite was run, at the user's request. The production frontend build completed successfully.

## Customer observations

- Public home, mobile navigation, deployment guide, signup required-field validation, and the returning-customer service destination were exercised.
- Live sign-in eventually opened the owner's Tech Invenso workspace after a Render service wake-up delay.
- The account showed zero application records and zero GitHub connections. No sample records were inserted into the owner's business.
- Application and architecture collection requests failed in the browser. The frontend previously removed the trailing slash before proxying to FastAPI, which uses slash-terminated collection routes. This release preserves those paths.
- Onboarding was exercised through application naming and the GitHub connection step. No repository permissions were granted and no application was submitted.

## Diagram changes

- Shared white SVG renderer for the real architecture workspace and a separate, explicitly labeled interactive example.
- Service-specific symbols, directional ports, connection highlighting, boundary groups, wrapped service labels, and diagram export.
- Existing draft components can be arranged into readable layers. Selecting a component reopens its inspector; clicking alone does not mark the draft changed.
- A services-and-sizing view lists every saved draft component and its recorded requirements, with editable requirement text. Unknown capacity remains unknown.
- Source evidence exposes actual inspected paths and recognized dependency names. It remains manifest analysis, not an assertion that every runtime call or code file has been analyzed.
- AI proposals show component additions, removals, and modifications before preview/apply. The existing provider-backed chat and versioned saving remain in place.
- The example includes proposed regions, VPCs, subnet groups, web/API traffic, persistence, job queues, and optional caching. Two-region recovery is a design example, not a verified failover configuration.

## Remaining acceptance gates

Connect an authorized repository and configure the GitHub App/AI provider before accepting actual repository analysis and AI proposal persistence. Instance sizing, region choices, network rules, IAM, recovery, costs, and live provisioning need requirements review and provider verification. The browser walkthrough exposed a Render wake-up delay; hosting availability must be resolved before offering business uptime guarantees.

## Live follow-up — 9 October 2026

- Confirmed that preserving the incoming slash alone was insufficient: the wildcard rewrite still produced a Render-origin redirect. Exact collection-root rewrites now cover applications, architecture, audit events, and deployments under both frontend API prefixes. The signed-in My apps and App design pages now load Tech Invenso's actual empty application list.
- Exercised background jobs, cache, two-region recovery, recovery component inspection, and a successful SVG download in the live public example. The example remains separate from business records.
- Fit now considers both canvas dimensions and resets the scroll position. Recovery services have distinct labels. Empty/inventory views disable graph controls, and assistant guidance distinguishes missing applications, missing analysis, permissions, and provider configuration.
- GitHub authorization still returned an unavailable response. Added a structured setup error and a support link; successful provider authorization and code-derived AI changes remain unverified.
- Submitted one explicitly labeled browser-review support request through the customer UI. It appeared in the platform operations queue, was updated to reviewing, and received a report containing the actual browser observations and remaining gates. This is a real product review record, not a security assessment or compliance certificate.
- Report publishing exposed competing enabled status controls. The parent dialog and publisher now share their busy state. Enter in the report title cannot accidentally submit a status update. Completed requests no longer display stale pending delivery estimates.
- Added no-store headers for versioned API responses. No automated test suite was run. Frontend production builds, including lint and type checks, completed successfully.
- The delivered review report was opened and downloaded from the customer Service requests page. Its recorded findings, publication time, and content checksum were visible. Keyboard selection of the recovery database component also worked.

## Multi-repository and agent follow-up — 9 October 2026

- The live Tech Invenso business asset connected to `vinayaksilswal/Techinvenso` was opened. Add repository listed each authorized source once after the backend rollout. Saving the existing selection completed and retained its source link; no unrelated repository was attached and no source was removed from the real business asset.
- Refresh code findings produced version 2 from commit `48a01983`. The evidence panel identified the backend Dockerfile, FastAPI/Python dependencies, and Next.js frontend dependencies. It reported a static sample of 40 out of 491 candidate source files; this is partial static analysis, not complete runtime discovery.
- At the desktop verification size of 1440 × 900, document and body height both remained 900 pixels. The chat composer remained inside the viewport. Source code architecture and component search controls were available. The temporary viewport override was restored afterward.
- The LangGraph/LangChain workflow compiled with its input schema on Python 3.11. Live AI requests reached the configured provider route but did not return a usable proposal. The deployed UI displayed the specific model-unavailability message, and reloading retained saved draft version 2. Successful AI responses and proposal application remain unverified; this acceptance gate is open.
- Repository editing now stays unavailable when the backend has not returned the complete link contract during a rollout. Known AI failure codes receive fixed customer messages; raw upstream/server errors remain private. No automated test suite was run.

## Architecture and delivery follow-up — 10 October 2026

- Refreshed the authorized Techinvenso asset to version 3 from its recorded repository commit `48a01983`. The bounded source sample now balances application entry files, routes, components, services and data definitions rather than prioritizing maintenance scripts. The source sample remains 40 of 491 candidates.
- Opened Source overview, selected Routes & screens, inspected its actual paths and drilled into nine inspected files. Selecting the backend auth file exposed its recorded handler names and static imports. Browser inspection found a tall-column layout and a zoom reset when details opened; compact source grids and persistent manual zoom address these issues.
- Opened System operations through the admin queue. Its live report showed 3 observed checks passed out of 12 gates. Missing live payment configuration, AWS observation identity, provisioning worker, recovery rehearsal and acceptance work remain visible. Configuration is distinguished from completed verification.
- Model routing requests `354461e2`, `fff00e62` and `7ddcb8c9` received provider HTTP 400 without a selected model. Routing now sends one configured model at a time under the same free-only, no-data-collection policy. The admin receipt for `d30fbf25` recorded a privacy exclusion (HTTP 404), rate limit (429), then access denial (403). The earlier customer message incorrectly treated every 403 as a credential failure. Model-specific access denials now continue to remaining candidates; explicit authentication, credit and content-policy blocks stop routing. Failed requests retained saved version 3 and did not fabricate an assistant answer or apply a graph. Successful AI refinement remains unverified.
- Opened the hosted deployment preparation page for the Techinvenso asset. It selected the correct repository, displayed saved version 3, marked source findings recorded and left targets, design approval, AWS access and infrastructure review incomplete. Following its next-step link reopened the correct architecture asset.
- Opened the deployment review form and verified the selected asset. No deployment review request, payment or cloud operation was submitted. The walkthrough exposed an enabled submit button while the asset list was loading; submission is now disabled until the selected asset is loaded. The saved design version and source snapshot accompany review requests and are checked again on the server.
- Customer deployment lists exclude simulated records. Legacy trigger and delivery mutations no longer fabricate provisioning, build, migration or traffic outcomes in real-business mode. Automatic provisioning remains unavailable; assisted service requests remain the supported handoff.
- Production frontend builds and Python compilation completed. No automated test suite was run.
