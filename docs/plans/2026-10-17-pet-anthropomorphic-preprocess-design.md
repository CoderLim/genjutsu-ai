# Pet anthropomorphism pre-processing — pose references and generation plan

**Status:** design proposal / assets only (not implemented or deployed)  
**Date:** 2026-10-17  
**Scope:** Genjutsu AI homepage Motion Transfer and Kairo Bad Times optional pet-to-human-motion experiment  
**Existing production behavior:** `/kairo-bad-times` already has `human` (Kling V3 Motion Control) and `pet` (DreamActor v2 + pet driving clip). Keep both unchanged.

## Why

A natural quadruped photo, especially one taken lying down or crouching, does not provide a reliable upright arm/leg arrangement for a **human** driving video. A generic instruction to `stand on hind legs` often produces a sitting/begging pose. Trying to transfer conspicuous human hand gestures directly to quadruped anatomy can produce fingers, human hands or extra limbs.

**Goal:** Test a distinct, opt-in **photo → upright anthropomorphic pet → human-motion template** pipeline. Do not present it as a guaranteed improvement over using an animal driving video. For an actual dog-motion video, the existing Pet mode remains the preferred low-risk route.

## Reference pose assets

These are **synthetically generated demonstration images**, **not customer uploads**. They are posture references only; user identities, fur markings, and backgrounds must come from the user's own authorized source image.

| Species / purpose | Preview | Repo path |
| --- | --- | --- |
| Dog standing upright, elongated hind legs, furry forelimbs/paws | ![Dog upright pose reference](../assets/pet-anthropomorphism/anthropomorphic-dog-pose-reference.webp) | `docs/assets/pet-anthropomorphism/anthropomorphic-dog-pose-reference.webp` |
| Cat standing upright, elongated hind legs, furry forelimbs/paws | ![Cat upright pose reference](../assets/pet-anthropomorphism/anthropomorphic-cat-pose-reference.webp) | `docs/assets/pet-anthropomorphism/anthropomorphic-cat-pose-reference.webp` |

- Assets are compressed pose-reference copies, **320 × 480 WebP**; the generated reference images were 1024 × 1536. Intended for qualitative proof-of-concept; replace with higher-resolution copies before using in a production generation pipeline if experiments show pose quality suffers.
- **Do not commit source customer photos, uploaded videos, or per-user generated outputs** to this repository.
- Dog and cat share the same desired bipedal geometry, but prefer the **same-species** pose reference whenever species is known to avoid cross-species identity contamination. A dog reference can be used for a cat only as a fall-back, never as the default.
- Front limbs should look like furry forelegs with **animal paws**, not human hands. The guide's backgrounds are deliberately irrelevant; do not copy them.

## Proposed product choices

| User intent | Reference source | Motion source | Path |
| --- | --- | --- | --- |
| Natural-looking pet dance | Original pet photo | Pet motion clip | **Existing Pet mode**: DreamActor, no anthropomorphism |
| Human-style dance with bipedal proportions | Original pet photo + dog/cat pose guide | Human motion clip | **Proposed two-stage opt-in experiment** |
| Keep human source character / video setting | Original visual reference | Human motion clip | Existing Human mode, unchanged |

The output from the pre-processing stage is a *new image*; it must **not** overwrite the user's original photo. Users must preview/approve it before spending credits on a full-length animation. Do not silently anthropomorphize pet uploads.

## Two-stage experimental flow

```text
User-authorized pet photo (Image 1) --┐
                                       +--> Fal image EDIT (identity + pose) --> upright pet still
Synthetic cat/dog pose guide (Image 2)-┘                                     |
                                                                                v
                                      preview & explicit confirmation --> motion engine
                                                                               |
                                              human-template 4 s preview --> full generation
```

1. **Species:** Ask the user to choose `dog` or `cat` for MVP. Do not infer reliably from filenames; manual selection avoids routing errors. Other species remain unsupported until tested.
2. **Image preparation:** Use the original photo for identity/background. Select the versioned synthetic dog/cat guide strictly for **geometry**. Pass both images to an available fal image-edit provider (candidate: Nano Banana edit or Seedream edit); confirm exact fal endpoint schema, image-count support, prices, and moderation rules before implementation.
3. **Pre-process output:** One full-body **standing, not crouching** image. Show both legs extended and weight-bearing, entire head-to-feet within frame, both furry forelimbs ending in paws. Preserve breed/species identity and distinguishing facial/fur traits from Image 1.
4. **Review:** Show source and processed still side by side. User can Accept, Retry, or Use original with pet-specific motion. Never auto-start paid video generation on image-edit completion.
5. **Animation:** When accepted, pass **processed still** (not the pose guide) as the image input to the existing reference-video motion path. Test first with a human 4-second driving template. Verify runtime's model capabilities: the current Kairo `pet` path uses a different driving clip and provider and must not be silently re-routed.
6. **Final:** 4 s preview → user confirms → full generation. Keep previous balance reservation, recovery, and refund guarantees; introduce a separately itemized preview/processing quote if this becomes paid.

### Shared dual-reference image-edit prompt (English)

```text
Edit the animal in Image 1 into a photorealistic anthropomorphic version of
THE SAME ANIMAL standing fully upright on two legs, suitable for human-style
dance motion transfer.

Image 1 is the ONLY source of identity: preserve the same species, face,
muzzle, eyes, ears, nose, fur colors, unique markings, overall appearance,
and tail when visible.

Image 2 is a POSE/PROPORTION guide ONLY. Transfer its vertical posture,
fully extended weight-bearing legs, elevated hips, upright torso, and the
position of both front limbs. NEVER copy Image 2's species, facial features,
fur, colors, background, or individual identity.

The new character stands at full height like a person standing at attention:
hips clearly elevated, two long extended hind legs, both feet on the floor,
and both furry front limbs visible beside the torso, ending in natural
animal paws. Show the ENTIRE body from head to both feet with space around it.

Keep the species unmistakably animal. No human skin, human fingers or hands,
extra limbs, paws with fingers, clothing, costumes, or mascot appearance.
NOT sitting, squatting, crouching, begging, kneeling, or balancing on a bent
hind-leg haunch.

Preserve Image 1's environment, perspective, and lighting as much as possible.
You may extend the floor and framing only if required to show the whole
standing body. Do not copy Image 2's scene. Realistic photographic finish.
```

**Prompt contract:** Explicitly bind Image 1 = source identity and Image 2 = pose. Do not rely on bare order unless the provider preserves and documents image-order mapping. If the provider offers masking or distinct reference-role fields, prefer them.

### One-image fallback prompt (no guide)

```text
Turn this exact pet into a realistic, fully upright anthropomorphic version
of itself, standing like a human at attention with a tall vertical torso,
elevated hips and two long, fully extended weight-bearing hind legs.
Both feet are planted on the floor, and both furry forelimbs hang naturally
at the sides, ending in unmistakable animal paws. Show full head-to-feet.

Preserve the original animal's species, face, eyes, ears, fur pattern and
identity. Preserve the source environment and lighting as much as possible.
This is NOT a sitting, squatting or begging pose. No human hands or fingers,
extra limbs, costumes, clothes or species change.
```

This fallback has a **higher risk** of reverting to a sitting/begging pose; prefer the two-image test.

## Model / orchestration boundaries (implementation proposal only)

- Keep image pre-processing as an **optional isolated operation** (e.g. `src/modules/pet-anthropomorphism/`) rather than adding prompt branches to existing Kairo or homepage AI provider submission.
- A server-side adapter selects the configured fal image-edit model and normalizes inputs/outputs. Do **not** hard-code or claim an unverified model ID; the model's current input schema must accept two reference images.
- Client only submits a user-owned original upload and a preset ID (`cat-v1` / `dog-v1`); server maps preset ID to an allowlisted, versioned asset key. The user must not supply arbitrary preset URLs.
- Uploads and outputs stay behind existing authenticated, owner-scoped R2 keys or signed URLs. Persist pre-process task status and link it to the eventual video generation, with idempotency and retry limits. Ensure generated output is durable in R2 before marking `completed`.
- Track image-edit **COGS and credit billing separately**, including failure/refund semantics. Do not charge for a video before the user accepts a successful processed still.
- Preserve existing Human and Pet paths, existing template selection, balances, and admin history. Gate the new flow behind an **off-by-default experiment flag** so a design-only commit cannot change production behavior.
- Customer support and outbound updates must never imply that staff inspected private uploads; access and retention should be limited to what is operationally necessary.

## What to measure (small A/B experiment)

Run only with **consenting, non-sensitive test assets**; at least 5 varied dog images and 5 varied cat images (sitting, standing, lying, partly occluded). Compare:

| Case | Input to animation | Driving video | Question |
| --- | --- | --- | --- |
| A: Baseline | Original photo | Pet-motion 4 s | Is native species motion already sufficient? |
| B: Direct | Original photo | Human-motion 4 s | Rate of extra hands / poor motion? |
| C: Preprocessed | Approved upright pet still | Same human-motion 4 s | Does the guide actually reduce artifact rate? |
| D: Guide fallback | One-image upright still | Same human-motion 4 s | Does the second guide materially help? |

Record: correct species/face/fur, full-body straight legs vs squat, human hands or extra limbs, animation motion fidelity, background drift, approval rate, total cost per *accepted* preview, and runtime. Do not log raw user image URLs or subjects into analytics events.

**Ship criterion (to set before testing):** C must clearly beat B in anatomy and useful movement while maintaining recognizable identity and reasonable cost; A remains available as a fallback. No assurance of pixel-perfect environment preservation or exact human-motion transfer.

## Acceptance / non-goals

- [ ] Reference assets are two synthetic cat/dog **pose guides**, versioned and not connected to any user data.
- [ ] One-image and two-image editing tested on dog and cat.
- [ ] Two-image editing preserves animal species/identity; guide identity does not leak.
- [ ] Upright standing (not crouching/begging) and no human fingers / extra limbs in representative tests.
- [ ] Browser can preview and approve/skip the processed still; retries do not silently charge or start video jobs.
- [ ] Existing Pet mode / Human mode and homepage Motion Transfer remain untouched until experiment promotion.
- [ ] Any future implementation includes authorization, image retention, idempotency, credit reconciliation and admin visibility tests.

**Out of scope for this PR:** building APIs, UI, changing prompts in production, installing models, new pricing, running paid generations or deploying features.
