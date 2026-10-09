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

Design approval is implemented. Automated account verification, deployable infrastructure generation and deployment execution are **not enabled**. Existing production requests use the assistance queue. This document describes the implementation boundary and intended sequence, not a claim that steps 5–8 already work.

## What the LaunchComply operator needs to set up

Customers do not install Cursor, Kiro, uv, Graphviz or MCP servers. LaunchComply's worker is the MCP client. The read-only AWS Knowledge MCP client in the API needs no AWS credentials and is enabled with `ENABLE_AWS_KNOWLEDGE=true`.

For provisioning, first establish a dedicated AWS account for LaunchComply's execution workers. It is distinct from customer accounts and does not host customer resources by default. Supply only its account ID and intended worker role ARN during configuration; never paste root credentials or long-lived access keys into chat.

A suitable hosted worker uses an AWS task role, isolated per-job storage, restricted network access and short-lived sessions. The current Render API can continue handling customer authentication, drafts and operations requests; deployment jobs should be dispatched to the AWS worker rather than giving the public API unrestricted infrastructure execution. A real authenticated job transport and verified worker identity must be configured before generating customer trust policies. Do not assume Render supplies an AWS instance role.

The customer setup template must trust the actual worker role and require a persistent, unique ExternalId per customer/account. Start with a narrowly scoped observation role. Use a separate bounded deployment role and CloudFormation execution role appropriate to the reviewed stack. Restrict `iam:PassRole`, resource scopes and session policies; do not recommend `AdministratorAccess` as a connection shortcut. Validate account identity and role assumption with the correct ExternalId, and reject trust that also allows assumption without it. Scope every stored role, application, job and observation to the business membership.

Customers can use a CloudFormation quick-create link after the real template and platform identity are reviewed. They approve the permissions in their own AWS console. Existing-account discovery must remain read-only; taking ownership of existing resources requires an explicit import plan and separate approval. Disconnecting stops new jobs and role use; customers retain control of role revocation in their account.

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
