# Synthetic architecture regression corpus

`saas-v1.json` is shared by API and browser tests. It contains four frontend
components, an API, supported network/storage settings, disconnected monitoring,
an empty graph and an invalid cross-VPC case. Source cases describe different
refs/monorepo roots for future A04 tests; current tests do not claim those cases
are correctly analyzed yet. Browser-private-API connectivity is deliberately
unresolved, never a known-good deployed path. No real repository or secret data.

Keep this legacy v1 fixture stable when adding v2 readers. Add new fixture files
for new contracts instead of changing this fixture to make migrations pass.
