import type { Metadata } from "next";
import { PublicShell } from "@/components/marketing/PublicShell";
import { StatusCheck } from "@/components/marketing/StatusCheck";
export const metadata: Metadata = {
  title: "Platform status | LaunchComply",
  description:
    "A current API and database readiness check for the LaunchComply workspace.",
};
export default function StatusPage() {
  return (
    <PublicShell>
      <StatusCheck />
    </PublicShell>
  );
}
