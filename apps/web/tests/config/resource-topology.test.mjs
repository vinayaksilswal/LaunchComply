import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
const source = readFileSync(new URL("../../src/components/architecture/resourceTopology.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { arrangeResourceTopology, resourceBoundaries, visibleTopology } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);
const node = id => ({ id, label: id, service: `service-${id}`, description: "", zone: "EDGE", x: 0, y: 0 });
function fixture() {
  const graph = { nodes: ["v1", "v2", "s1", "s2", "s3", "nat", "bucket", "logs", "api"].map(node), edges: [{ source: "api", target: "bucket", label: "application data" }] };
  const p = (node_id, resource_type, vpc_node_id = null, availability_zone = null, subnet_node_id = null, location = "NETWORK_CONFIGURATION", routing = null) => ({ node_id, resource_type, vpc_node_id, availability_zone, subnet_node_id, location, routing, cidr: "10.20.0.0/24" });
  const topology = { schema_version: 1, source: "CONFIGURED_PROPERTIES", deployment_state: "NOT_VERIFIED", region: "ap-south-1", issues: [],
    placements: [p("v1", "AWS::EC2::VPC", "v1"), p("v2", "AWS::EC2::VPC", "v2"),
      p("s1", "AWS::EC2::Subnet", "v1", "ap-south-1a", null, "NETWORK_CONFIGURATION", "PUBLIC"),
      p("s2", "AWS::EC2::Subnet", "v1", "ap-south-1b", null, "NETWORK_CONFIGURATION", "ISOLATED"),
      p("s3", "AWS::EC2::Subnet", "v2", "ap-south-1a", null, "NETWORK_CONFIGURATION", "UNKNOWN"),
      p("nat", "AWS::EC2::NatGateway", "v1", "ap-south-1a", "s1"),
      p("bucket", "AWS::S3::Bucket", null, null, null, "MANAGED_SERVICE"),
      p("logs", "AWS::Logs::LogGroup", null, null, null, "OPERATIONS")],
    relations: [{ source: "nat", target: "s1", field: "subnet_node_id", kind: "PARENT_REFERENCE", label: "subnet" }] };
  return { graph, topology };
}
test("typed layout changes coordinates only, is deterministic and never overlaps cards", () => {
  const { graph, topology } = fixture(), original = structuredClone(graph);
  const arranged = arrangeResourceTopology(graph, topology);
  assert.deepEqual(graph, original); assert.deepEqual(arranged.edges, original.edges);
  assert.deepEqual(arranged.nodes.map(({ x, y, ...n }) => n), original.nodes.map(({ x, y, ...n }) => n));
  assert.deepEqual(arranged, arrangeResourceTopology(graph, topology));
  for (const a of arranged.nodes) for (const b of arranged.nodes) if (a.id !== b.id)
    assert.ok(a.x + 280 <= b.x || b.x + 280 <= a.x || a.y + 136 <= b.y || b.y + 136 <= a.y, `overlap ${a.id}/${b.id}`);
});
test("groups use VPC and AZ identity, leave S3 outside and do not attach an unconfigured API", () => {
  const { graph, topology } = fixture(), boxes = resourceBoundaries(arrangeResourceTopology(graph, topology), topology);
  assert.deepEqual(new Set(boxes.find(b => b.id === "resource-vpc-v1").nodes), new Set(["v1", "s1", "s2", "nat"]));
  assert.deepEqual(new Set(boxes.find(b => b.id === "resource-vpc-v2").nodes), new Set(["v2", "s3"]));
  assert.ok(boxes.some(b => b.id === "resource-az-v1-ap-south-1a"));
  assert.ok(boxes.some(b => b.id === "resource-az-v2-ap-south-1a"));
  assert.deepEqual(boxes.find(b => b.id === "resource-subnet-s1").nodes, ["s1", "nat"]);
  assert.deepEqual(boxes.find(b => b.id === "resource-unassigned").nodes, ["api"]);
  assert.deepEqual(boxes.find(b => b.id === "resource-managed").nodes, ["bucket"]);
});
test("deleted or locally reassigned components do not show stale references", () => {
  const { graph, topology } = fixture(), saved = structuredClone(graph);
  graph.nodes.find(n => n.id === "s1").service = "AWS::S3::Bucket";
  graph.nodes = graph.nodes.filter(n => n.id !== "logs");
  const result = visibleTopology(topology, graph, saved);
  assert.ok(!result.placements.some(p => ["s1", "logs"].includes(p.node_id)));
  assert.deepEqual(result.relations, []);
  assert.equal(visibleTopology(undefined, graph, saved), undefined);
  assert.equal(visibleTopology({ ...topology, schema_version: 2 }, graph, saved), undefined);
});
test("focus projection never invents missing components", () => {
  const { graph, topology } = fixture();
  graph.nodes = graph.nodes.filter(n => ["nat", "s1"].includes(n.id)); graph.edges = [];
  const arranged = arrangeResourceTopology(graph, topology);
  assert.equal(arranged.nodes.length, 2);
  assert.ok(resourceBoundaries(arranged, topology).every(b => b.nodes.every(id => graph.nodes.some(n => n.id === id))));
});
