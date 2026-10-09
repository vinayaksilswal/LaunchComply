# Customer-owned AWS deployment

## Product sequence

1. Customer signs in to their business and connects GitHub. They install the LaunchComply GitHub App on selected repositories, then select the application repository.
2. LaunchComply analyzes the selected commit's dependency manifests. The code findings and proposed AWS architecture are separate views of a saved design.
3. Customer refines the proposal using the diagram editor and AI assistant. Proposed services, missing requirements and sizing assumptions remain visible.
4. Owner/admin reviews **App design → Services & sizing**, then confirms approval of that saved design version. A new saved version clears approval.
5. Customer connects their AWS account using a reviewed cross-account role setup. LaunchComply verifies actual temporary-role access and the expected account before recording a verified connection.
6. An isolated deployment worker builds a versioned infrastructure plan from the approved design and pinned application commit. It shows resources to create/change/delete, region, required permissions, estimated costs with assumptions, data handling and rollback limitations.
7. Customer approves that exact plan and its target AWS account. The worker rechecks membership, design/plan fingerprints and account access before executing a bounded deployment job. Editing the design or plan invalidates deployment approval.
8. The UI shows actual job events and discovered resources/endpoints. Monitoring, logs, costs and backups appear only when their providers return actual data; missing permissions and stale observations are explicit.

Saved design approval and actual STS account verification are implemented. Account setup is disabled until a real LaunchComply worker identity is configured. Verification covers role access and a bounded regional inventory snapshot; it does not verify health or deployment permissions. Deployable infrastructure generation and automatic execution are **not enabled**. Production deployment requests use the assisted operations queue. Steps 6–8 describe the intended automatic deployment workflow, not an available service.

## What the LaunchComply operator needs to set up

Customers do not install Cursor, Kiro, uv, Graphviz or MCP servers. LaunchComply's worker is the MCP client. The read-only AWS Knowledge MCP client in the API needs no AWS credentials and is enabled with `ENABLE_AWS_KNOWLEDGE=true`.

For provisioning, first establish a dedicated AWS account for LaunchComply's execution workers. It is distinct from customer accounts and does not host customer resources by default. Supply only its account ID and intended worker role ARN during configuration; never paste root credentials or long-lived access keys into chat.

A suitable hosted worker uses an AWS task role, isolated per-job storage, restricted network access and short-lived sessions. The current Render API can continue handling customer authentication, drafts and operations requests; deployment jobs should be dispatched to the AWS worker rather than giving the public API unrestricted infrastructure execution. A real authenticated job transport and verified worker identity must be configured before generating customer trust policies. Do not assume Render supplies an AWS instance role.

The customer setup template must trust the actual worker role and require a persistent, unique ExternalId per customer/account. Start with a narrowly scoped observation role. Use a separate bounded deployment role and CloudFormation execution role appropriate to the reviewed stack. Restrict `iam:PassRole`, resource scopes and session policies; do not recommend `AdministratorAccess` as a connection shortcut. Validate account identity and role assumption with the correct ExternalId, and reject trust that also allows assumption without it. Scope every stored role, application, job and observation to the business membership.

The implemented customer setup downloads a CloudFormation template only after actual platform identity verification. Customers upload it and approve the named observer role in their own AWS console, then return the role ARN. Setup verifies role assumption with the generated ExternalId and rejects trust that permits assumption without it. Existing-account discovery is read-only. Taking ownership of existing resources requires an explicit import plan and separate approval. Disconnecting removes the verified marker and inventory; customers revoke the IAM role in AWS. No provisioning jobs are started by this flow.

## Payments and service delivery

Both Stripe and Razorpay hosted checkout integrations use immutable, operations-reviewed service quotes. Customers apply first, operations reviews the request, publishes scope/deliverables/exclusions/refund terms and a tax-inclusive total, then the customer accepts the quote before checkout. Deployment quotes bind the latest approved architecture version and require a real AWS connection in the business. A changed design blocks payment for the old quote.

Payment is re-fetched from the provider and checked against the quote, amount, currency, provider reference and live/test mode. Return-page parameters never confirm payment. Signed webhook processing is idempotent. Test payments remain explicitly separate and cannot activate a paid real service. Payment does not start an infrastructure job. Operations delivers the agreed service and publishes actual reports.

See [the activation and browser acceptance guide](SERVICE_PAYMENTS_AWS_ACTIVATION.md) for environment names and provider webhook addresses. Automatic deployment, subscriptions, refunds, invoice/tax automation, full AWS pagination, CloudWatch telemetry and Cost Explorer ingestion remain outside this release. No successful payment or AWS verification has been exercised live in this release session.

## MCP deployment tools

AWS Serverless MCP offers SAM and containerized web-app deployment tools. It defaults to read-only. Write access and sensitive-data access are explicit options and must not be globally enabled in the public API. The tools are appropriate for supported serverless workloads, not every arbitrary topology.

For ECS/RDS and other non-serverless designs, select and pin a compatible infrastructure execution adapter. Choose the runtime from actual code requirements, connection lifecycle, background jobs, data persistence and approved capacity assumptions. A successful diagram render or documentation search is not a CloudFormation plan or a verified deployment.

## GitHub App activation

Import the private, Git-ignored `.env.render.github.local` into Render's backend environment, preserving existing database and encryption variables. It contains the App ID, client ID, client secret, verified app slug, callback and complete PEM key. Keep secrets off Vercel and out of Git.

Use both callback and setup URL `https://launch-comply-tau.vercel.app/onboarding/github/callback`, Contents read-only and Metadata read-only, installation by any account, no account/organization write permissions, and disabled webhooks for this release. The application explicitly handles user authorization after installation. After redeployment, connect an authorized repository through the browser and verify analysis before treating the integration as accepted.

## References

- [AWS third-party cross-account role and ExternalId guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html)
- [Official AWS Knowledge MCP](https://awslabs.github.io/mcp/servers/aws-knowledge-mcp-server)
- [AWS Serverless MCP capabilities and access options](https://awslabs.github.io/mcp/servers/aws-serverless-mcp-server)
