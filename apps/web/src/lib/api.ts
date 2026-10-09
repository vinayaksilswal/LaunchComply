/**
 * LaunchComply Consolidated API Export
 * Seamlessly exposes the central client, typed domain modules, and backwards-compatible helpers.
 */

export * from "./api/index";

import { DashboardData } from "@/types";
import { dashboardApi } from "./api/modules";

export async function fetchDashboardData(): Promise<DashboardData> {
  return dashboardApi.getOverview();
}
