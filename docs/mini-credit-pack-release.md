# Mini credit pack — release checklist

**Branch:** `feat/mini-credit-pack`  
**Change:** Add public Mini **USD $9.99 / 600 credits**. Keep Starter 1,100/$14.99, Creator 3,900/$49.99, and Studio 8,400/$99.99 unchanged.

## Scope

- Public pack catalog, homepage four-card grid, server checkout catalog, and tier/deficit tests.
- No change to provider pricing, credit-per-dollar multiplier, generation submission, refund/reconciliation, existing order snapshots, or credit ledgers.
- `getSmallestSufficientCreditPack` automatically recommends Mini **only when the remaining deficit is at most 600**. An already-started job is not automatically resumed by purchasing a pack.
- Internal Smoke SKU remains restricted. Hidden `small_refill` from the old V2 plan is not implemented by this change.

## Safe Waffo onboarding (separate from deployment)

**Never run `scripts/setup-waffo-store.ts` for this change.** Its V2 provisioning path can recreate Starter/Creator/Studio remote products and overwrite runtime mappings.

Use `scripts/provision-waffo-mini.ts` only after reviewing the CURRENT runtime Admin/DB `waffo_product_ids_mapping`, which takes precedence over local environment variables. The script creates **only Mini** and does not write Admin/DB settings or .env files.

1. Run all tests (`pnpm test`, `pnpm e2e:genjutsu`) and review changes on the feature branch.
2. Get the active Waffo Store ID and product mapping for the **test** environment. Supply these to the CLI as `WAFFO_STORE_ID` and `WAFFO_PRODUCT_IDS_MAPPING` (alongside merchant credentials). Check Test and Production IDs are not confused.
3. Run the provisioner without `WAFFO_MINI_CREATE` as a validation-only dry run; it must not mutate anything.
4. Check Waffo Dashboard that Mini has **not already been created**; if it has, reuse the existing remote ID instead of running creation again. The provisioner has no server-side idempotency key.
5. Set `WAFFO_MINI_CREATE=true` in **test**; the provisioner creates Mini, verifies the returned USD 9.99 price and checkout availability, and prints a proposed merged mapping.
6. Manually merge only the `mini` key into the **current Test** Admin mapping, preserving _all_ other keys. Verify a real test checkout, grant exactly 600 credits once, duplicate webhook/callback behavior, and failures/refunds.
7. In Production, first review current mapping and remote catalog, then explicitly set `WAFFO_ENVIRONMENT=prod`, `WAFFO_MINI_CREATE=true`, `WAFFO_MINI_CONFIRM_PROD_PROVISION=true` to provision Mini **only**. Do not automatically apply a possibly stale local mapping.
8. Before releasing the UI and server catalog, ensure production Waffo Mini mapping exists and its price/currency are correct. Coordinate cutover and run a controlled real-money checkout.
9. Monitor Mini paid orders, credit grants, provider charges, and failing/unfinished generation attempts.

**Important:** The script's price verification covers newly created SKUs. If you reuse an existing Mini SKU, verify its remote price in the Waffo dashboard before activating. Re-running after creation but before updating the active mapping can create duplicates; always inspect Waffo first.

## Pricing economics

At the V2 model-cost assumption (`credits / 170` USD), Mini’s gross margin is about **64.7%**, while Starter/Creator/Studio stay roughly **50–57%**. Unit tests therefore allow the public pack band `0.5 ≤ margin < 0.7` so Mini’s higher $/credit is intentional, not a regression of the larger packs. Keep the monotonic unit-price ladder: Mini > Starter > Creator > Studio ($/credit).

## Regression focus

- Catalog: Mini 999 cents / 600 credits; three existing public packs unchanged; Pro remains retired from new checkout.
- Deficits: 600 -> Mini, 601 -> Starter, 1,101 -> Creator, 3,901 -> Studio, >8,400 -> no insufficient pack.
- Hotel Lobby: a normal 15-second task is estimated around 322 credits.
- Higgsfield 720p: public fallback ~579 credits for 5 seconds; 6 seconds ~695 and may exceed Mini. Live cost is determined by a server quote.
- Zombie Hug 720p defaults to 20/24-second templates and typically requires far more than Mini; do not claim Mini covers Zombie Hug.
- Payment: existing Starter/Creator/Studio transactions, V1 historical orders, Smoke gating, payment snapshot, and refund behavior remain unchanged.

## Cutover order (do not reverse)

1. Provision + map Mini in **test**, smoke-pay $9.99 → **600** credits once.
2. Provision + map Mini in **prod** Admin (only the `mini` key).
3. Deploy / merge this branch so the UI and server catalog expose Mini.
4. Controlled real-money Mini checkout in prod, then monitor.

Deploying the catalog before the Admin `mini` mapping leaves Buy CTAs visible but Waffo checkout fail-closed (`Waffo product mapping missing for mini`). Other packs keep working if their mappings are untouched.

## Rollback

Remove Mini from the public purchasable catalog/UI and block new Mini checkout. Keep already-paid Mini orders, credits, and references available for reconciliation. Do not delete historical purchases or previously issued credits.
