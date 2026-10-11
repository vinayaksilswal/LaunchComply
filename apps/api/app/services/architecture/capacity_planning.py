"""Explicit workload planning assumptions, never observed or deployed capacity."""
import math
import re


def plan_capacity(graph, requirements):
    graph = {**graph, "nodes": [{**node, "description": re.split(r"\s+Load plan:", node["description"])[0]} for node in graph["nodes"]]}
    rps = requirements["peak_requests_per_minute"] / 60
    minimum = 1 if requirements["availability"] == "SINGLE_AZ" else 2
    measured = requirements.get("requests_per_second_per_replica")
    replicas = max(minimum, math.ceil(rps * 1.25 / measured)) if measured else None
    plan = {"peak_requests_per_second": round(rps, 2), "concurrent_users": requirements["concurrent_users"],
            "minimum_replicas": minimum, "suggested_replicas": replicas,
            "requests_per_second_per_replica": measured, "headroom_percent": 25,
            "status": "ASSUMPTION_BASED" if measured else "BENCHMARK_REQUIRED",
            "scope": "Sizing applies only to the selected workload, assuming all peak requests reach it. Other workloads, CPU/memory, concurrency, database capacity and recovery replication need separate measurement."}
    workload = requirements.get("sizing_workload_id")
    selected = next((node for node in graph["nodes"] if node["id"] == workload and node["zone"] == "APPLICATION"), None)
    if not selected:
        return graph, plan
    suffix = (f" Load plan: {rps:.2f} requests/s; {requirements['concurrent_users']} concurrent users. "
              + (f"Proposed {replicas} replicas from supplied {measured:g} req/s/replica +25% headroom; " if measured else f"Baseline {minimum} replicas for availability; benchmark needed to size peak capacity; ")
              + "CPU/memory, request mix, scaling limits and failover need validation.")
    nodes = [{**node, "description": re.split(r"\s+Load plan:", node["description"])[0][:max(0, 500 - len(suffix))] + suffix} if node["id"] == workload else node for node in graph["nodes"]]
    return {**graph, "nodes": nodes}, plan
