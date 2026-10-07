# Model test results

Running log of provider/model qualitative tests for Genjutsu AI workflows.
Append new entries at the top of the **Log** section. Do not overwrite history.

Related:

- Seedance rollout matrix: [seedance-workflow.md](./seedance-workflow.md)
- Volcengine migration smoke fields: [seedance-volcengine-migration-plan.md](./seedance-volcengine-migration-plan.md)
- Internal H3 lab UI: `/h3-lab` (noindex)

## What to record

| Field            | Notes                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| Date             | Local calendar date of the run                                               |
| Model / endpoint | Fal or Ark model id + docs link                                              |
| Surface          | e.g. `/h3-lab`, Genjutsu generator, Hotel Lobby                              |
| Scenario         | Short name + what Genjutsu workflow it approximates                          |
| Inputs           | Source video + reference count; asset nicknames if useful                    |
| Prompt style     | Raw user prompt vs Genjutsu-style system wrapper (and which provider tokens) |
| Verdict          | `pass` / `fail` / `mixed`                                                    |
| Findings         | Motion fidelity, identity, unintended edits, latency/cost if known           |
| Evidence         | Fal/Ark request id + dashboard URL; local generation id if any               |

## Log

### 2026-10-07 — MiniMax H3 reference-to-video — fail (request `01a11461…`)

|                  |                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Model**        | [`minimax/h3/reference-to-video`](https://fal.ai/models/minimax/h3/reference-to-video) (Fal dashboard endpoint id: `fal-ai/minimax_h3/reference-to-video`) |
| **Surface**      | H3 Lab (`/h3-lab`) (assumed; same Fal endpoint as other lab runs)                                                                                          |
| **Scenario**     | User-reported fail — qualitative details not specified in chat                                                                                             |
| **Inputs**       | Not recorded; same session prepared `香水-5s.mp4` and `cat-fight-commit-5s.mp4` as candidate sources                                                       |
| **Prompt style** | Not recorded                                                                                                                                               |
| **Verdict**      | **fail**                                                                                                                                                   |

**Findings**

User marked this generation as a fail for Genjutsu-style expectations. Specific defects (motion / identity / unintended edits) were not described; treat as a second negative sample on H3, separate from the running-man baseline.

**Evidence**

- Fal request: [dashboard](https://fal.ai/dashboard?s_requestId=01a11461-f15d-7372-88a8-613f6c79da33&s_endpointId=fal-ai%2Fminimax_h3%2Freference-to-video)
- `requestId`: `01a11461-f15d-7372-88a8-613f6c79da33`

### 2026-10-07 — MiniMax H3 reference-to-video — running man — fail

|                  |                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Model**        | [`minimax/h3/reference-to-video`](https://fal.ai/models/minimax/h3/reference-to-video) (Fal dashboard endpoint id: `fal-ai/minimax_h3/reference-to-video`)                       |
| **Surface**      | H3 Lab (`/h3-lab`)                                                                                                                                                               |
| **Scenario**     | Running-man acrobat stunt — multi-person character swap + full environment replace (Genjutsu objects-swap / environment stress)                                                  |
| **Inputs**       | Source: running-man stunt clip; multiple character refs + one environment ref (Image 1–N / Video 1)                                                                              |
| **Prompt style** | Long Genjutsu-style instruction (character map + environment restage + motion/camera preserve). App prompt cap raised to Fal OpenAPI `maxLength` 50000 (`H3_MAX_PROMPT_LENGTH`). |
| **Verdict**      | **fail**                                                                                                                                                                         |

**Findings**

1. **Unintended scene edit:** source-video obstacles were removed instead of being preserved or restaged as specified.
2. **Motion fidelity broken on the backflip:** tumble appears to start, then the subject **snaps face-up** — landing/roll does not match the source choreography.

**Evidence**

- Fal request: [dashboard](https://fal.ai/dashboard?s_requestId=01a11445-0c0b-7513-8c5b-28bfab307504&s_endpointId=fal-ai%2Fminimax_h3%2Freference-to-video)
- `requestId`: `01a11445-0c0b-7513-8c5b-28bfab307504`

**Implication**

Not ready as a drop-in for Genjutsu motion-preserving character/environment edits on this class of stunt clip. Re-test only after prompt/provider changes; keep this run as the baseline fail.
