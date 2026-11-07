# First live launch: runbook (handover H05, first run)

Purpose: prove LaunchComply's guided launch on **real** Vercel, Render and Neon
accounts with a small known app, then clean up. It also confirms three provider
details that the docs check could not: the Render free-plan value, the Neon
region ID, and the Vercel env-var/404 behaviour.

What it creates (in the owner's own accounts, free plans):
- 1 Neon project;
- 1 Render web service;
- 1 Vercel project.

Expected cost: none on free plans. Stop at once if any provider shows a price or
asks for card details. Time: about 30–45 minutes, mostly waiting for builds.

## 0. Before starting (owner)

- [ ] Rotate the Neon API key that was pasted into chat on 6 November, then
      update it in LaunchComply (Business architecture → Current hosting →
      Providers → key icon).
- [ ] Use a business that is safe for a test, or the Tech Invenso business with
      a clearly named test app ("Sample Shop (launch test)").
- [ ] Vercel: GitHub connected (Account Settings → Authentication) with access to
      the sample repository.
- [ ] Render: GitHub connected (Account Settings → Git providers) with access to
      the sample repository.

## 1. Create the sample repository (owner)

1. On GitHub, create a new **private** repository, for example `sample-shop`.
2. Copy the contents of `fixtures/sample-launch-app/` from the LaunchComply
   repository into it, so the root holds `web/`, `api/` and `README.md`.
3. Commit and push to `main`.

## 2. Add it to LaunchComply

1. My business assets → add an application "Sample Shop (launch test)" and link
   the new repository (GitHub App install must include it).
2. Sidebar → **Launch your app** → choose "Sample Shop (launch test)".

Expected in step 1 after "Look at my code":
- Database → Neon
- Backend server → Render: FastAPI · `…/sample-shop/api`
- Website → Vercel: Vite · `…/sample-shop/web`
- No "Fix first" and no "Check" notes.

**Stop if** "Look at my code" says repository analysis needs the GitHub App key.
Production then lacks the GitHub App configuration; record it as a blocker.

## 3. Put each part online, in order

| Part | Name to use | Region | Expected |
| --- | --- | --- | --- |
| Database | `sample-shop-launch-test-db` | Singapore | "Online" within about 1 minute |
| Backend | `sample-shop-api` | Singapore | "Building…", then "Online" after its first build (about 3–8 minutes) |
| Website | `sample-shop-web` | n/a | "Building…", then "Online" (about 1–3 minutes) |

Record any provider error word for word (screenshot). Specifically:
- If Render refuses `plan: "free"`, record it; the fix is a one-line value change.
- If Neon refuses region `aws-ap-southeast-1`, record it.
- If a step shows "did not get a clear answer", press **Check again**, never
  create it a second time by hand, and record what it found.

## 4. Connect and go live

1. Step 4 should list "Give your backend the database address (DATABASE_URL)"
   and "Tell your website where the backend is (VITE_API_URL)".
2. Keep the suggested backend address (`https://sample-shop-api.onrender.com` or
   similar). Tick the confirmation, then **Connect and redeploy**.
3. Wait for both redeploys to finish (Current hosting shows them).

## 5. Acceptance checks

- [ ] Website opens at its `*.vercel.app` address and shows the backend address.
- [ ] **Record a visit** shows "Visits saved: 1. Saved to your Neon database.",
      and pressing it again increases the count. (The first press can take about
      a minute if Render was asleep.)
- [ ] `https://<backend>/health` returns `"database_configured": true`.
- [ ] Current hosting shows all three parts healthy and linked (website → backend
      → database).
- [ ] Notifications: suspend the Render service from Current hosting (high-risk
      action, type its name). Within one monitor cycle (5 minutes, while the API
      is awake) a "Problem detected" notice appears. Resume it, and a "Recovered"
      notice follows.
- [ ] No secret value (database password) appears anywhere in LaunchComply's
      pages, notifications or the step results.

Record in the evidence report: the date, the LaunchComply commit deployed, each
result, timings, and screenshots of any error.

## 6. Clean up (owner, at the providers)

LaunchComply deliberately cannot delete projects or databases. Remove them in
each provider's dashboard:
1. Vercel → `sample-shop-web` → Settings → Delete project.
2. Render → `sample-shop-api` → Settings → Delete web service.
3. Neon → `sample-shop-launch-test-db` → Settings → Delete project.
4. In LaunchComply, refresh Current hosting; the three resources disappear.
   Optionally archive the test application.

## 7. Stop conditions

Stop and report instead of continuing if:
- any provider asks for payment;
- something is created twice;
- an existing resource is changed;
- a secret value is shown;
- a step stays "Building…" for more than 15 minutes.
