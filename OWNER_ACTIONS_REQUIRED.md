# Owner actions required

Rollout: Vercel/Render owner dogfood -> AWS migration rehearsal -> limited B2B beta -> enterprise launch after evidence gates.

| Action | Why / where / exact steps | Expected result and verification |
| --- | --- | --- |
| Connect hosting accounts and repository | In Render and Vercel, connect the Git repository containing the reviewed changes. Create a Render Docker API service using the existing Neon database and a Vercel Next.js project rooted at `apps/web`. | Hosted URLs; readiness HTTP 200 and frontend smoke results. |
| Set deployment secrets and origins | In provider environment settings, configure database, independent random JWT/encryption secrets, exact frontend origin, and Render backend URL using the deployment runbook. Never paste secrets into chat or Git. | Unsafe configuration rejected; requests reach hosted API. |
| Authorize owner repository/AWS test account | After real integration implementation is verified, authorize an owner repository and an isolated AWS role with unique ExternalId. Existing fixture flows cannot establish real connectivity. Review actual resource plans and budget before apply. | Real repository analysis, verified STS identity, explicit approval, resource and release evidence. |
| Configure email identity | Provide a verified transactional email identity and provider credentials through the host's secret settings after delivery implementation is verified. | Verification and password reset emails delivered and tokens exercised. |
| Choose custom domain | After the provider URLs work, configure DNS in the registrar/provider dashboard and attach domains in hosting dashboards. | Correct DNS/TLS and redirects, recorded HTTP evidence. |
| Configure live billing when commercially ready | Activate merchant accounts and webhook secrets in provider dashboards. Keep disabled during owner dogfood until verified. | Signed webhook, real receipt, reconciled ledger; test payments excluded from revenue. |
| Search Console ownership | After public launch gates pass, verify the chosen domain and submit the public sitemap in Search Console. | Actual verification/indexing evidence; no ranking claim from code. |

Unfinished engineering (real GitHub/AWS/build integrations, durable workers, email implementation, security review and PostgreSQL migration acceptance) is tracked in the reality/checklist documents and must not be presented as an owner-only blocker.
