# Service payments and AWS observation activation

## Current release

Customers apply for services, track actual request status, review fixed quotes, open Stripe or Razorpay hosted checkout, and see provider-verified payment status. Operators review requests, issue quotes, update delivery status and publish actual reports. A quoted service cannot be marked in progress or delivered before a real payment is verified; unquoted assistance can still be delivered without a charge. A paid quote is payment evidence, not proof of deployment or assessment completion.

The AWS connection generates a read-only observer role template and verifies the actual platform and customer identities with STS. It checks access with the correct persistent per-account ExternalId and rejects both missing and incorrect IDs. Inventory includes one page per supported service in the selected commercial AWS region: VPCs, ECS clusters, RDS instances and load balancers. Missing permissions are shown as unavailable; empty successful results are zero. Inventory is neither continuous monitoring nor a security assessment.

Legacy simulated subscription and provisioning execution are rejected in hosted production. Existing customer data is preserved. Migration `ac9d3e4f5a6b` adds quote, checkout and webhook receipt tables after `ab8c2d3e4f5a`; deploy the backend with its migration step before accepting requests through the updated UI. No production migration is run manually in this work session.

## Payment environment in Render

Configure the following privately, alongside the existing database, JWT, encryption and GitHub settings. Never place these secrets in Vercel, source control or chat. Enable each provider only after the merchant account is live and its webhook endpoint has been configured.

```dotenv
ENABLE_SERVICE_PAYMENTS=true
BILLING_RETURN_ORIGIN=https://launch-comply-tau.vercel.app
ENABLE_REAL_STRIPE=true
STRIPE_MODE=live
STRIPE_SECRET_KEY=<Stripe live secret key>
STRIPE_WEBHOOK_SECRET=<Stripe endpoint signing secret>
ENABLE_REAL_RAZORPAY=true
RAZORPAY_MODE=live
RAZORPAY_KEY_ID=<Razorpay live key ID>
RAZORPAY_KEY_SECRET=<Razorpay live key secret>
RAZORPAY_WEBHOOK_SECRET=<Razorpay endpoint secret>
```

Stripe endpoint: `https://launchcomply.onrender.com/api/v1/service-payments/webhooks/stripe`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.expired`. Preserve the original raw request body; Stripe verifies a timestamped HMAC signature. Only fetched `complete` + `paid` sessions matching the immutable quote become real paid records. [Stripe documentation](https://docs.stripe.com/webhooks)

Razorpay endpoint: `https://launchcomply.onrender.com/api/v1/service-payments/webhooks/razorpay`. Subscribe to `payment_link.paid`, `payment_link.expired`, and `payment_link.cancelled`. Set the same endpoint secret in Render and Razorpay. The endpoint verifies the raw-body HMAC and then retrieves the actual link with the merchant credentials. Only a fully paid link with the expected total/reference becomes paid. [Razorpay documentation](https://razorpay.com/docs/webhooks/validate-test/)

Do not use the legacy `/commercial/webhooks` subscription endpoints for service quotes. Stripe publishable keys are not required for this hosted checkout flow. Failed/expired checkout recovery and provider switching are deliberately restricted to prevent creating a second payable link for the same quote. Contact operations; do not blindly create another charge. A changed architecture blocks new checkout requests for the old quote, but previously issued hosted links are not automatically cancelled. Operations must cancel those links in the provider dashboard when scope is withdrawn or materially revised. Paid services retain the originally quoted scope. Refunds and disputes must be handled and documented through the merchant dashboard; this release does not synchronize them or claim that an initial payment receipt is a settlement ledger.

Staging can use test keys and `*_MODE=test`; test payment records remain labeled and do not buy real services. Production rejects provider test mode. Keep payment flags false if credentials or fulfillment capacity are not ready.

## LaunchComply AWS identity

Customers bring their own AWS accounts. LaunchComply also needs its own AWS execution identity to assume each customer observer role. This is not an AWS MCP key; the optional AWS Knowledge integration requires no AWS account credentials.

Create a dedicated LaunchComply worker IAM role in an AWS account you operate. Attach a policy permitting `sts:AssumeRole` only on approved customer observer role ARNs. Prefer an AWS-hosted worker with a managed task/instance role and short-lived credentials. The API SDK session must actually be assumed as the configured role; an IAM user key or a role ARN string alone does not pass verification. The current adapter runs in the API process, so its credential chain must resolve this identity. Render does not supply an AWS task role. A separately hosted AWS worker requires an authenticated transport integration, which this release does not implement. Do not enable this flag on Render while that runtime identity is unavailable.

```dotenv
ENABLE_AWS_ACCOUNT_CONNECTION=true
AWS_PLATFORM_ROLE_ARN=arn:aws:iam::<LaunchComply-account-id>:role/<worker-role-name>
```

Customer workflow:

1. Connect GitHub, analyze a selected repository, save and approve its app design.
2. Open Deployments or Operations → Connect AWS. Select the app, customer account ID and region.
3. Download the generated observer template. In the customer's AWS CloudFormation console, create a stack from the file and review/approve the named IAM role permissions.
4. Return to LaunchComply and verify the Outputs role ARN. Actual STS access and bounded inventory appear only after verification succeeds.
5. Apply for deployment help. Operations reviews exact design, target account, capacity/cost assumptions and service scope before quoting.

The observer template grants inventory read actions only. It cannot deploy infrastructure, access database data or read secrets. Deployment permission boundaries, infrastructure execution roles, actual plans/change sets, approval of destructive actions, isolated build jobs and rollback behavior still require a separate implementation. No API boolean can turn the legacy simulator into a real deployment engine.

## Browser acceptance before collecting customer payments

Use the browser, as requested by the owner. Do not treat a build or Python import as customer workflow acceptance.

- Owner can create a request, and a read-only member cannot issue quotes, pay, change AWS connections or edit architecture.
- Platform admin opens the request, marks it reviewing, publishes the agreed quote once. Customer opens it from the request and reviews the exact scope/total.
- On an approved staging merchant flow, exercise successful, cancelled, failed, expired and interrupted checkout. Refresh retrieves provider status. Redelivering the same webhook does not create another charge or payment record. Test mode never shows real payment completion.
- Tenant switching does not expose another business's requests, quotes, AWS role or inventory.
- AWS setup rejects an unapproved design, wrong account/role, unavailable runtime identity, or role trust missing ExternalId isolation. Successful observation shows actual regional inventory and unavailable permissions explicitly. Disconnect clears verification and instructs the customer to revoke the role in AWS.
- A newly saved architecture version blocks the prior deployment quote. A paid quote does not create a provisioning run. Operations delivers the service and publishes the real report before closing an assessment.

The current browser automation connection returned `Transport closed`. No live payment, AWS grant, customer purchase or deployment was performed. Production acceptance remains pending. This release is an implementation increment, not certification that the whole platform is production-ready.
