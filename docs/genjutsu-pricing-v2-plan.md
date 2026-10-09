# Genjutsu AI Pricing V2 — Implementation Plan

**Decision date:** 2026-10-08  
**Status:** Phase A implemented on `feat/genjutsu-pricing-v2`; **not merged, not deployed, Waffo live products not migrated**  
**Scope:** Genjutsu AI public credit packs, insufficient-balance checkout, provider quote consistency, payment catalog migration.  
**Source of truth today:** `src/modules/genjutsu/pricing.ts` and `src/config/pricing.ts`.

> This plan supersedes the **public-pack recommendation** in [genjutsu-pricing.md](./genjutsu-pricing.md) once implemented. Until release, the existing $4.99 / $9.99 / $19.99 / $39.99 catalog remains active. The existing 1.7× model-cost-to-credit formula is **not** changed by this proposal.

## 1. Goals and non-goals

- Launch **three public, one-time USD credit packs** at **$14.99, $49.99, $99.99**; no subscription.
- Aim for around **50–57% theoretical model-cost gross margin** when a full pack is spent at the existing cost/credit conversion. This is **not net profit**, nor a guaranteed achieved margin.
- Keep the **Creator** pack highlighted ("Popular"); remove **Pro** from the public catalog.
- Preserve existing users' credit balances, historic purchase entitlements, completed/pending orders, idempotent grants and refunds.
- Avoid mismatches between local checkout catalog and **Waffo product prices**; avoid false insufficient-balance blocks when Higgsfield's live discounted quote is below list rate.
- Retain an optional, **not publicly advertised** low-entry checkout for genuinely small balance deficits, subject to a feature flag and minimum-sufficiency check.

**Out of scope:** Changing `GENJUTSU_PROVIDER_COST_MULTIPLIER = 1.7`, changing generation models/providers, introducing subscriptions/unlimited plans, changing historical order amounts, re-pricing existing credits, redesigning the payment architecture, or silently changing the terms of an already-purchased pack.

## 2. Approved public catalog (target)

| Internal ID (proposed) | UI name | Price USD | Credits granted | Model-cost budget at 170 credits/$ | Max theoretical model-cost gross margin* | UI |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `starter` | Starter | $14.99 | **1,100** | $6.47 | **56.8%** | Public |
| `creator` | Creator | $49.99 | **3,900** | $22.94 | **54.1%** | Public, **Popular** |
| `studio` | Studio | $99.99 | **8,400** | $49.41 | **50.6%** | Public |
| `pro` | Pro | — | — | — | — | **Retire from new public checkout only** |

\* Formula: `1 - (pack_credits / (100 * 1.7)) / (price_cents / 100)`, assuming each credit is eventually spent, credit consumption is based on the **actual provider-cost basis**, and a dollar of provider cost consistently consumes 170 credits. Ignores rounding, payment fees, refunds/chargebacks, taxes, storage, infrastructure, abuse, support, and acquisition costs. Actual contribution margin may be materially lower.

**Value ladder:** 1,100 → 3,900 → 8,400 credits. Customer-facing credit-to-price benefit increases with larger packs, while model-cost margin decreases moderately. The 170-credits-per-US-dollar accounting conversion remains unchanged.

### Optional hidden small refill (Phase B; not part of the public three-pack launch)

- **Proposed:** `small_refill`, **$4.99 / 400 credits**; theoretical model-cost margin ~**52.8%** before fees.
- Only show after a user attempts a generation and the **authoritative deficit is >0 and ≤400 credits**. It must not appear on public pricing, nav/landing listings or general credit-store UI.
- The server must authorize `small_refill` against the **same authenticated user and quote/deficit context** (short-lived offer, idempotent use); merely hiding a client-side button is **not** authorization.
- Do **not** show this offer when 400 credits still will not cover the selected generation; instead recommend the smallest sufficient public pack or explain that multiple packs are necessary.
- Launch behind a disabled-by-default feature flag. A smaller entry point is an experiment, not a prerequisite for the public repricing.

## 3. Pricing and duration truthfulness

Generation charge remains server-authoritative:

```text
credits_to_reserve = ceil(provider_cost_basis_usd * 100 * 1.7)
```

- Higgsfield: prefer its live `POST /estimate/<model>` response with **exact** request body and selected resolution. Fallback list rates are for resilience, **not** a guaranteed live customer price.
- The user interface must show an **estimate**, not a promise, until the server returns the actual quote; the checkout screen must clearly display **remaining balance, required credits and deficit**.
- A public pack may not cover a long / high-resolution video. **Do not** claim "**N videos included**" or guarantee a specific duration for a given pack.
- At old list-rate fallback, 720p 4 s requires `ceil(4 × $0.681 × 170) = 464` credits, and 720p 10 s requires `ceil(10 × $0.681 × 170) = 1,158`; therefore **1,100 credits cannot guarantee a 10-second 720p clip**. Live discounted provider pricing may lower actual charges.
- Avoid confidently describing all chargeable durations as "API time equal to input duration" unless this applies to the active provider; text should say longer/higher-resolution clips **may** require more credits.
- For cross-provider support, `Seedance` and `Higgsfield` quotes must use the selected provider rather than assuming a single duration formula.

## 4. Observed implementation dependencies (main branch at plan creation)

| Area | Current path / fact | V2 work |
| --- | --- | --- |
| Pack catalog | `src/modules/genjutsu/pricing.ts` defines Starter $4.99/500, Creator $9.99/1,100, Pro $19.99/2,400, Studio $39.99/5,000 | Update to three public packs, update `GenjutsuPublicCreditPackId`; preserve internal smoke pack |
| Checkout catalog | `src/config/pricing.ts` maps packs into `pricingCatalog`, server re-resolves `product_id` | Ensure new prices/credits are resolved server-side; do not trust client amounts |
| Pricing page | `src/blocks/pricing.tsx` uses `listVisibleCreditPacks` | Show exactly three public tiers |
| Landing | `src/components/landing/PricingSection.tsx` iterates `GENJUTSU_CREDIT_PACKS` with `lg:grid-cols-4` | Switch to appropriate three-column responsive layout |
| Generation UI | `src/components/landing/GeneratorPanel.tsx` uses `estimateSeedanceCredits` for early gate even if Higgsfield is selected; modal chooses `getSmallestSufficientCreditPack` | Correct per-provider UX estimate/early gate; never hard-reject an affordable discounted Higgsfield generation |
| Server generation | `src/routes/api/genjutsu/generate.ts` rejects low Higgsfield balances using 4-second **list-rate** minimum before live estimate, then reserves the live quote | Remove / relax incorrect undiscounted pre-block; preserve idempotent reserve and submit behavior |
| Credit pack selector | `getSmallestSufficientCreditPack` sorts pack credits and finds the first covering deficit | Re-test when some deficits exceed 8,400; guide to explicit multiple purchases rather than offering an insufficient pack |
| Waffo charge | `src/core/payment/waffo.ts` relies on **remote product price**; `src/modules/payment/service.ts` verifies paid amount/currency against the stored local order | Verify price, product mapping, settlement, refund and historical order paths |
| Waffo bootstrap | `scripts/setup-waffo-store.ts` considers an existing mapped product valid when checkout creation succeeds, **without asserting the remote price** | Add price verification or create **new remote V2 products**; never blindly reuse existing product IDs with stale prices |
| Tests | `src/modules/genjutsu/pricing.test.ts` asserts the old four-pack catalog and smallest-sufficient behavior | Revise and expand coverage |

**Critical payment detail:** The local `waffo_product_ids_mapping` maps internal IDs to remote IDs; its runtime **DB Admin value can override env**. Both Test and Production Waffo environments have separate products/IDs. `waffo_test_amount` overrides must not accidentally be active on real checkout. A UI-only price change can cause a payment/settlement mismatch or wrong charge.

## 5. Implementation phases

### Phase A — Public packs, safe checkout and quote gating (required for V2)

1. **Tests first**: add a V2 catalog test specifying IDs, cents, credits and order; retain 1.7× charge behavior, smoke gating, and balance recommendation tests.
2. **Define single source of truth**: update `GENJUTSU_CREDIT_PACKS` to:
   - `starter`: `priceCents: 1499, credits: 1100`
   - `creator`: `priceCents: 4999, credits: 3900, highlighted: true`
   - `studio`: `priceCents: 9999, credits: 8400`
   Remove `pro` from **active public checkout**, but retain legacy order records and needed reconciliation logic.
3. **Customer surfaces**: public /pricing, landing pricing section, pack selection modal, feature lists, localized strings, pricing metadata/structured data, FAQ, and any old "Starts at $4.99" copy must reflect the three public tiers. Make landing `lg:grid-cols-3` with sensible card widths.
4. **Server quote/gate correctness**:
   - For Higgsfield, stop using undiscounted list rate as a **hard** pre-block when a lower live quote may be affordable. If no accurate pre-upload quote is available, let the already-existing **server** quote/reservation be the first authoritative insufficient-balance decision.
   - UI `estimateSeedanceCredits` must not masquerade as an authoritative Higgsfield quote; display a qualified estimate or provider-specific calculation and avoid a client-only hard block for Higgsfield.
   - Keep the current `generationId` flow, refund paths, and no-double-charge protections.
   - For missing/failed provider estimates, fall back safely without billing at an undisclosed price. Re-check cost and user-visible messaging.
5. **Waffo migration**: provision/verify the three **new-priced** USD one-time products in **test then production**. Prefer new remote SKU IDs over reusing existing priced products. Update `waffo_product_ids_mapping` in the appropriate runtime admin/DB config; capture exact IDs in secure deployment config rather than committing secrets. Verify products' effective **USD prices**, not just checkout availability. Leave existing remote products/order references accessible long enough to settle old pending purchases.
6. **Atomic cutover**: do not advertise V2 prices while Waffo still charges V1 amounts. Coordinate catalog deployment, payment mapping and page cache/rollback, with a controlled rollout window. Ensure any checkout created with the V1 catalog remains reconcilable using its **order snapshot**, not today's catalog.

### Phase B — Hidden entry option (separate, gated experiment)

1. Add `small_refill` **$4.99/400**, but exclude from `GENJUTSU_CREDIT_PACKS` (public tiers) and public listings.
2. Include it in the internal server catalog only when the gated deficit-specific checkout verifies offer eligibility; unlike `smoke`, this pack should be allowed to any eligible user, **not** based on the developer-email test.
3. Update `getSmallestSufficientCreditPack` and its calling UI only for the authoritative, eligible insufficient-credit context. Never return a package that leaves the requested job underfunded.
4. Track offers shown, checkout completion, retry/completion after purchase, average order value and payment fees. Enable only after Phase A performance is stable.

## 6. Testing and acceptance criteria

**Catalog / margins**
- [ ] Public pack IDs are exactly `starter`, `creator`, `studio`; prices are **1499/4999/9999 USD cents**, credits **1100/3900/8400**; creator featured.
- [ ] `pro` is no longer purchasable for a new order. Prior `pro` orders/credits remain valid.
- [ ] Calculation stays `ceil(providerCostUsd × 170)`; no silent provider markup change.
- [ ] Theoretical margins match approximately **56.8% / 54.1% / 50.6%** under the above stated assumptions.

**Purchase / settlement**
- [ ] Test-mode checkout displays and charges the exact Waffo amount for **each** new SKU; **production** mapping is separately verified.
- [ ] Mismatched currency/amount rejects settlement without granting credits; test-mode transaction never grants live credits.
- [ ] A successful **real** new purchase grants exactly the correct credits **once**, including webhook + callback retries.
- [ ] V1 pending checkout succeeds/fails according to its original order snapshot, not the V2 catalog.
- [ ] Existing balances, generation reserves, failed-job refunds and administrative adjustments are untouched.
- [ ] Internal `smoke` SKU is still restricted; no accidental storefront visibility.

**Generate / insufficient-balance UX**
- [ ] Higgsfield discounted quotes do not get falsely rejected by undiscounted **client/server** pre-gates.
- [ ] Show quote vs estimate clearly. If balance is too small, recommend the **smallest sufficient** active pack.
- [ ] If no single pack covers deficit, show clear options; never say a pack will suffice when it does not.
- [ ] A newly paid user's balance refreshes on return, and they can initiate the **same desired generation** without losing inputs. Do **not** promise an automatic restart unless explicitly implemented.
- [ ] Responsive landing/pricing pages show exactly three public cards, with correct SEO/localized copy.

**Rollout / rollback**
- [ ] Run pricing, payment, genjutsu tests and smoke user flow; verify real API cost vs reserved credits at least once with controlled spend.
- [ ] Confirm Waffo live product price, config precedence and settlement before sending traffic to V2.
- [ ] Observe payment success, credit grants, completion/refund and effective margin for initial paid transactions.
- [ ] Rollback must restore **both** V1 catalog and V1 Waffo mapping/products in sync. Never roll back granted credits or rewrite paid orders.

## 7. Metrics and decisions after release

Report daily for the first few days, then review after **at least 20–30 real paid transactions** (or a longer observation window if volume is small):

- Pricing page → checkout started → checkout paid conversion, by tier; AOV and revenue per visitor.
- Generation quote → insufficient modal → pack shown → checkout → successful generation.
- Margin calculated from **actual paid revenue minus realized Higgsfield charges**; separate gross provider-cost margin from post-fee contribution margin.
- Refund/chargeback, payment fee, quote-to-actual deviation, generation failure and refund rate; share of **V1 credits** consumed.
- Percentage of users for whom Starter cannot cover their selected duration/resolution; frequent underfunding may indicate a package-design issue.

**Decision guardrail:** If large-pack actual model-cost margin falls substantially below 50% because of quote-vs-actual mismatch or additional model bills, investigate cost and settlement before offering further credits/discounts. Don't optimize exclusively for percentage margin: track whether the raised minimum checkout price decreases first-time purchase conversion.

## 8. Suggested delivery split

1. PR A: tests + public catalog + all visible pricing/SEO + quote pre-gate safety.
2. Ops/checklist: provision and verify V2 Waffo products and **atomic** catalog/mapping rollout.
3. PR B (optional): hidden $4.99 / 400 offer behind feature flag and secured offer-specific checkout.

**Branch progress (2026-10-09):** Phase A code and follow-up Cursor review fixes (I1–I6) are implemented on `feat/genjutsu-pricing-v2`. Waffo live settings and deployment remain untouched. Hidden small-refill stays deferred. Unit/E2E, Waffo test-price verification and live cutover checks remain release gates.

## 9. V2 deployment runbook (important)

> The branch is code only. **Do not run the Waffo setup script against production before the V2 price-snapshot checkout code is deployed and its test-environment payment behavior has been verified.**

1. Review PR and run `pnpm test` and `pnpm e2e:genjutsu` in CI or a local checkout. Check `pnpm build`/`pnpm cf:build` before merge. No tests are implied to have run simply because this branch was pushed.
2. In the Waffo **test** environment, provision the new public products using `WAFFO_RECREATE_V2_PRODUCTS=true` with `scripts/setup-waffo-store.ts`. This creates new remote public products rather than silently reusing mapped V1-priced products. Internal `smoke` can reuse its existing product. Verify exact displayed checkout amounts $14.99/$49.99/$99.99 and corresponding grants 1,100/3,900/8,400.
3. The setup script **requires new V2 public SKUs** (`WAFFO_RECREATE_V2_PRODUCTS=true`) and compares the prices in Waffo's product-create response to the server catalog before publishing mapping. It does **not** accept or write any `WAFFO_V2_PRODUCTS_VERIFIED` bypass flag. It writes `WAFFO_PRODUCT_IDS_MAPPING` to the local env and optionally DB config; **DB configuration takes precedence**. Keep Test and Production mappings separate. Review the remote product price in Waffo Dashboard and run a real test-environment checkout before cutover. Never commit credentials.
4. Confirm the authenticated Waffo checkout actually honors the `priceSnapshot` (server-side local order amount) with the installed SDK and merchant account. If it fails, **stop the cutover**; don't ship UI prices that disagree with Waffo charges.
5. Deploy V2 code via controlled release only after payment smoke checks. Confirm no old V1 new checkouts remain in flight where possible; pending orders use immutable stored order amounts and credits. Verify legacy Pro order settlement independently.
6. During a controlled production migration, use `WAFFO_CONFIRM_V2_PROD_CUTOVER=true` together with `WAFFO_RECREATE_V2_PRODUCTS=true` to create new production product IDs and explicitly update live mappings. The setup script refuses production V2 provisioning/mapping changes without the cutover acknowledgement. Avoid accidentally running the script on existing live V1 deployment.
7. Check Waffo product names/credit descriptions, real successful payment, webhook/callback idempotence, old pending orders, refunds, generation paid flow and estimated vs actual provider cost. The branch **does not** perform these live changes.
8. Rollback **code and Waffo product mapping together**, keeping all paid order snapshots intact. Use V1 remote IDs retained for historical reconciliation. Do not delete credits.

**Important limitation:** The script verifies the **newly created SKU response** against expected currency and price; it cannot guarantee that no subsequent dashboard edits will change it. Always inspect products and complete a Waffo test checkout. Authenticated one-time checkout passes the server-side `priceSnapshot` to the SDK, and settlement rejects mismatched amounts/currencies. Public pack checkout fails closed if any stale `*_test_amount` override is present; only internal smoke checkout may use a Waffo test-environment override.
