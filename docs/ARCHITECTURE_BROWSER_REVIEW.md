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
