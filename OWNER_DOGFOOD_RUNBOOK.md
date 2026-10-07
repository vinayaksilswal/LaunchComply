# Owner application acceptance

Use the normal customer UI/API with a new non-demo organization. Select a low-risk project and an isolated AWS environment. Hosting LaunchComply on Vercel/Render and deploying a customer project through LaunchComply are separate acceptance tests.

1. Confirm hosting readiness, PostgreSQL migration, backup/restore and the current limitations in `CURRENT_PRODUCTION_REALITY.md`.
2. Sign up through `/signup`; verify subsequent requests carry the new account's token and organization. Exercise email verification, logout/login and password reset when real delivery and UI are implemented. Do not retrieve a reset token through a production debug response.
3. Connect an owner repository through the ordinary GitHub flow. Confirm fetched repository/branch/commit matches GitHub. If the provider returns sample repositories or content, stop this acceptance step and mark **SIMULATED**.
4. Run actual source analysis. Compare detected services, ports, environment contract, database and workers with the project. Approve the generated architecture only after reviewing its boundaries, unknowns and cost assumptions.
5. Connect a role in the isolated AWS account, require a unique ExternalId, and verify STS identities and least-privilege permissions. A configured account ID or a static VERIFIED label is insufficient.
6. Review an immutable infrastructure plan. Confirm target account/region, changes, deletions and budget. Give explicit approval before applying resources; record plan checksum and approver.
7. Build and deploy the intended commit. Record actual build logs, registry URI, immutable image digest, migration result, AWS resource identities and deployment response. No simulated resource ID or exit-code-only evidence is accepted.
8. Verify the application externally: HTTPS, domain, health, database read/write and monitoring. Record timestamps and HTTP evidence.
9. Rehearse application rollback and isolated database restore. Record preserved data, recovery duration and observed gaps.
10. Run the authorized security baseline. Review findings and compliance evidence without treating readiness scores as certification.
11. Repeat for a meaningfully different architecture. Resolve generic product blockers before inviting external businesses.

| Record for each run | Value |
| --- | --- |
| Application / organization / architecture | Pending |
| Repository / branch / commit | Pending |
| Start / signup / analysis / AWS / deployment times | Pending |
| Verified provider account and resource IDs | Pending |
| Approved plan checksum / image digest | Pending |
| Domain / HTTPS / health evidence | Pending |
| Monitoring / security / restore / rollback evidence | Pending |
| Manual intervention and product blockers | Pending |
| Result | NOT_STARTED |
