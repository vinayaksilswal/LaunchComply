import type { Metadata } from "next";
import { FeaturePage } from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Cloud operations support | LaunchComply",
  description:
    "Request help with AWS account access, monitoring, backup reviews, and cloud cost reporting. Keep delivery visible in your business workspace.",
};

export default function CloudOperationsPage() {
  return (
    <FeaturePage
      content={{
        eyebrow: "After the launch",
        title: "Keep the next cloud decision clear.",
        description:
          "Request help with AWS account access, monitoring, backups, or costs. See recorded account details and track the work needed to enable verified cloud operations.",
        action: "Request cloud operations help",
        destination: "/dashboard/operations",
        previewTitle: "Cloud operations support",
        preview: [
          {
            title: "Account context",
            description: "Recorded account and desired outcome",
          },
          {
            title: "Access review",
            description: "Confirm permissions and agreed scope",
          },
          {
            title: "Delivered work",
            description: "Actual results and next steps",
          },
        ],
        benefits: [
          {
            title: "Review account access",
            description:
              "Work through the access needed for your business. A stored account number is kept distinct from verified AWS connectivity.",
          },
          {
            title: "Review resilience",
            description:
              "Request backup and recovery help. Restore results stay unavailable until actual recovery work has been recorded.",
          },
          {
            title: "Understand cloud costs",
            description:
              "Request cost reporting support. Stored figures are not presented as live AWS billing without a verified integration.",
          },
        ],
        steps: [
          {
            title: "Choose the help you need",
            description:
              "Apply from App health, Backups, or Cloud costs in your workspace.",
          },
          {
            title: "Review access and scope",
            description:
              "Operations confirms the work and the permissions needed.",
          },
          {
            title: "Track the outcome",
            description:
              "Follow delivery status and open the actual published report.",
          },
        ],
        scope:
          "Live CloudWatch metrics, AWS billing ingestion, and automated restore drills are not enabled by submitting a request. The workspace shows connection-required states until a real integration is available.",
        faqs: [
          {
            question: "Why do I see no metrics for my account?",
            answer:
              "A recorded AWS account is not proof of a working monitoring connection. CPU, latency, running tasks, costs, and logs remain unavailable without a verified data source.",
          },
          {
            question: "Should I send AWS root credentials?",
            answer:
              "No. Do not place passwords, root credentials, or secret keys in request notes. Operations should establish the access needed through a separate agreed process.",
          },
          {
            question: "Can I request help before deployment?",
            answer:
              "Yes. You can make a business-wide request while working through your hosting and account setup.",
          },
        ],
      }}
    />
  );
}
