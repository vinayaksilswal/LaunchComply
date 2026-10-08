export const PUBLIC_NAV = [
  { label: "Architecture", href: "/architecture" },
  { label: "Deployment", href: "/deployment" },
  { label: "Security", href: "/security" },
  { label: "VAPT", href: "/vapt" },
  { label: "Compliance", href: "/compliance" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
] as const;

export interface FeatureContent {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  destination: string;
  previewTitle: string;
  preview: { title: string; description: string }[];
  benefits: { title: string; description: string }[];
  steps: { title: string; description: string }[];
  scope: string;
  faqs: { question: string; answer: string }[];
}

export const FEATURE_PAGES: Record<string, FeatureContent> = {
  architecture: {
    eyebrow: "Understand your application",
    title: "A clearer plan for the app you built.",
    description:
      "Turn repository dependencies into a cloud proposal you can understand, review, and refine. Keep your design decisions in one visual workspace.",
    action: "Start planning my app",
    destination: "/onboarding",
    previewTitle: "From code to a reviewed design",
    preview: [
      {
        title: "Dependency evidence",
        description: "Selected manifests at a pinned commit",
      },
      {
        title: "Cloud proposal",
        description: "Components and proposed connections",
      },
      {
        title: "Reviewed draft",
        description: "Your saved changes and design versions",
      },
    ],
    benefits: [
      {
        title: "See the moving parts",
        description:
          "Review detected dependencies separately from proposed cloud services. See what comes from code and what needs a decision.",
      },
      {
        title: "Shape the design",
        description:
          "Move components, change names, and edit connections on a white canvas. Save each revision without overwriting a newer draft.",
      },
      {
        title: "Discuss your options",
        description:
          "When AI is configured, ask about tradeoffs and preview suggested changes. You choose which proposals to apply.",
      },
    ],
    steps: [
      {
        title: "Connect your repository",
        description: "Authorize GitHub and choose the app you want to work on.",
      },
      {
        title: "Analyze the manifests",
        description:
          "Review the dependency evidence and initial cloud proposal.",
      },
      {
        title: "Refine and save",
        description:
          "Edit the diagram, review changes, and export the saved design as JSON.",
      },
    ],
    scope:
      "A cloud proposal is a planning document. Dependency analysis does not verify runtime traffic, cloud access, deployment, or the security of a running application.",
    faqs: [
      {
        question: "Do I need to understand cloud architecture?",
        answer:
          "Start with your app's name and repository. The canvas separates the app, data, and public entry point so you can discuss decisions before requesting deployment help.",
      },
      {
        question: "Does saving a design deploy anything?",
        answer:
          "No. Saving creates a new draft version. Deployment assistance is a separate service request with its own scope and review.",
      },
      {
        question: "What does repository analysis read?",
        answer:
          "A bounded set of dependency manifests from the selected repository at a pinned commit. The evidence records paths, hashes, and dependency names rather than raw source files or environment values.",
      },
    ],
  },
  deployment: {
    eyebrow: "Move beyond your prototype",
    title: "A practical path to your first business launch.",
    description:
      "You built the app. Now get help working through hosting, configuration, and the steps needed to put it in front of customers.",
    action: "Request deployment help",
    destination: "/dashboard/deployments",
    previewTitle: "Deployment support workflow",
    preview: [
      {
        title: "Your application",
        description: "Repository and desired launch outcome",
      },
      {
        title: "Operations review",
        description: "Hosting needs, access, and agreed scope",
      },
      {
        title: "Delivery record",
        description: "Work status and a published handover",
      },
    ],
    benefits: [
      {
        title: "Start with your outcome",
        description:
          "Select your application and tell the operations team what you want to launch. Technical details can be worked through during review.",
      },
      {
        title: "Keep the work visible",
        description:
          "Follow requested, reviewing, in progress, and waiting for customer statuses in your own workspace.",
      },
      {
        title: "Keep a handover",
        description:
          "View the actual report published by operations, including the scope and results of the agreed work.",
      },
    ],
    steps: [
      {
        title: "Choose your app",
        description: "Create a workspace and connect its repository.",
      },
      {
        title: "Apply for help",
        description: "Submit a deployment request. Add context if you have it.",
      },
      {
        title: "Review and deliver",
        description:
          "Operations reviews the scope, performs the agreed work, and records the outcome.",
      },
    ],
    scope:
      "Submitting a request does not provision AWS resources or publish your app automatically. Access, hosting charges, and deployment work must be agreed during operations review.",
    faqs: [
      {
        question: "Can I use this if AI helped me build my app?",
        answer:
          "Yes. The workflow begins with your repository and a plain-language description of what you need. You do not need to prepare an infrastructure script to request help.",
      },
      {
        question: "Will my cloud account be charged when I apply?",
        answer:
          "The request itself does not create cloud resources or trigger a payment. The hosting scope and its costs are reviewed separately.",
      },
      {
        question: "Where do I follow progress?",
        answer:
          "Open Deployments or Service requests in your workspace. Status and published reports belong to the request you submitted.",
      },
    ],
  },
  security: {
    eyebrow: "Security review",
    title: "Make security work clear and accountable.",
    description:
      "Apply for an app security review, follow the agreed work, and keep actual findings and published reports together in your business workspace.",
    action: "Apply for security review",
    destination: "/dashboard/security",
    previewTitle: "From a question to a recorded result",
    preview: [
      { title: "Review request", description: "Your app and areas of concern" },
      {
        title: "Agreed assessment",
        description: "Scope and authorization before testing",
      },
      {
        title: "Published findings",
        description: "Actual results and recommended next steps",
      },
    ],
    benefits: [
      {
        title: "Ask the right questions",
        description:
          "Request help understanding the security risks of your application before promising readiness to customers.",
      },
      {
        title: "Know what was reviewed",
        description:
          "Agree the assessment scope with operations. A submitted request is kept separate from a completed assessment.",
      },
      {
        title: "Keep the results",
        description:
          "Open and download published reports. Recorded findings are shown only when they exist for your business.",
      },
    ],
    steps: [
      {
        title: "Apply for a review",
        description: "Choose an application or make a business-wide request.",
      },
      {
        title: "Agree the scope",
        description:
          "Operations reviews your needs and confirms the authorization required.",
      },
      {
        title: "Use the report",
        description:
          "Review actual findings and work through the recommended changes.",
      },
    ],
    scope:
      "No security score or clean bill of health is inferred from account creation, repository connection, or request submission. Assessment execution requires an agreed scope and authorization.",
    faqs: [
      {
        question: "Is a security review the same as penetration testing?",
        answer:
          "The work depends on the agreed scope. Use the dedicated VAPT page when you want to apply for vulnerability assessment and penetration testing.",
      },
      {
        question: "Will an assessment start when I click Apply?",
        answer:
          "No. Applying records a request for operations to review. Testing begins only after its scope and required authorization are agreed.",
      },
      {
        question: "Can other businesses see my report?",
        answer:
          "Customer request and report access is scoped to your business membership. Internal operations access is separately restricted.",
      },
    ],
  },
  vapt: {
    eyebrow: "Vulnerability assessment & penetration testing",
    title: "A defined assessment. A report you can act on.",
    description:
      "Apply for VAPT without navigating a maze of technical forms. Agree what will be tested, follow delivery, and read the report in the same workspace.",
    action: "Apply for an assessment",
    destination: "/dashboard/vapt",
    previewTitle: "Your assessment journey",
    preview: [
      {
        title: "Application",
        description: "App details and assessment request",
      },
      {
        title: "Scope review",
        description: "Targets, timing, and authorization",
      },
      {
        title: "Published report",
        description: "Delivered results from the assessment",
      },
    ],
    benefits: [
      {
        title: "Apply first",
        description:
          "Submit a request in a short form. Operations can help establish the testing scope and access needed.",
      },
      {
        title: "Follow the work",
        description:
          "See the request's actual delivery status. Completed assessments are never filled in with sample results.",
      },
      {
        title: "Review the outcome",
        description:
          "Open and download the published report. Reports include a content checksum to identify the delivered text.",
      },
    ],
    steps: [
      {
        title: "Submit your application",
        description:
          "Select your app and add any context you want the team to know.",
      },
      {
        title: "Confirm scope and permission",
        description: "Agree authorized targets and the work to be performed.",
      },
      {
        title: "Receive the real report",
        description:
          "Operations publishes the actual assessment output to your request.",
      },
    ],
    scope:
      "Submitting an application does not launch a scanner. Test execution, assessor involvement, retesting, and report deliverables are agreed for each engagement. A content checksum is not an assessor's digital signature.",
    faqs: [
      {
        question: "Can I apply before I know the technical testing scope?",
        answer:
          "Yes. Start with the app and your desired outcome. Operations reviews the request and works through the scope with you before testing.",
      },
      {
        question: "Where is my report?",
        answer:
          "It appears on the VAPT page and in Service requests after operations publishes it. Until then, the workspace shows the request's delivery status.",
      },
      {
        question: "Does applying make my business compliant?",
        answer:
          "No. An assessment records scoped testing results. Any compliance or certification outcome requires its own requirements and review.",
      },
    ],
  },
  compliance: {
    eyebrow: "Business readiness",
    title: "Give your compliance work a clear next step.",
    description:
      "Apply for ISO 27001 preparation, SOC 2 preparation, or a privacy review. Keep requested work, recorded evidence, and delivered reports in one place.",
    action: "Start compliance preparation",
    destination: "/dashboard/compliance",
    previewTitle: "Preparation with a visible handover",
    preview: [
      {
        title: "Business needs",
        description: "Choose the preparation service you need",
      },
      {
        title: "Scope and evidence",
        description: "Agree the records and work required",
      },
      {
        title: "Preparation report",
        description: "Actual findings and follow-up actions",
      },
    ],
    benefits: [
      {
        title: "Choose a focused service",
        description:
          "Start with ISO 27001, SOC 2, or privacy preparation rather than a dashboard full of assumed compliance scores.",
      },
      {
        title: "Keep records organized",
        description:
          "Review stored policies, evidence, risks, and audits when actual records exist for your business.",
      },
      {
        title: "Understand the next steps",
        description:
          "Use the published preparation report to discuss the work still needed with your team and advisors.",
      },
    ],
    steps: [
      {
        title: "Choose your objective",
        description:
          "Select a preparation service in the compliance workspace.",
      },
      {
        title: "Apply and agree scope",
        description:
          "Operations reviews your business needs and the evidence to work on.",
      },
      {
        title: "Review the deliverable",
        description:
          "Open the actual preparation report and track recorded follow-up work.",
      },
    ],
    scope:
      "LaunchComply coordinates preparation and recorded deliverables. Creating an account or completing a preparation request does not issue certification or prove legal compliance.",
    faqs: [
      {
        question: "Which preparation services can I request?",
        answer:
          "The workspace offers ISO 27001 preparation, SOC 2 preparation, and privacy review applications, as well as a general compliance help request.",
      },
      {
        question: "Does the platform issue a certificate?",
        answer:
          "No. A delivered preparation report is a record of agreed service work. Formal certification and audit outcomes require the appropriate independent assessment.",
      },
      {
        question: "Why might evidence or controls be empty?",
        answer:
          "These pages show actual business records. Until evidence or control work is recorded, the workspace shows an empty state instead of a percentage.",
      },
    ],
  },
};

export const SERVICES = [
  {
    title: "Deployment help",
    description: "Work through the next steps to launch your application.",
    href: "/deployment",
    destination: "/dashboard/deployments",
  },
  {
    title: "Architecture planning",
    description: "Understand dependencies and refine a proposed cloud design.",
    href: "/architecture",
    destination: "/dashboard/architecture",
  },
  {
    title: "Security review",
    description: "Define and request a review of your application's security.",
    href: "/security",
    destination: "/dashboard/security",
  },
  {
    title: "VAPT assessment",
    description:
      "Agree a testing scope and receive an actual assessment report.",
    href: "/vapt",
    destination: "/dashboard/vapt",
  },
  {
    title: "Compliance preparation",
    description: "Request ISO 27001, SOC 2, or privacy preparation work.",
    href: "/compliance",
    destination: "/dashboard/compliance",
  },
  {
    title: "Cloud operations support",
    description:
      "Request help with AWS access, monitoring, backups, and cost reporting.",
    href: "/services/cloud-operations",
    destination: "/dashboard/operations",
  },
];
