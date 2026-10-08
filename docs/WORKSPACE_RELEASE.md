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
