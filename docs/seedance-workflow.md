# Seedance 2.5 workflow adapter

Status: implementation branch  
Branch: `feat/seedance-workflow-router`

## Goal

Reproduce the product-level Genjutsu workflows while keeping the provider
replaceable underneath the existing upload, safety, credit-reservation,
idempotency, polling, and durable-result pipeline.

This is intentionally a provider adapter, not a claim that Seedance internally
implements Higgsfield Genjutsu in the same way.

## Workflow mapping

| Product workflow | Seedance 2.5 task | Intent                                                                                         |
| ---------------- | ----------------- | ---------------------------------------------------------------------------------------------- |
| Motion Transfer  | `reference`       | Use the source video for motion/camera/timing and image references for the replacement subject |
| Objects Swap     | `editing`         | Modify the requested target while preserving unrelated source-video content                    |

The server expands the user's prompt with workflow constraints. The browser
does not need to know Seedance prompt syntax.

## Request architecture

```text
Generator UI
  -> /api/genjutsu/generate
  -> safety gate
  -> workflow provider router
       -> Higgsfield Genjutsu
       -> Fal / Seedance 2.5 US Reference-to-Video
  -> credit reserve
  -> provider submit
  -> stored provider + model on aiTask
  -> provider-aware status/webhook reconciliation
  -> durable R2 result
  -> settle/refund
```

Persisting the provider and model on each task is important: changing a future
default must not make an in-flight or historical job poll a different provider.

## Rollout flags

Production defaults remain Higgsfield until explicitly changed.

```env
GENJUTSU_MOTION_PROVIDER=seedance
GENJUTSU_OBJECT_SWAP_PROVIDER=seedance
SEEDANCE_GENJUTSU_MODEL=bytedance/seedance-2.5/us/reference-to-video
SEEDANCE_GENJUTSU_GENERATE_AUDIO=true
```

Either workflow can be switched independently for A/B testing.

## Seedance input

The adapter sends:

- one source video as `@Video1`
- 1–8 image references as `@Image1..N`
- `task=reference` for Motion Transfer
- `task=editing` for Objects Swap
- `aspect_ratio=auto`
- `duration=auto` for editing
- Motion Transfer uses a source-length duration when it is representable by
  Seedance's 4–30 second enum; sub-4-second sources use `auto`
- H.264 output for broad browser compatibility
- the authenticated user ID as Fal `end_user_id`

## Multi-reference semantics

Reference images are independent inputs, not automatically alternate views of
one subject.

The UI labels uploaded images as `Reference 1`, `Reference 2`, and so on.
The Seedance prompt maps those labels to provider references explicitly:

- `Reference 1 = @Image1`
- `Reference 2 = @Image2`
- etc.

A user can therefore write instructions such as:

`Replace the man with Reference 1, his jacket with Reference 2, and the phone with Reference 3.`

References may represent different characters, products, clothes, props, or
other visual elements. The system prompt tells Seedance to apply each reference
only to its matching target and not to blend unrelated references together.

When several different references are uploaded without an explicit mapping, the
model is instructed to infer conservatively from visual correspondence and
modify only clearly matching targets. Explicit Reference N instructions are
recommended when multiple different subjects are present.

## Server-authoritative source duration

Fal prices Seedance video-reference generations using input and output video
duration. The API does not expose the same per-request free `/estimate`
endpoint used by Higgsfield.

To avoid trusting a client-supplied duration, the server reads the MP4/MOV
`mvhd` metadata through byte-range requests against the signed R2 URL. It
checks both the beginning and tail of the file because the `moov` atom may be
written at either end.

The duration is probed **once** during the Seedance quote, persisted with the
generation task, and reused for provider submission. Submit must not issue a
second duration probe.

Seedance generations accept only server-owned R2 storage keys. Arbitrary legacy
video URLs are not eligible for the Seedance path, and range requests reject
redirects. This keeps the metadata probe away from user-controlled SSRF targets.

Seedance is rejected for sources outside the 4–30.2 second range. The
provider's reference floor is ~1.8s, but Objects Swap uses `task=editing`,
which requires at least 4 seconds — shorter clips fail with a misleading
"set aspect_ratio and duration to auto" error. Upload UI and server probe
both enforce this editing floor.

## Billing caveat

The Seedance quote currently uses Fal's published US approximate video-reference
rates and the authoritative source duration. It estimates generated duration as
the source duration with a 4-second minimum.

This is adequate for controlled testing, but it is not equivalent to an exact
provider invoice because Seedance pricing is token-based and `auto` output
duration/aspect ratio can change the final token count.

For that reason the code does **not** switch production defaults to Seedance.
Before making Seedance the default paid provider, collect real Fal usage/cost
samples and add a post-generation reconciliation path if Fal exposes exact
request cost/usage.

For new Seedance requests the server now computes the list-rate quote and checks
the user's balance **before** invoking the paid Fal reference-image safety check.
The normal atomic reserve still runs afterwards, so a concurrent balance change
cannot bypass billing.

## Test matrix before rollout

Use the same source/reference pairs against both providers:

1. 2–4 second clip (short-duration edge case)
2. 5–10 second dance / full-body motion
3. fast motion and motion blur
4. subject turns around / temporary occlusion
5. multiple people with only one intended replacement
6. handheld product swap
7. reflective / transparent product
8. moving camera
9. scene cut inside one source clip
10. portrait and landscape aspect ratios

Record success rate, subject consistency, motion fidelity, unintended edits,
latency, provider cost, and retry rate. Do not pick the default from one or two
good demos.
