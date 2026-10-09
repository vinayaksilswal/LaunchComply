# AWS documentation and architecture diagrams

LaunchComply keeps one saved architecture graph for each authorized application. The graph, its repository dependency evidence, and explicitly applied AI proposals stay in the customer's business workspace. The SVG download is generated from that same graph; it is a design artifact, not proof of deployed AWS resources.

## Current integration

In Render, set `ENABLE_AWS_KNOWLEDGE=true` and redeploy to enable **App design → Architecture assistant → Find AWS references**. No AWS account credentials are required for this documentation service. GitHub connection and manifest analysis are still required to create a real application's initial draft. Optional AI chat uses the existing configured provider.

The backend uses the supported MCP Python SDK maintenance release `mcp==1.30.0` with Streamable HTTP to the fixed AWS endpoint `https://knowledge-mcp.global.api.aws`. Only the recognized documentation search tool is called. No AWS API tools, local MCP commands, arbitrary server URLs, filesystem tools, or generated Python are exposed.

The lookup sends canonical public service names, never customer names, repository paths, application source, chat prompts, or credentials. It returns up to two official AWS references per recognized service, for at most six services per request. Services beyond the limit are explicitly listed as still needing review; unknown services are not claimed as covered. References are retrieved guidance, not an assessment of configuration, regional availability, capacity, cost, security, or compliance.

References have a retrieval timestamp and graph fingerprint. They are cleared when a changed graph is saved, hidden during unsaved edits or proposal preview, and included in the draft JSON export. The AI receives references for the matching saved graph as untrusted context. Repeated lookups for that same graph reuse the previous result for five minutes. Network work has a 45-second deadline; unavailable providers never produce fabricated citations or a changed graph. Lookup requires owner/admin access, is tenant scoped, and records an audit event.

## Corrections to the supplied example

- AWS's article was updated in June 2026: `awslabs.aws-diagram-mcp-server` was deprecated and removed from PyPI. The article now suggests `diagrams-mcp` for CLI use and points to the AWS `deploy-on-aws` agent plugin as the successor workflow.
- The documented Strands package is `strands-agents`; the shown `Agent(mcp_config_path=...)` and `await agent.run(...)` example does not match its documented MCP client flow. Its documentation uses an `MCPClient` passed through `Agent(tools=[...])`.
- Adding an `mcp.json` file does not automatically wire tools into a FastAPI service. LaunchComply deliberately uses a narrowly scoped SDK client and its existing AI proposal contract.
- Documentation retrieval does not automatically validate an architecture. A diagram also does not provide an infrastructure plan, policy evaluation, verified instance sizing, or deployment approval.

## Diagram rendering boundary

The interactive white graph and SVG export remain the product's diagram renderer. An optional Graphviz/diagrams renderer would need a reviewed, pinned worker image, approved service mappings, per-job output isolation, time/resource limits, and a validated graph-to-rendering specification. It must not execute AI-generated Python in the API process or receive production database/cloud credentials. No Graphviz renderer or retired package is enabled by this change.

## Browser acceptance

Saved designs now support owner/admin approval in **App design → Services & sizing**. The confirmation records the architecture ID, version, graph fingerprint, repository commit, approver and timestamp, with an audit event. Every subsequent saved version clears that approval. This is design acceptance only; it never authorizes provisioning, verifies capacity/cost, or proves that resources exist. Deployment preparation explains the customer-owned AWS sequence and uses the real assistance queue while the deployment adapter is unavailable.

The legacy AWS onboarding service contains simulated STS, stack and resource results. Those adapters now reject requests outside an explicitly enabled development/test/demo runtime. Production must not mark a customer connected or permission-verified using those results. The read-only Knowledge integration is separate and does not enable AWS provisioning.

After enabling the provider and connecting an authorized repository: analyze the repository, open App design, find AWS references, open a returned source, ask the assistant to refine the draft, preview and apply the proposal, save it, and download the actual SVG/JSON. References must disappear after a graph-changing save until retrieved again. Unavailable providers must show an error with the saved design preserved. No automated suites should be run when the user's browser-only validation instruction applies.

## Sources

- [AWS's updated diagram guide](https://aws.amazon.com/blogs/machine-learning/build-aws-architecture-diagrams-using-amazon-q-cli-and-mcp/)
- [Official AWS Knowledge MCP documentation](https://awslabs.github.io/mcp/servers/aws-knowledge-mcp-server)
- [MCP Python SDK maintenance line](https://github.com/modelcontextprotocol/python-sdk/tree/v1.x)
- [Strands MCP client documentation](https://strandsagents.com/docs/user-guide/sdk/tools/mcp-tools/)
