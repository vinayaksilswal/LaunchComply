# Architecture topology engineering report - 13 October 2026

## A. Initial state

Fifteen validated foundation resource types, reviewed selected-resource AI
property patches, version history and offline CloudFormation export existed.
The canvas still grouped resources by service-name heuristics. A configured
subnet or NAT gateway appeared as unresolved placement, and drawn application
arrows could not express typed configuration references distinctly. The customer
requested an enterprise architecture tool and supplied a PeopleStrong SVG.

This execution prioritized displaying the network that is actually configured,
without pretending that unconfigured application components have valid subnet
attachments or that a diagram is live infrastructure. The SVG's visible VPC/AZ,
public/private tiers and separated connectivity were used as a structural
reference. The local SVG renderer could not reproduce some linked symbols;
unreadable content was not used to invent settings.

## B. Delivered implementation

- `resource_topology.py` derives typed placement and reference purposes from
  validated settings. It records VPC/subnet/AZ IDs, CIDRs, configured IPv4 routing
  and parent/route/security/association/endpoint-policy relationships. Missing
  explicit route-table association reports routing unknown. Invalid resources
  and transitive dependents cannot establish apparent valid placement.
- Workspace and pending proposal responses include a versioned, read-only
  topology projection. No database migration or saved design rewrite is needed.
- `resourceTopology.ts` groups configured resources by actual ownership, keeps
  separate VPCs/AZs distinct, arranges AZ subnet bands, and leaves S3 and undefined
  workload attachments outside established subnet ownership. Local deletion or
  service reassignment suppresses stale references and dependent placement.
- `ResourceTopologyMap.tsx` exposes inspectable resources, routing and purpose
  lists. Selecting a resource focuses it at 95% scale. Gray reference arrows are
  distinct from numbered request-flow arrows, with a visibility toggle.
- Canvas/diagram/inspector display this same projection. Configured service types
  cannot be manually renamed into different resource types. Parent references
  are changed through the typed settings workflow, not the placement heuristic.
- Legacy designs with no configured VPC keep their existing planning layout.
  Arranged views do not change the saved graph until the customer explicitly
  saves a manual layout change. The 80-node / 160-flow limits are retained.
- LangGraph preparation supplies configured network context and narrows it to
  selected resources and adjacent references when selection exists. Future
  property schemas retain an unsupported-schema issue and are not interpreted
  using today's topology definitions.
- `ENTERPRISE_ARCHITECTURE_RESEARCH_PROMPT.md` provides a reusable research
  specification using the customer's Mumbai/500 requests-per-minute/100-user
  targets and reference SVG, with required primary sources and acceptance tests.

## C. AI and architecture safety

Topology is derived configured intent, not new graph data, permissions or an AI
verdict. It never changes canonical nodes, ordered application flows, source
evidence, resource properties or stable logical IDs. Invalid/future settings fail
closed. Exact scoped property/graph review, pending proposal locking, explicit
Apply/Discard, stale fingerprints and revision history remain in effect.

Model context additions contain supported network properties/references only;
no environment credential values are added. No live model requests or customer
architecture edits were performed during verification. Provider tests use
isolated mocked transports; they prove contracts, not real model design quality.

## D. AWS deployment reality

No AWS discovery, template validation API, change set, provisioning or cloud
spending occurred. Existing supported templates remain offline exports. Explicit
routes/security rules do not attach ECS/EC2/ALB workloads, prove TLS or paired
rule reachability, establish SaaS tenant isolation, or satisfy compliance.

S3 is displayed outside VPC/subnet ownership; an endpoint is a configured
regional route/policy relationship. Logs and operations resources are not HTTP
request routing hops. The proposed demand targets remain unbenchmarked.

## E. Verification

- Full backend pytest suite: 330 passed, 4 skipped in 152.70 seconds. Skipped
  external checks are not accepted as verified integrations.
- Frontend configuration suite: 28 tests passed, including deterministic layout,
  ownership boundaries, stale reference suppression and focused projections.
- TypeScript and ESLint passed. Optimized Next.js build completed with 105 routes.
- Local browser verified 23 configured components and 31 explicit references,
  actual public/private NAT/isolated routing, security peer ports and endpoint
  purpose labels. Selecting NAT from Network map closes the dialog, focuses
  the resource at 95% zoom, and shows VPC/subnet/AZ ownership in the inspector.
  Saved synthetic design remains v5 with Save draft disabled.
- Browser screenshots are kept locally in `.artifacts/resource-topology-map.png`
  and `.artifacts/configured-network-focus.png`; they are not production proofs.

Tests use isolated local storage; the browser uses the synthetic network QA
asset, never the customer's production design. No live provider calls or cloud
access were needed for these checks. Hosted frontend/backend rollout has not
been accepted by these local results.

## F. Remaining work

1. Implement typed ALB/listener/target-group, certificate, ECS/image/IAM,
   database/cache and autoscaling resources with explicit workload attachments.
2. Add account/region/environment ownership and canonical typed request,
   dependency and telemetry edges, including safe backward-compatible migrations.
3. Improve dense diagrams with collapsible groups, minimap/culling/multi-select,
   and measured performance before raising graph limits. Fit-all views of many
   configuration cards still require readable zoom/focus; the current renderer
   is not accepted for arbitrary thousand-resource enterprise environments.
4. Bind exact versioned artifacts to authenticated read-only AWS validation and
   change-set planning, then reviewed durable execution and recovery acceptance.
5. Validate live model quality, PostgreSQL concurrency, tenant boundaries,
   real load tests, AWS runtime reachability, TLS/IAM and independent security.

The platform is improved toward enterprise use. Whole-platform production and
enterprise readiness are not established by this delivery.
