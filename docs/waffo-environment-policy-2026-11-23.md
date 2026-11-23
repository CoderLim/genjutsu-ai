# Waffo environment policy — 2026-11-23

## Goal
Only local development on localhost/loopback can use Waffo Test. All deployed
environments (including Preview and Staging) use Waffo Production. No ENV/DB
waffo_environment switch is needed.

## Selection
- Server uses `import.meta.env.DEV` **and** the configured `VITE_APP_URL`
  hostname being `localhost`, `127.0.0.1`, or `[::1]` to select Test.
- All other cases (including invalid URLs) select Production.
- Never select Waffo environment from the browser location, HTTP Host, or
  API key string.
- Local development uses Test credentials and product mapping; any deployed
  environment requires Live credentials and product mapping.

## Fulfillment / security
1. Verify Waffo webhook signatures against the selected environment's public
   key, then require the verified event's `mode` to match exactly. Missing or
   mismatched mode must never grant credits.
2. Production settles Waffo payments **only via signed webhooks**, because
   today's authenticated Waffo GraphQL order lookup does not return a proven
   mode. The production return URL is for navigation, not fulfillment.
3. Localhost retains the authenticated provider query callback fallback
   (webhooks cannot reach localhost). Amount, currency, idempotency and
   atomic fulfillment checks remain unchanged.
4. A Test key on production can create Test checkouts despite the Prod SDK
   selection; it must not be able to grant Production credits.
5. Existing order metadata `waffoEnvironment` is for audit only, not trusted
   settlement proof. No automatic refunds, renewal changes, or DB edits.

## Rollout / caveats
- The legacy DB `waffo_environment` row is ignored by the payment code,
  hidden and blocked from admin editing; this source commit does not delete it.
- A deployed Waffo integration **must** have a working Production webhook.
  Missing/delayed webhooks postpone fulfillment; monitor webhook failures and
  outstanding paid orders, and reconcile manually where needed.
- The commit does not deploy production; the Cloudflare production deploy
  workflow is manual for changes outside its workflow file.

## Tests
- Test local/preview/production environment resolution.
- Test matching, missing and mismatched modes.
- Run Waffo provider and payment idempotency tests, plus production build.
- Manual smoke: localhost Test paid order grants local credits. Production
  callback alone does not grant credits; signed Prod webhook grants once.
  Wrong-signature, Test-mode or missing-mode prod webhooks grant nothing.
