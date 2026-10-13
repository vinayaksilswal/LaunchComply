# Resource configuration and CloudFormation export

## Configured network map

Open **Business architecture -> Network map** to inspect configured VPC, subnet,
AZ, IPv4 routing and resource relationships. The API derives this projection from
validated typed references, never node labels or application arrows. A subnet
with an explicit route-table association is classified from its configured IGW
or NAT routes; without an association its deployed main route table is unknown.
`ISOLATED` describes the supported configured IPv4 routing only, not proof of
security, runtime reachability or deployment.

When a VPC definition exists, Arranged view and Arrange layers use typed groups.
AZs are separate bands and subnet ownership uses IDs, so identically named VPCs
or AZs cannot merge different VPCs. S3 remains a regional managed resource outside
subnet ownership. Unconfigured workloads remain explicitly unassigned. Designs
without a configured VPC retain the earlier planning layout; no migration or
automatic saved-graph rewrite occurs.

Select a configured resource to show its dotted/dashed gray reference links;
**Resource links** toggles all references. These are parent references, route
targets, security peers, associations or endpoint-policy references. They are
not copied into `graph.edges` and do not grant permissions, attach applications
or represent HTTP request forwarding. The card reports flows and references
separately. Network map resource buttons focus the canvas at a readable scale.

The inspector shows actual configured parent/AZ references instead of changing
service names to imply placement. Change the references through **Resource
configuration**; dragging a card moves its saved coordinates only. The AI receives
selected topology relationships alongside existing typed schemas and properties,
while the existing scope, review, Apply/Discard and revision protections remain.
Future property schema versions are not interpreted as current topology.

Invalid references and their dependent resources are excluded from established
placement and reported for correction. No public cloud account ID is invented,
and no AWS API discovery, security verdict or active connection is inferred.
The canonical 80-node / 160-flow limits remain.

AWS references: [VPCs, subnets and routing](https://docs.aws.amazon.com/vpc/latest/userguide/how-it-works.html)
and [S3 gateway endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html).
AWS distinguishes explicit subnet associations from the main route table;
S3 gateway endpoints apply to regional service routes and policies, not bucket
containment inside a subnet.

Implemented 2026-10-13. This is a bounded infrastructure-definition feature,
not a customer deployment engine or enterprise launch acceptance.

## Use

Open **Business architecture → Resource configuration**. Select a saved component
whose exact CloudFormation type or server-listed alias is supported. Configure its
properties and save. Diagram edits must be saved first; pending AI proposals must
be applied or discarded. Configure a VPC before its subnets, and save the intended
region in architecture settings before configuring an availability zone.

| Type | Configurable fields | Generated controls | Remaining configuration |
| --- | --- | --- | --- |
| AWS::EC2::VPC | RFC1918 IPv4 CIDR, DNS resolution/hostnames | VPC definition | Route tables, gateways, endpoints, security groups, peering, account/environment ownership |
| AWS::EC2::Subnet | VPC component reference, CIDR, availability zone | VPC Ref, account-selectable AZ parameter, public-IP assignment disabled | Subnet routing and workload placement; a diagram's public/private label does not provision routing |
| AWS::S3::Bucket | Versioning enabled/suspended | Block Public Access, AES256 encryption, bucket-owner enforced ownership, TLS deny policy | Application IAM grants, gateway endpoints, KMS/customer keys, backups and lifecycle policies |
| AWS::Logs::LogGroup | AWS-supported retention period | Log group and retention | Emitters, IAM permissions, alarms and dashboard configuration |
| AWS::EC2::RouteTable | VPC reference | Explicit route table | Routes and subnet association configured separately |
| AWS::EC2::SubnetRouteTableAssociation | Subnet and route table references | Same-VPC association | One explicit association per subnet |
| AWS::EC2::InternetGateway | No user properties | Tagged internet gateway | Attachment and route are separate resources |
| AWS::EC2::VPCGatewayAttachment | VPC and internet gateway | Explicit attachment | One internet gateway per VPC |
| AWS::EC2::Route | Route table, destination CIDR, gateway or NAT reference | Explicit route and gateway attachment dependency | IPv4 IGW or zonal public NAT only; no peering, Transit Gateway or IPv6 |
| AWS::EC2::EIP | No user properties | VPC Elastic IP allocation | Account quotas, regional availability and charges unverified |
| AWS::EC2::NatGateway | Public subnet and dedicated EIP | Zonal public NAT with public-route dependency | No regional/private NAT, failover or automatic AZ duplication |
| AWS::EC2::SecurityGroup | VPC, description, security role | No inbound grants and localhost-only default egress | Workload attachments and application authentication not implemented |
| AWS::EC2::SecurityGroupIngress | Group, protocol/port range, same-VPC peer or IPv4 CIDR | Separate ingress rule; public CIDR limited to ingress role TCP 443 | Private backend/data require a group peer; rules do not configure TLS |
| AWS::EC2::SecurityGroupEgress | Group, protocol/port range, peer, explicit public HTTPS acknowledgement | Separate egress rule | Public CIDR limited to acknowledged TCP 443; destination trust not verified |
| AWS::EC2::VPCEndpoint | VPC, route tables, bucket, read-only/read-write access | Regional S3 gateway endpoint with bucket-scoped policy | IAM still required; no interface endpoints or delete permissions |

There are now **15 configurable/exportable types**, versus 1,748 catalog planning
types in the Mumbai snapshot. The catalog loads capability metadata from the same
server schema and distinguishes validated settings/export from diagram planning.
It does not claim all catalog types can be deployed.

Configure references in dependency order: VPC/subnet/table/IGW, attachment/routes
and association, EIP/NAT/private route; security groups before their rules; bucket
and tables before the S3 endpoint. Public/private subnet names are not enough:
explicit routes control routing. S3 remains regional, outside a subnet; the gateway
endpoint supplies a private access path rather than moving the bucket into a VPC.

AWS creates default allow-all egress when a group has no egress rules. The compiler
uses AWS's documented localhost-only rule to suppress that default; it does not
mistake an empty array for deny-all. Separate rule resources avoid circular group
dependencies. See the [AWS security-group reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroup.html),
[route dependency reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-route.html)
and [gateway endpoint reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcendpoint.html).

No credential or arbitrary JSON field is accepted. S3 names and log group names
are generated by CloudFormation. Versioning suspension does not remove previous
object versions and is not a backup policy. A private S3 bucket is outside VPC
subnets; a diagram endpoint arrow is not an implemented endpoint or permission.

**Validate & prepare export** requires all selected components to have supported
properties. Full-diagram export fails on unsupported/unconfigured cards. The user
can explicitly choose **configured resources only**; omitted component IDs/names
are shown. Required VPC references must be included. The exact template and
SHA-256 are available before download. Diagram arrows never become routes,
permissions or CloudFormation DependsOn declarations.

Templates retain foundation/data resources on deletion/replacement, including the
bucket's TLS policy. Explicit security-group ingress/egress resources instead use
Delete on removal/replacement so obsolete permissions are revoked rather than
retained outside stack management. This follows the [AWS replacement lifecycle](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html)
and [security rule replacement behavior](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroupingress.html).
No cloud action occurs during export or design Apply. Review the actual change
set before executing any permission removal or replacement. Retained resources
may incur charges and need a separately reviewed cleanup/recovery plan. A
CloudFormation change set must still identify actual
replacement/downtime effects. No export authorizes or executes that change set.

## Canonical persistence and approval boundary

Existing `repository-draft-v1` graph serialization stays unchanged. The canonical
architecture revision now optionally contains `resource_schema_version: 1` and
`resource_configurations`, keyed by the same stable graph component IDs. There is
no separate deployment copy, database table or schema migration. Old revisions
remain readable with zero configured resources. Unknown property schema versions
are not intended to compile without an explicit migration.

Owner/admin property updates run under the existing tenant-scoped application
lock and expected revision ID. They preserve diagram nodes, coordinates, flows,
requirements and source evidence, invalidate design approval and create an audit
event and revision. Save/AI removal drops only configurations for deleted cards;
surviving child references can then require repair. History compares resource
properties and restores them together with the selected revision's diagram and
targets. Removing a configuration can leave a dependent subnet unresolved; the
validation panel identifies that reference and blocks export.

Resource DTOs forbid unknown fields and coercion of booleans/integers. CIDRs must
be canonical RFC1918 IPv4 networks with /16 through /28 prefixes. Subnets must be
inside their referenced VPC, must not overlap siblings, and must use an AZ matching
the chosen region. VPC resizing rechecks existing configured subnets. The server
does not claim an AZ exists in the customer's account merely from its spelling.

AI EDIT can propose named, typed resource-property changes only for selected
existing nodes. It receives compatible selected-resource schemas, preserves
unrequested properties, and cannot retype a configured resource. REVIEW/ADD/REMOVE
cannot update properties; new diagram nodes must be configured separately.
Questions retain both graph and properties. Unknown fields, invalid references,
unsafe network rules and out-of-scope operations are rejected. OpenRouter rejects
bad property proposals before trying the next configured free candidate/router.

Property-only proposals appear in the same review/apply/discard workflow as graph
changes. Exact before/after values, an expected architecture revision, a base
property fingerprint, revalidated operations and a new saved revision protect
Apply. Changing properties invalidates approval; History restores the properties.
No property operation grants AWS execution permissions. A field diff is not an
AWS change set or a verified replacement/downtime assessment.

## API

- GET `/architecture/workspace/resource-schemas`: authenticated, schema-driven form metadata and explicit capability levels.
- POST `/{application_id}/initialize`: owner/admin; create an empty first design, never replace an existing one.
- POST `/{application_id}/resource-configuration`: owner/admin; `expected_id`, `node_id`, and typed `configuration` or null to remove the definition.
- POST `/{application_id}/cloudformation-export`: member; `expected_id` and optional explicit `resource_ids`; immutable offline export, version/checksum audit receipt.

All paths above except the first are relative to `/architecture/workspace`.
No AWS client, model call, deployment job or payment is invoked by these endpoints.

## Verification

50 focused tests pass: pure property/reference/compiler and AI resource-identity
scope contracts, plus production
handler bodies executed with isolated storage/access adapters. The handler tests
do not establish real PostgreSQL concurrency, full tenant-isolation acceptance or
hosted deployment behavior. They import no owner settings, credentials or database.

Run from `apps/api`:

```powershell
python -m pytest tests/unit/test_resource_configuration.py tests/unit/test_resource_configuration_handlers.py tests/unit/test_resource_identity_scope.py --confcutdir=tests/unit -q
```

Four generated representative templates (combined foundation, VPC/subnet, private
S3, and log group) passed cfn-lint against Mumbai schemas with no errors or warnings.
An initial AZ literal warning was resolved by using an AWS availability-zone
parameter with the selected AZ as its default. This is static validation, not
AWS ValidateTemplate, a change set, provisioning, health checks or a recovery test.

Frontend production build, type checks and lint pass. Browser acceptance and
release identity are recorded separately when observed; local build alone does
not prove Vercel/Render release parity.

### Hosted acceptance, 2026-10-13

The released resource controls were exercised in the signed-in Techinvenso
workspace. Saving the existing private S3 card with versioning enabled created
v16 from v15. Downloaded before/after draft JSON comparisons showed every original
field unchanged: all 15 nodes, coordinates, 15 ordered flows, requirements and
evidence were preserved. Only the resource schema version/configuration fields
were added. The revision and checked versioning value persisted after reload.
History preview of v15 showed zero configured resources and one property change
from v16; no historical revision was restored during verification.

A whole-diagram export was rejected because 14 components lacked supported
configurations. Explicit configured-only export returned two CloudFormation
resources (bucket and TLS policy), clearly listed the 14 omissions, and downloaded
the exact v16 JSON. That production-downloaded template passed cfn-lint for
ap-south-1 with no errors/warnings. SHA-256:
`c5974cfd17a489510fb4f9856a261a7c7c014fd2f263778876ed339e2cdd409d`.
No AWS API, live AI request or provisioning was performed.

The resource dialog was checked at 1280x800 and 390x844. At the narrow viewport
its bounds remained inside the screen and its content had no horizontal overflow;
the selected S3 form and versioning control remained accessible. The temporary
viewport was reset. This does not establish mobile usability for the full canvas.

Subsequent hardening rejects late export results if the architecture revision or
region changes during the request, and prevents switching resource/subset inputs
while a save/export is running. Seven direct production scope-helper tests cover
configured resource identity and unrelated-content preservation. Hosted acceptance
above proves the initial released feature; the additional late-result guard is
covered by type/lint/build checks, not an injected live network-race rehearsal.

## Official references

- [VPC properties](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpc.html)
- [Subnet properties](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnet.html)
- [S3 bucket properties](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucket.html)
- [Log group properties](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-logs-loggroup.html)
- [S3 TLS policy and AWS service principals](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html)
- [CloudFormation retention](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html)
- [AWS CloudFormation linter](https://github.com/aws-cloudformation/cfn-lint)
