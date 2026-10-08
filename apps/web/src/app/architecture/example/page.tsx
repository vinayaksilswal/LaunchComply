import type { Metadata } from "next";
import { PublicShell } from "@/components/marketing/PublicShell";
import { DeploymentExample } from "@/components/architecture/DeploymentExample";
export const metadata: Metadata = {
  title: "Explore a cloud deployment diagram | LaunchComply",
  description:
    "Explore a clearly labeled example cloud architecture, follow traffic flow, and review what needs to be decided before deployment.",
};
export default function Page() {
  return (
    <PublicShell>
      <DeploymentExample />
    </PublicShell>
  );
}
