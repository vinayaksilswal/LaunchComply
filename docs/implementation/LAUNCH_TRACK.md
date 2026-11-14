# Launch track: the shortest path to real users and first revenue

Version 1.0, 14 November 2026. Requested by the customer on 14 November 2026:
optimise the implementation plan, track it to completion, and get the product
ready to advertise and sell. This is a plan and a status record, not a readiness
certificate. `AGENTS.md` and current user instructions take precedence.

## Why the plan was re-ordered

The 35 work packages in [WORK_PACKAGES.md](WORK_PACKAGES.md) (A01-E05) build
controlled **AWS** deployment for agencies and SaaS teams. That path is long: no
release gate (R0-R4) is accepted and real AWS deployment is many packages away.

Since 6 November 2026 the customer's audience is **non-coders who built an app
with AI** and want it online. For them the product already has a working core
that does not depend on the AWS track: connect GitHub, guided launch on Vercel,
Render, Neon and Cloudinary, plain-language overview, health checks and alerts.

So work is now ordered in two tracks:

1. **Launch track (this file, L01-L12): do first.** Everything between today and
   "a stranger arrives from an advert, launches their app, and can pay us".
2. **AWS track (A03-E05, plus D05): continue after L-gate.** Unchanged, not
   deleted. It becomes the upgrade path for customers who outgrow free hosting.

Nothing in the AWS track is a prerequisite for the Launch track.

## How we make money (current, real mechanism)

- **Free:** account, guided self-service launch, overview and health checks.
  Hosting runs on the providers' free plans in the customer's own accounts.
- **Paid, available in code today:** fixed-quote services paid through hosted
  Razorpay or Stripe checkout (`service_payments`): the customer submits a
  request, operations reviews and publishes a quote, the customer pays, work is
  delivered with a report. First offer for this audience: **"Launch my app with
  me"** (`LAUNCH_HELP`). Then security assessment and compliance preparation.
- **Not available:** self-service monthly subscriptions. The subscription
  checkout in `billing_provider.py` is a simulation that is disabled outside
  demo mode. The plan catalog prices (for example Starter INR 4,999) describe
  entitlements that are not enforced or deliverable yet. Do not advertise them.
  Real subscriptions are L11, after services revenue proves demand.

No profitability claim is made. Prices are the owner's decision.

## Launch gate (L-gate): ready to spend money on adverts

All must be true, with evidence, before paid advertising starts:

1. One real app launched end to end on real provider accounts (L02).
2. A stranger can sign up and reach the guided launch without help (L01, L03).
3. A real payment has been taken and reconciled in live mode (L05).
4. Operations is notified of new requests and sign-ups (L06).
5. Privacy and Terms reviewed by the owner (L04).
6. Visits and sign-ups are measured with consent (L07).
7. A custom domain and working support contact exist (L08).

## Work items

Status: DONE, IN_PROGRESS, TODO, OWNER (waiting on the owner; cannot be done in code).

| ID | Item | Status | Evidence / what remains |
| --- | --- | --- | --- |
| L01 | Public site speaks to non-coders: landing, pricing, beginner guide, honest claims | DONE | Commit `4f34d23`. Guide `/docs/launch-your-ai-app`. |
| L02 | First real launch on live accounts (sample app), per [runbook](2026-11-07-first-live-launch-runbook.md) | IN_PROGRESS | Blocked on the `sample-shop` GitHub repository being visible to LaunchComply. Nothing created at providers yet. Unverified provider values (Render free plan value, Neon regions) get proven here. |
| L03 | Sign-up goes straight into the guided launch | DONE | Onboarding with GitHub now continues to `/dashboard/launch`. Uploaded ZIPs still go to the design review, because launch needs a repository. |
| L04 | Privacy and Terms pages, linked from footer and sign-up | OWNER | Pages published at `/privacy` and `/terms` (commit `4f34d23`). Owner must confirm the legal entity name and have them reviewed. |
| L05 | First paid offer: "Launch my app with me" using real quote and checkout | IN_PROGRESS | Code and pytest done (14 Nov 2026): service in catalog, call to action in the launch wizard, quote needs no AWS design. **Owner:** choose a price, create a Razorpay (or Stripe) account, set the payment variables on Render (below), then take one real test payment. |
| L06 | Tell operations when someone signs up or requests help (real email) | TODO | `EMAIL_PROVIDER` is `mock`; nothing is sent. Today requests only appear in Platform admin. Needs an email provider decision and credentials. Also enables email verification and password reset for real users. |
| L07 | Consent-based visit and sign-up measurement for adverts | DONE (inactive) | `Analytics.tsx`: loads only if `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID` are set and the visitor allows it; never measures the workspace. **Owner:** create the IDs and set them on Vercel. |
| L08 | Custom domain, support mailbox, site URL setting | OWNER | Still on `launch-comply-tau.vercel.app`. Config refers to `@launchcomply.com` addresses that are not confirmed to exist. Set `NEXT_PUBLIC_SITE_URL` after the domain is connected. |
| L09 | Plain-language pass and hiding of non-working pages | TODO | Sidebar is simplified, but many dashboard pages (assurance, DR, usage, SSO, partner) are record-keeping screens for services that are not live. Hide or label them for the learner audience. |
| L10 | Launch reliability: durable worker for creation, PostgreSQL race tests, "refresh repositories" button | TODO | Creation currently runs inside the web request. Acceptable for a supervised beta, not for volume from adverts. Relates to C02. |
| L11 | Self-service subscription (real Razorpay/Stripe subscriptions, enforced limits) | TODO | Only after L05 shows people pay. Requires real provider subscription APIs, webhooks, entitlement enforcement and tests. |
| L12 | Compliance for beginners: a starter checklist a new business can act on (privacy page for their app, terms, basic security hygiene) | TODO | Existing compliance modules target ISO 27001 / SOC 2 preparation. A simple "before you take customers" checklist does not exist yet. |

## Owner actions (cannot be completed in code)

1. **GitHub:** make `sample-shop` visible to the LaunchComply GitHub App (L02).
2. **Price:** decide the fixed price for "Launch my app with me" (L05).
3. **Payments (Render environment, names only; never paste values in chat):**
   `ENABLE_SERVICE_PAYMENTS=true`, `ENABLE_REAL_RAZORPAY=true`,
   `RAZORPAY_MODE=live`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
   `RAZORPAY_WEBHOOK_SECRET`, `BILLING_RETURN_ORIGIN` (the website origin).
   Webhook address: `<API origin>/api/v1/service-payments/webhooks/razorpay`.
4. **Legal:** review `/privacy` and `/terms`; supply the registered entity name.
5. **Domain and email:** buy/connect a domain, create a support mailbox, choose
   an email sending provider (L06, L08).
6. **Advert measurement:** create a Google Analytics 4 property and, if using
   Meta adverts, a Pixel; set the two `NEXT_PUBLIC_*` IDs on Vercel (L07).
7. **Rotate** the production database password and the Neon API key that were
   exposed in chat earlier in November 2026, if not already done.

## Honest limits to state in any advert

- Guided launch supports Next.js / Vite / React websites and Node.js / Python
  backends with PostgreSQL. Other apps are told what was found and offered help.
- Free hosting plans have provider limits (for example a sleeping backend).
- Online does not mean secure, certified or compliant.
- No uptime guarantee, no certification, no "enterprise-grade" claim until the
  matching gate in [ACCEPTANCE.md](ACCEPTANCE.md) is accepted.
