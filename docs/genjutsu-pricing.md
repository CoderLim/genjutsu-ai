# Genjutsu AI pricing

Status: approved for first launch  
Decision date: 2026-09-30

## Decision

Launch with **prepaid credits and no subscription**.

Public positioning:

> Pay only for what you generate. No subscription. Starts at $4.99.

Credit packs:

| Pack | Price | Credits | Notes |
| --- | ---: | ---: | --- |
| Starter | $4.99 | 500 | Lowest entry price |
| Creator | $9.99 | 1,100 | Default / popular |
| Pro | $19.99 | 2,400 | Larger wallet |
| Studio | $39.99 | 5,000 | Largest launch pack |

The catalog lives in `src/modules/genjutsu/pricing.ts`. Payment-provider
product IDs must not become the source of truth for credit amounts; checkout
and webhook code should resolve the purchased pack from this catalog.

## Generation pricing

Do not hard-code a fixed "Motion Transfer costs X" or "Object Swap costs Y"
price.

Use provider cost as the base:

```text
credits_to_charge =
  ceil(provider_cost_usd * 100 credits/USD * 1.7)
```

Both Genjutsu modes use the same rule initially.

Example:

```text
provider cost = $3.405
credits = ceil(3.405 * 100 * 1.7)
        = 579 credits
```

This keeps generation pricing decoupled from pack prices and lets us adjust
the margin multiplier without changing checkout products.

## Provider-price fallback

Higgsfield currently publishes Genjutsu list pricing before account discounts:

- 480p: $0.318 per input-video second
- 720p: $0.681 per input-video second
- input duration is rounded up to the next whole second

Those rates are captured as a **fallback estimate** in
`src/modules/genjutsu/pricing.ts`. An authoritative server-side provider
quote/settled cost should win whenever Higgsfield exposes it reliably to this
integration.

Do not base customer pricing on a temporary provider discount. The list-rate
fallback is intentionally conservative.

## Important margin note

The 1.7x formula is the markup at the credit-accounting layer. Bonus credits
in larger packs reduce the effective revenue multiple.

For a hypothetical $1.00 provider cost (170 credits charged):

| Pack | Effective revenue | Effective revenue / provider cost | Gross margin before payment fees |
| --- | ---: | ---: | ---: |
| Starter | $1.70 | 1.70x | ~41% |
| Creator | $1.54 | 1.54x | ~35% |
| Pro | $1.42 | 1.42x | ~29% |
| Studio | $1.36 | 1.36x | ~26% |

So **1.7x + the current bonus-credit ladder should be treated as launch
pricing, not a guaranteed 40%+ margin model**.

After the first real paid generations, review actual provider cost, payment
fees, refund/failure rate, and pack mix. If we want to preserve the current
pack bonuses while targeting roughly 40% gross margin before payment fees on
the Studio pack, the multiplier would need to be around 2.1x.

## Checkout / Waffo integration

The Waffo integration should consume the pricing catalog instead of defining a
second independent catalog.

Recommended flow:

1. User uploads/configures a generation.
2. UI shows a credit estimate.
3. Server calculates or validates the authoritative charge.
4. If balance is insufficient, show the smallest useful credit pack(s).
5. Waffo checkout metadata includes the internal `packId`.
6. Waffo webhook verifies the event and resolves `packId` against
   `GENJUTSU_CREDIT_PACKS`.
7. Credit grant is idempotent by Waffo order/payment ID.
8. Generation debit and provider submission must be coordinated so retries
   cannot double-charge or create duplicate generations.

Never trust any client-supplied price, credit amount, provider cost, or
`packId -> credits` mapping.

## Balance/debit model

Prefer a ledger over mutating only a single balance field.

Minimum transaction types:

- `purchase`
- `generation_reserve`
- `generation_settle`
- `generation_refund`
- `admin_adjustment`

A generation should have its own idempotency key. Retrying the submit endpoint
must not reserve credits twice.

Whether a provider failure is refunded should follow the actual Higgsfield
billing outcome. Higgsfield states that some rejected/server-error requests are
not billed; do not automatically assume every failed terminal generation is
free.

## Resolution constraint found during pricing review

Current Genjutsu API documentation publishes **480p and 720p** pricing for
Motion Transfer / Object Swap. The existing feature branch currently exposes
`1080p` in the UI/service types.

Before production billing is enabled, remove or gate 1080p unless Higgsfield
documents and accepts it for Genjutsu. Otherwise users can select an option
that has no supported pricing rule and may be rejected upstream.

## First-launch scope

Included:

- prepaid credit packs
- $4.99 minimum purchase
- dynamic credit consumption from provider cost
- no subscription
- no free generation
- server-authoritative grants/debits
- idempotent Waffo webhook handling

Not required for first launch:

- monthly subscription
- unlimited plan
- automatic recurring refill
- free generation/preview that invokes Genjutsu
- complicated per-mode pricing

## Metrics to collect

At minimum:

- pricing viewed
- pack selected
- checkout started
- checkout paid
- checkout abandoned
- generation quoted credits
- generation started
- generation completed / failed
- provider cost
- credits settled/refunded
- pack ID
- mode
- resolution
- input duration

The first pricing review should be based on real paid generations rather than
traffic alone.
