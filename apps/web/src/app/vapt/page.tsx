import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/PublicShell";
import { FEATURE_PAGES } from "@/lib/public-site";
export const metadata: Metadata = {
  title: "VAPT assessments | LaunchComply",
  description: FEATURE_PAGES.vapt.description,
};
export default function Page() {
  return <FeaturePage content={FEATURE_PAGES.vapt} />;
}
