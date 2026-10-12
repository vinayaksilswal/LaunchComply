# Customer workspace and operations delivery

Customers connect their business account, choose an application repository through GitHub, and request deployment help, security assessments, or compliance preparation. Service work follows **Apply → Review → Work in progress → Published report**. Submissions and reports are real database records, scoped to the customer's business. No scanning, certification, or cloud deployment is implied by submitting a request.

## Register the GitHub App

1. Open [GitHub App registration](https://github.com/settings/apps/new). Use a unique app name such as LaunchComply.
2. Homepage: `https://launch-comply-tau.vercel.app`.
3. Callback URL **and Setup URL**: `https://launch-comply-tau.vercel.app/onboarding/github/callback`.
4. Leave **Request user authorization during installation** unchecked. LaunchComply starts explicit authorization when the customer clicks Connect GitHub. After installing, customers authorize again so the backend verifies their accessible installations and repositories.
5. Disable webhooks for this release. Repository permissions: **Contents: Read-only** and the automatically included **Metadata: Read-only**. No write, organization, or account permissions are needed.
6. Permit installation by other GitHub accounts if serving external businesses. Let each customer select repositories during installation.
7. Create a client secret. Generate a private key in the app settings and keep the downloaded PEM private.

Set these in **Render → Environment**, never in public frontend variables or Git:

| Variable | Value |
|---|---|
| `GITHUB_APP_ID` | Numeric app ID |
| `GITHUB_APP_SLUG` | Slug in `github.com/apps/<slug>` |
| `GITHUB_CLIENT_ID` | App client ID |
| `GITHUB_CLIENT_SECRET` | Generated client secret |
| `GITHUB_CALLBACK_URL` | The callback URL above |
| `GITHUB_APP_PRIVATE_KEY` | Complete PEM private key, including headers and newlines |

The private key is required for manifest analysis. The backend obtains a short-lived installation token restricted to the selected repository and read-only contents. OAuth state is one-use, expiring, and bound to the user and business. The user token is not stored.

[GitHub registration documentation](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)

## Architecture workspace

The white graph editor loads persisted drafts for an authorized application. Analysis reads a bounded set of dependency manifests at a pinned commit. It stores paths, blob hashes, and dependency names rather than raw code, environment files, or scripts. Dependency findings are distinct from the proposed cloud diagram. Inferred connections and hosting choices are proposals requiring review; they are not verified runtime topology.

Dragging, renaming, adding, or removing components is saved as a new draft version. Stale edits are rejected instead of overwriting a newer draft. Export downloads the actual diagram and evidence as JSON.

Optional AI chat requires these private Render variables:

```
OPENAI_API_KEY=<private API key>
ENABLE_AI_COPILOT=true
ARCHITECTURE_AI_MODEL=gpt-4.1-mini
```

Chat sends the normalized evidence, current diagram, and recent conversation to the configured OpenAI provider with `store=false`. A validated proposal is previewed and explicitly applied to a new draft version. Chat cannot deploy, run code, change IAM, or invent verified cloud health. Without configuration, it stays unavailable.

Optional official AWS references use `ENABLE_AWS_KNOWLEDGE=true` in Render. The read-only AWS Knowledge MCP integration retrieves real documentation sources for recognized services in the saved graph; it does not validate deployment readiness. See [AWS architecture MCP integration](AWS_ARCHITECTURE_MCP.md) for limits, privacy, and browser acceptance steps. The retired AWS Diagram MCP package is not used.

## Daily operations

The explicitly authorized existing owner account has database-backed platform admin access. Sign in with that account and open `/platform-admin`.

1. Review **Requested** items in the business service queue.
2. Open a request; confirm the customer's business, app, desired outcome, scope, and required authorization.
3. Update status and add an operations note. Coordinate delivery with the customer through your established support process; this release does not send automated emails.
4. Perform the actual agreed assessment, deployment work, or compliance preparation.
5. Publish the real report in the request panel. Publishing saves an immutable report with a content checksum, records an audit event, and marks the request delivered.
6. Customers view and download the report from the relevant service page or Service requests. The checksum identifies content integrity; it is not an assessor's digital signature or a certification.

Assessment and compliance requests cannot be marked delivered or closed without a published report. Customer owners/admins can submit requests; business members can read their business's requests and reports. Internal operations access is separate from tenant owner/admin roles.

## Deployment and current integration boundaries

The customer-owned AWS sequence is documented in [Customer AWS deployment](CUSTOMER_AWS_DEPLOYMENT.md): GitHub → design refinement → saved-version design approval → verified customer AWS role → reviewed infrastructure plan → separate deployment approval. Customers do not install MCP clients. LaunchComply needs a real worker identity before issuing customer trust templates; the legacy simulated onboarding adapters are blocked outside explicitly enabled demo/development/test environments.

- Vercel root directory: `apps/web`; `BACKEND_URL=https://launchcomply.onrender.com`.
- Render Docker root directory: `apps/api`; Dockerfile: `Dockerfile`; database variable: `DATABASE_URL`.
- Hosted deployments require `DEMO_MODE=false`, `DEBUG=false`, PostgreSQL, strong independent JWT/encryption secrets, and the actual Vercel origin in `BACKEND_CORS_ORIGINS`.
- Startup migrations are additive. With a single Render instance, use `MIGRATE_ON_STARTUP=true`. For multiple instances, run a separate migration job before startup.
- AWS monitoring, runtime cloud logs, billing ingestion, recovery drills, scanner execution, automated infrastructure provisioning, and automatic certification delivery are **not verified live integrations in this release**. The customer UI shows recorded data or a connection-required state and routes assistance requests to operations. Setting a feature flag alone does not make a simulated adapter real.
- Render Free can sleep after inactivity. The client waits for database readiness before authentication and does not retry account creation. Always-on hosting and live provider acceptance tests are still required before committing business availability guarantees.

## Release verification

Backend tests use a new isolated SQLite database and cannot drop production tables. Migration tests check both clean installs and preservation of existing users. Browser fixtures are limited to localhost and use fresh test businesses. They exercise customer routes, mobile layout, identity, request submission, operator publishing, report reading, and rejected internal access.

Live readiness tests use GET requests only against the deployed API and frontend proxy. Local contract tests with provider fixtures prove request handling and isolation; they do not prove an external GitHub, OpenAI, or AWS account is configured correctly.

## Remaining production acceptance gates

Before selling an automated deployment, monitoring, or compliance guarantee, verify actual GitHub authorization and manifest analysis, configure and verify the AI provider, replace simulated AWS/scanner/provisioning adapters, validate restores against isolated cloud resources, and establish always-on hosting, alerts, rate limits, secret rotation, and a documented recovery process. Security assessments require an agreed scope and explicit customer authorization; compliance preparation does not constitute certification.

Local browser coverage targets desktop and mobile Chrome. Safari could not be run on this Windows host because application control blocked required WebKit libraries. Run Safari acceptance on a supported runner before promising browser compatibility.


## Public website and customer experience release

The public navigation now has dedicated Architecture, Deployment, Security, VAPT, Compliance, Services, and Pricing pages. Getting started includes six guides, with separate About, Contact, Cloud operations, and live platform status pages. Illustrations are labelled as illustrations. Unverified uptime, scan quotas, certified-staff claims, readiness scores, subscription prices, free trials, and automatic provisioning claims have been removed from the public site.

Service calls to action preserve their destination through sign-up and sign-in. Return paths are limited to customer workspace and onboarding routes. Onboarding requires an authenticated account. Forms remain disabled until their client handlers are ready; failed sign-up submissions are not automatically replayed. Existing users can accept a team invitation through sign-in, and the backend checks that the signed-in email matches its recipient before granting membership. A failed invitation does not consume the token.

The customer home shows recent actual service requests and published reports. Navigation, account identity, white panels, visible keyboard focus, mobile menus, and missing-page recovery share a consistent design. Native dialogs keep background content inert, contain keyboard focus, restore the trigger on dismissal, and protect busy submissions from accidental dismissal.

Validation on the production build: 24 configuration checks; 50 desktop/mobile Chrome browser scenarios, including public link crawling, guides and 404s, sign-up, selected-service sign-in, team invitations, authorization boundaries, actual local request delivery, report viewing, download content/checksum, and keyboard focus. A navigation race in the test was corrected to wait for the sign-in page before entering credentials; both browser versions of that scenario passed on rerun. The full backend suite passed 206 tests with 4 live-only checks skipped in the isolated run. No customer accounts, service requests, assessments, or cloud resources were created in production during these tests.

These tests validate the application workflow, not an external provider integration or a formal security/compliance certification. The remaining production acceptance gates above still apply.


## 2026-10-11 — architecture history, request flows and business controls

Saved architecture history is scoped to each business asset. Preview preserves saved coordinates; restoring creates a new revision, clears design approval and retains all prior versions. Stale latest-version IDs reject concurrent restores. No infrastructure actions are executed.

The editable canvas includes larger cards, AWS/region/VPC/subnet boundaries, numbered orthogonal paths and a Request flows inspector. Inferred connections use dashed paths; source context and declared intent stay distinct from runtime verification. AI transition checks preserve workload identity during ordinary refinements and reject direct frontend-to-private-backend/data routes, ingress bypass and support services in request paths. Invalid OpenRouter proposals continue through the bounded free-model fallback. WAF remains an ingress association, not a VPC bridge. The supplied PeopleStrong diagram is a visual reference only and is not copied as this customer's topology.

Public frontend containers, private backend/data services and private managed S3 gateway access are explicit local planning choices. Environment connection mapping accepts names and declared destinations/protocols only; credential values are discarded locally. Workload capacity estimates require customer-supplied throughput, and are planning estimates requiring benchmarks.

Team management adds one-time email-bound invitations, scoped role changes, contact details, invitation revocation and soft membership removal. Owner/self membership changes are blocked. Invitation email delivery is not claimed. Settings edits business/profile names with stale-name checks. Security and compliance are separate direct workflows; asset links retain scope; duplicate Business tabs and service promotion panels are removed while customer requests/reports remain available. Explicit logout returns to the landing page.

Readiness displays tracked mapped-control completion, current evidence/reviews/tests, remaining reasons and 30-second visible-page refresh. Missing controls are not complete; changing implementation invalidates previous review dates. Final compliance review intake rechecks non-empty 100% tracked readiness on the server. Scope/preparation help remains possible before 100%. The score is not full framework coverage, an audit opinion or certification. Automated evidence collection, independent assessment and AWS provisioning remain separate acceptance work.

Validation: frontend production build, TypeScript and lint passed (105 routes); changed Python modules syntax-compiled; whitespace diff check passed. No automated test suite executed per the requested manual-review workflow. Live browser acceptance will be recorded after deployment.

Signed-in production review on 2026-10-11: History listed v1–v10, v8 preview loaded its saved graph, current-version restore was disabled and older-version restore was available. No arbitrary older version was restored. Request flows search selected the existing PostgreSQL dependency and preserved its inferred evidence label. The floating assistant expanded/minimized through one control and keyboard move/resize changed its bounds. Team invitation email/role inputs and member contact details loaded; the owner had no role/removal controls. No invitations or membership changes were created. Customer service records remained visible without promotional panels; direct Settings loaded editable business/profile fields without changing their values.

The business had no readiness templates configured. Opening the readiness program initialized mapped templates and displayed 0/15 tracked SOC 2 controls (0%), with an actual remaining-requirements list and final-review application disabled. No controls, evidence or assessments were marked complete. Framework scope/preparation inputs were reviewed without submitting a request.

Live review exposed SPA naming missing from frontend classification and sidebar hover expansion moving link positions. Follow-up fixes classify SPA/static frontend workloads consistently across secure traffic controls, environment mapping and AI transition checks; AI refinements must retain this workspace's required public frontend container placement. Static delivery proposals are not mislabelled as source evidence. Sidebar rows retain their vertical positions during expansion. Restoring a version selects its saved coordinates rather than an automatically arranged presentation. These are planning/editor changes; actual AWS runtime access remains unverified.

The deployed SPA fix detected all four Techinvenso frontends. The customer's requested public frontend/private API pattern was applied and saved as v11, preserving v10 in History. Undo/redo was exercised before saving. The plan retains PostgreSQL/Redis dependency signals, routes browser calls through HTTPS API ingress, separates web ingress, removes support traffic arrows and adds private S3 endpoint access. No AWS resources were provisioned and no invented traffic targets were saved. An S3 candidate named `S3 · confirm bucket/endpoints` revealed an overly broad endpoint exclusion; storage controls now exclude actual S3 endpoint services, not a bucket whose name mentions endpoint decisions.

Live AI explanation requests completed while keeping v11's 15 nodes, 16 edges and coordinates unchanged. The first explanation contained inaccurate regional/global terminology and inherited old sizing suggestions; instructions now explicitly prioritize the current graph, regional ALB origins and proposed configuration, and forbid numeric capacity guesses without measurements. A corrective explanation retained the public frontend/private API and endpoint topology, distinguished customer intent from inferred dependencies and listed implementation decisions. AI text still requires engineering review. Traffic/concurrency inputs accepted typing; temporary values were cleared without saving. One-click Team and Compliance navigation reached their respective pages after sidebar stabilization. History retained v10 with its actual preview and restore action available.

Final visual review identified aligned connections crossing an intermediate resource card. Orthogonal routing now considers bounded five-segment detours above/below obstacles, preserving original graph endpoints and avoiding the appearance of an extra service connection. Production build, lint and types passed after the routing change.


## 2026-10-11 � private API proxy and centralized service intake

The secure traffic planner now offers an explicit frontend-server proxy pattern: browser -> public web ingress -> public-tier frontend hosting server -> internal HTTPS ALB -> private backend -> isolated data or a private S3 endpoint. It reuses the dedicated API ingress, removes its public DNS/CDN route, retains workload identities and dependency evidence, and separates internal ingress from private compute. The alternative authenticated public API entry remains an explicit choice. Request flows show the server/browser distinction; frontend environment mapping distinguishes browser-visible and server-only keys and rejects browser access to internal ingress. AI instructions and transition checks preserve the selected pattern.

The supplied PeopleStrong SVG was visually inspected as a reference. AWS documentation confirms the internet-facing web load balancer -> web servers -> internal load balancer -> application servers pattern. WAF is an ingress association, not a private network bridge. Frontend hosting containers need an actual path-allowlisted proxy/BFF implementation, identity handling, TLS validation and timeout limits before this plan can work. No proxy code was added to the customer's connected repositories and no AWS resources were created. Monitoring, recovery and compliance checks list implementation and acceptance evidence rather than claiming a service card proves deployment.

Service requests is the sole dashboard intake page. Its searchable list covers all 11 supported service codes and retains customer request history, replies and reports below it. Other customer modules retain their operational controls and contextual navigation but no longer embed service application forms. Deployment intake loads the selected asset's current saved design and attaches its immutable review snapshot; failures block submission and provide reload. Final compliance review is offered here only after non-empty 100% tracked readiness, with the existing fresh server-side gate. Preparation/custom framework requests remain available earlier. No request, assessment, payment or client contact is created by viewing these controls.

Validation: the production build generated 105 routes and passed lint/types; a final TypeScript check and changed-Python syntax review passed. No automated test suite was run. Vercel reported the main release successful. Signed-in production review found all 11 service choices and the unchanged three-request history. Deployment intake attached Techinvenso v11, then LaunchComply v2 after changing the asset. The custom framework field accepted typing and enabled submission; final review remained disabled at actual 0% readiness. Forms were closed without creating requests. Security, Compliance and Deployments retained their controls/history without embedded application forms.

The requested server-proxy plan was applied and saved as v12 with 15 nodes and 15 paths, retaining v11 in History. Request flows showed the four frontend-server-to-internal-ALB paths and no public DNS/CDN-to-API route. Sample key names were checked locally without saving: browser-visible NEXT_PUBLIC_API_URL excluded internal ingress, while explicitly server-only SERVER_API_URL offered it. No credentials, traffic targets, readiness results or AWS settings were fabricated or saved during review.


The first v12 AI explanation returned an incomplete provider proposal; the graph remained unchanged. Explicit explain-and-preserve requests now use a bounded text/question schema and keep the exact graph on the server, avoiding output tokens spent reproducing every node and position. Obsolete chat history is omitted for this read-only mode. Topology edits continue to require the full validated graph and request-path policy. Server-proxy environment labels also respect the existing 80-character edge bound while retaining legacy receipt removal. Changed Python syntax and whitespace checks passed. Live follow-up is recorded after the backend release.


Follow-up provider diagnostics recorded preferred-model privacy-filter, rate-limit and access-denied failures; the final general free router returned HTTP 200 but failed response validation twice. Saved v12 remained unchanged. The general free router now requests the actual JSON schema with require_parameters so it selects endpoints supporting structured outputs, as documented by OpenRouter. Preferred-model compatibility, zero-price limits, data_collection=deny, request deadlines and server validation remain in place. The system prompt no longer conflicts with the read-only response schema. Python syntax and whitespace checks passed. This is a routing correction, not proof of successful live AI acceptance.

The service catalog passed signed-in mobile review at 390 by 844 and desktop review at 1440 by 1000: all 11 choices were present, no horizontal clipping was observed, and the history anchor reached the existing records. No service application was submitted during verification.


## 2026-10-11 - service cards and detail windows

The central Service requests catalog now presents all 11 supported services as responsive cards. Each card opens a service-specific detail dialog with scope and required input guidance, then an Apply action opens the existing application form in the same dialog. Back to details preserves typed requirements and selected assets. Members may read service details; application submission remains limited to owners/admins. Existing history, report links, deployment snapshot lookup and final compliance readiness gates are retained. No application forms were added elsewhere.

Validation: production build generated 105 routes and passed lint/types; TypeScript and whitespace checks passed. No automated test suite run. Signed-in production interaction and responsive review follow deployment.


Signed-in production acceptance completed on 2026-10-12 after Vercel reported deployment 2ecb421 successful. All 11 cards were present; Deployment review opened its service-specific scope and Apply action, which opened the existing form in the same modal and loaded saved design v12. Returning to details retained the business-wide asset choice and typed scope (visually verified). The custom compliance framework field also retained its input after returning from details. No request was submitted. Mobile review at 390 by 844 showed the full detail dialog and Apply button, all 11 cards and no horizontal overflow. The history link reached the unchanged three existing request records. Final compliance review remained disabled at actual 0% readiness. Temporary inputs were cleared by reloading the catalog.


## 2026-10-12 - AWS scaling and SaaS deployment planning

Reviewed the supplied network SVG and current official AWS ECS, ALB, reliability and SaaS Lens documentation (see ARCHITECTURE_PLANNING.md). Added versioned customer-declared ECS workload policies: min/max tasks, metric/target, cooldowns, deployment strategy and connected ALB HTTPS port/health path. Settings now has Scaling & load balancing; Services & sizing lists each workload plan or missing decisions, and saved policies appear as diagram annotations without duplicating source components. Planning review and LangGraph context include scaling, target group, release, AZ and tenant-isolation gaps. No policies, ports, capacity values or AWS services are invented or provisioned.

Backend validation bounds fields and checks actual workload/ALB graph references; incompatible blue/green ALB-request scaling is rejected. Traffic edits preserve policies, stale policies are flagged, and benchmark estimates beyond maximum capacity require review. A capability flag prevents policy saves against an older API that could discard new fields. Approval/history behavior and workload/source IDs are retained.

Validation: production build generated 105 routes and passed lint/types; final types/lint and changed Python syntax passed. Direct local validation accepted a valid policy and rejected inverted task bounds, CPU above 100%, incompatible blue/green request scaling, missing health path and a URL in the health path. Disconnected ALB references, unplanned workloads and benchmark estimates exceeding max tasks were flagged. No automated test suite ran and no production policy or AWS resource was created for testing. Customer targets: 500 peak requests/minute and 100 concurrent users, India/Mumbai with a multi-AZ plan. Signed-in release verification and saving those actual targets follow deployment.


Live follow-up found obsolete S3/static-hosting text inherited inside frontend source-context descriptions despite the selected public container/proxy pattern. Secure-traffic planning now writes idempotent proposed runtime descriptions, points to retained component identities and structured source findings, and explains the actual CloudFront -> public web ALB origin. It no longer nests earlier deployment descriptions or truncates their repeated text into contradictory hosting claims. TypeScript, targeted lint and whitespace checks passed. Reapplying this customer-selected pattern is reviewed before saving; previous descriptions remain in history.
