# LaunchComply Billing Operations Runbook

## 1. Provider Management & Routing Policy
- **Domestic Indian Accounts:** Routed to Razorpay (settlement in INR with intra-state CGST+SGST or inter-state IGST tax breakdown).
- **International Accounts:** Routed to Stripe (multi-currency card processing in USD/EUR/GBP).
- **Enterprise / Pilot Mode:** Configured for `INVOICE_ONLY` mode with custom payment terms (Net 30/45) and manual bank reconciliation.

## 2. Invoicing & Tax Compliance
- Invoices are sequential, immutable, and prefixed with `LC-INV-YYYY-XXXX`.
- Indian customers must supply legal business name and 15-character GSTIN.
- Monthly GSTR-1 outward supply reconciliation preview is generated via `invoice_service.get_gst_reconciliation_preview` for finance review prior to external GST portal filing.

## 3. Webhook Replay & Failure Recovery
1. Every incoming webhook is recorded in `production_payment_webhook_events` before business processing.
2. If webhook delivery fails or times out, provider retries are idempotent based on `provider_event_id`.
3. In case of provider webhook backlog, operators can query unverified events via `/platform-admin/billing` and trigger manual reconciliation.
