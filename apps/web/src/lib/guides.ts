export const GUIDES: Record<
  string,
  {
    title: string;
    description: string;
    steps: { title: string; text: string }[];
    next: string;
    nextLabel: string;
    note: string;
  }
> = {
  "getting-started": {
    title: "Create your first business workspace",
    description:
      "Start with the business behind your application, then connect the app when you're ready.",
    steps: [
      {
        title: "Create your account",
        text: "Enter your name, email, password, and business name. These details identify your account and business in the workspace.",
      },
      {
        title: "Choose what you need next",
        text: "If you want app analysis, name your app and authorize GitHub through onboarding. If you need help first, you can submit a business-wide service request.",
      },
      {
        title: "Use the home page",
        text: "Home shows your actual apps, connected repositories, next setup steps, and recorded activity. You can request deployment, security, or compliance help there.",
      },
    ],
    next: "/signup",
    nextLabel: "Create your workspace",
    note: "Creating an account does not deploy an application or complete an assessment.",
  },
  github: {
    title: "Connect your GitHub repository",
    description:
      "Authorize access through GitHub and choose the repository for your application.",
    steps: [
      {
        title: "Name your application",
        text: "Open Create application and enter a name you will recognize in your workspace. No cloud account is required in this step.",
      },
      {
        title: "Connect GitHub",
        text: "Click Connect GitHub and follow GitHub's authorization flow. If installation is required, install the app for selected repositories and authorize again when prompted.",
      },
      {
        title: "Choose your repository",
        text: "Back in LaunchComply, select an authorized repository and finish setup. Your workspace records the actual repository name and default branch.",
      },
    ],
    next: "/signup?next=%2Fonboarding",
    nextLabel: "Start app setup",
    note: "The platform operator must configure the GitHub App. If connection is unavailable, request support rather than pasting a personal token into notes.",
  },
  architecture: {
    title: "Review and refine your app design",
    description:
      "Separate what the code indicates from the cloud choices you want to make.",
    steps: [
      {
        title: "Open Business architecture",
        text: "Choose an application with an authorized repository. Analyze its dependency manifests when repository analysis is available.",
      },
      {
        title: "Review the proposal",
        text: "Use Code findings to inspect the dependency evidence. Use Cloud proposal to see proposed components and connections. The diagram is a draft, not deployed infrastructure.",
      },
      {
        title: "Save your decisions",
        text: "Move or edit components and save the draft. If the AI assistant is available, preview suggestions before applying them. Export downloads the actual saved design as JSON.",
      },
    ],
    next: "/signup?next=%2Fdashboard%2Farchitecture",
    nextLabel: "Open an architecture workspace",
    note: "Repository analysis reads a bounded set of manifests. It does not verify every runtime dependency or guarantee a complete cloud topology.",
  },
  "service-requests": {
    title: "Apply for a business service",
    description:
      "Submit a short application and follow the work in the same workspace.",
    steps: [
      {
        title: "Choose the relevant page",
        text: "Open Deployments, Security, VAPT, Compliance, or another service page. Choose its Apply or request-help action.",
      },
      {
        title: "Submit a request",
        text: "Select an application or keep the request business-wide. Add optional context, then submit. Owners and business admins can make requests.",
      },
      {
        title: "Follow delivery",
        text: "The saved request appears with its actual status. Operations reviews scope and required authorization before doing the agreed work. Service requests brings your applications together.",
      },
    ],
    next: "/signup?next=%2Fdashboard%2Fservices",
    nextLabel: "Open service requests",
    note: "Do not include passwords, tokens, or secret keys in request notes. Applying does not start automated deployment or testing.",
  },
  reports: {
    title: "Read a published service report",
    description:
      "Review the actual deliverable recorded by the operations team.",
    steps: [
      {
        title: "Find your request",
        text: "Open the service page you applied from, or open Service requests to see your business's requests together.",
      },
      {
        title: "Open the report",
        text: "A View report action appears after operations publishes a report. Open it to see the title, publication time, and delivered content.",
      },
      {
        title: "Keep a copy",
        text: "Download the report as a text file. The report includes its SHA-256 content checksum to identify the published content.",
      },
    ],
    next: "/login?next=%2Fdashboard%2Fservices",
    nextLabel: "View your service requests",
    note: "A report checksum is not an assessor's digital signature. A preparation report is not certification.",
  },
  "business-access": {
    title: "Understand business access",
    description: "See which account and business you are working in.",
    steps: [
      {
        title: "Check the account area",
        text: "Your name and email appear at the bottom of the sidebar. On mobile, open the navigation menu to see them.",
      },
      {
        title: "Check your business",
        text: "Your business name is displayed above the main navigation. If your account belongs to multiple businesses, use the business selector to switch context.",
      },
      {
        title: "Use the appropriate role",
        text: "Owners and business admins can submit service requests and edit app designs. Business members can read their business's records. Internal operations access is granted separately.",
      },
    ],
    next: "/login?next=%2Fdashboard%2Faccount",
    nextLabel: "Open your business account",
    note: "Only accounts granted internal operations access can open the platform admin queue.",
  },
};
