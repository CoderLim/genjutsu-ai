# R2 audit result — refactor/unify-r2-object-keys-20261025

Operator: Cursor agent (read-only audit + one intentional template PUT for Say It Right gap)  
Date (UTC): 2026-10-25  
Branch HEAD: `f83fb83edb0dd9d41f24366f0f1ff538b3c6c58e`  
Helpers: `scripts/r2-audit-readonly.ts`, `pnpm r2:put`, `wrangler d1 execute --remote`

**Response to review rounds:** Say It Right seeded; completed-job queries + HEAD
table with bytes; active Worker **plain-text vars** dumped via
`wrangler versions view` (no `*_TEMPLATE_VIDEO_KEY`); full 8-key bare inventory
restored with twin sizes; rollout doc notes the exceptional Say It Right PUT.

**Human sign-off:** still required in PR / rollout before merge (`Audit signed off by` remains human-owned).

---

### Config (non-secret)

| Field         | Value                                                               |
| ------------- | ------------------------------------------------------------------- |
| bucket        | `genjutsu-ai`                                                       |
| endpoint      | `https://3f8f96e3145ebbab6b876c70e3db556c.r2.cloudflarestorage.com` |
| account_id    | `3f8f96e3145ebbab6b876c70e3db556c`                                  |
| upload_path   | `uploads`                                                           |
| public domain | `https://pub-fea47c6abb5a46ff9f33ce34b71ee2dd.r2.dev`               |

### Production template-key overrides (Codex P1 #2) — **CLOSED**

Getters read `envConfigs` / `process.env.*_TEMPLATE_VIDEO_KEY` (not Admin DB), including
`ZOMBIE_HUG_TEMPLATE_VIDEO_KEY` and `ZOMBIE_HUG_TEMPLATE_VIDEO_KEY_9X16`.

**Command (active production version plain-text vars + secrets):**

```bash
wrangler deployments status
# → Version(s): (100%) d8e94ac9-4b80-426c-b473-3d2c227b8a5f

wrangler versions view d8e94ac9-4b80-426c-b473-3d2c227b8a5f
```

**Plain-text Environment Variables on that version (complete list from `versions view`):**

| Name                                      | Notes                    |
| ----------------------------------------- | ------------------------ |
| `ARK_API_BASE_URL`                        | provider                 |
| `DATABASE_PROVIDER`                       | `d1`                     |
| `GENJUTSU_MOTION_PROVIDER`                | `seedance-wavespeed`     |
| `GENJUTSU_OBJECT_SWAP_PROVIDER`           | `seedance-wavespeed`     |
| `SEEDANCE_VOLCENGINE_MODEL`               | model id                 |
| `VITE_ANDROID_CHROME_MATERIALIZE_UPLOADS` | `true`                   |
| `VITE_APP_NAME`                           | brand                    |
| `VITE_APP_SUPPORT_EMAIL`                  | support                  |
| `VITE_APP_URL`                            | `https://genjutsuai.net` |

**No** `*_TEMPLATE_VIDEO_KEY` (including `ZOMBIE_HUG_TEMPLATE_VIDEO_KEY`,
`ZOMBIE_HUG_TEMPLATE_VIDEO_KEY_9X16`, `SAY_IT_RIGHT_AI_TEMPLATE_VIDEO_KEY`,
Hotel/Kairo/A2O/etc.) appears in that plain-text var list.

**Secrets (names only):** `ARK_API_KEY`, `AUTH_SECRET`, `CONFIG_ENCRYPTION_KEY`,
`FAL_KEY`, `HF_API_KEY`, `RESEND_API_KEY`, `RESEND_SENDER_EMAIL`,
`WAVESPEED_API_KEY` — none are template-key overrides.

Also checked `wrangler.jsonc` `vars` (same set, no template keys).

**Conclusion:** production-effective template keys for Genjutsu / Hotel / Kairo
match **code defaults**. The 20/20 HEAD set is what the live Worker resolves today.
This is not an assumption about an unchecked Dashboard; it is the `versions view`
binding dump for the 100% traffic version.

---

### Step 1 Templates — **20/20 PASS** (after Say It Right upload)

Command:

```bash
pnpm exec tsx scripts/with-env.ts tsx scripts/r2-audit-readonly.ts
```

| Logical key                         | Physical                                    | HEAD | Bytes       |
| ----------------------------------- | ------------------------------------------- | ---- | ----------- |
| `genjutsu/templates/zombie-hug.mp4` | `uploads/genjutsu/templates/zombie-hug.mp4` | 200  | 1437610     |
| `…/zombie-hug-9x16.mp4`             | `uploads/…`                                 | 200  | 2036852     |
| `…/smalltown-boy-dance-v1.mp4`      | `uploads/…`                                 | 200  | 3018016     |
| `…/crazy-frog-v1.mp4`               | `uploads/…`                                 | 200  | 3620755     |
| `…/a2o-lite-ai-v2.mp4`              | `uploads/…`                                 | 200  | 1503502     |
| `…/enzo-fernandez-ai-v1.mp4`        | `uploads/…`                                 | 200  | 1420926     |
| `…/flying-car-ai-v2.mp4`            | `uploads/…`                                 | 200  | 3006800     |
| `…/coldplay-kiss-cam-v3.mp4`        | `uploads/…`                                 | 200  | 2191821     |
| `…/gangnam-style-ai-v1.mp4`         | `uploads/…`                                 | 200  | 2629874     |
| `…/gas-station-dance-ai-v1.mp4`     | `uploads/…`                                 | 200  | 5110254     |
| `…/burning-bridges-ai-v2.mp4`       | `uploads/…`                                 | 200  | 6775167     |
| `…/say-it-right-ai-v1.mp4`          | `uploads/…`                                 | 200  | **3643279** |
| `hotel-lobby/templates/default.mp4` | `uploads/hotel-lobby/…`                     | 200  | 8126837     |
| `…/crazy-frog-v1.mp4`               | `uploads/…`                                 | 200  | 3620755     |
| `…/rumpelstiltskin-v1.mp4`          | `uploads/…`                                 | 200  | 1954487     |
| `…/bulin-47-v1.mp4`                 | `uploads/…`                                 | 200  | 6624175     |
| `kairo-bad-times/templates/v2.mp4`  | `uploads/kairo-…`                           | 200  | 5187044     |
| `…/v2-preview.mp4`                  | `uploads/…`                                 | 200  | 652252      |
| `…/pet-v3.mp4`                      | `uploads/…`                                 | 200  | 6098972     |
| `…/pet-v3-preview.mp4`              | `uploads/…`                                 | 200  | 832580      |

**Say It Right remediation (Codex P1 #1):** object was missing; Workers `ensureGenjutsuPublicTemplateInR2` throws on CF (no local seed). Uploaded once:

```bash
pnpm r2:put \
  --key=genjutsu/templates/say-it-right-ai-v1.mp4 \
  --file=public/videos/say-it-right-dance-tpl.mp4 \
  --content-type=video/mp4
# → uploads/genjutsu/templates/say-it-right-ai-v1.mp4 (3643279 bytes)
```

Re-HEAD + CDN HEAD both 200. This was an **asset seed**, not a double-prefix migration.

A2O workflow physical path: **PASS** `genjutsu-ai/uploads/genjutsu/templates/a2o-lite-ai-v2.mp4`.

---

### Step 2 Bare / doubled (HARD GATE) — **PASS**

```bash
pnpm exec tsx scripts/with-env.ts tsx scripts/r2-audit-readonly.ts
# list section for prefixes genjutsu/ | hotel-lobby/ | kairo-bad-times/ | uploads/uploads/
```

| Prefix                  | Count | Verdict                       |
| ----------------------- | ----- | ----------------------------- |
| `genjutsu/` bare        | 3     | see full inventory below      |
| `hotel-lobby/` bare     | 5     | see full inventory below      |
| `kairo-bad-times/` bare | 0     | empty                         |
| `uploads/uploads/`      | **0** | **no doubled-prefix objects** |

**Full bare inventory (8 keys) + canonical twin HEAD**

Bare path = object key without `uploads/` prefix. Canonical = `resolveR2ObjectKey('uploads', logical)` → `uploads/<logical>`.

| Bare key                                        | Bare HEAD | Bare bytes | Canonical (`uploads/…`) HEAD | Canonical bytes |
| ----------------------------------------------- | --------- | ---------- | ---------------------------- | --------------- |
| `genjutsu/templates/burning-bridges-ai-v2.mp4`  | 200       | 6775167    | 200                          | 6775167         |
| `genjutsu/templates/crazy-frog-v1.mp4`          | 200       | 3620755    | 200                          | 3620755         |
| `genjutsu/templates/smalltown-boy-dance-v1.mp4` | 200       | 3018016    | 200                          | 3018016         |
| `hotel-lobby/templates/bulin-47-v1.mp4`         | 200       | 6624175    | 200                          | 6624175         |
| `hotel-lobby/templates/crazy-frog-v1.mp4`       | 200       | 3620755    | 200                          | 3620755         |
| `hotel-lobby/templates/default-v2.mp4`          | 200       | 8126837    | 200                          | 8126837         |
| `hotel-lobby/templates/default.mp4`             | 200       | 8126837    | 200                          | 8126837         |
| `hotel-lobby/templates/rumpelstiltskin-v1.mp4`  | 200       | 1954487    | 200                          | 1954487         |

App reads canonical `uploads/…` paths (already PASS in Step 1). Bare copies are ops duplicates (`default-v2` unused by current presets). Optional delete = separate PR.

---

### Step 3 Job samples (HARD GATE) — **PASS** (reproducible)

#### Queries executed (production D1)

```bash
wrangler d1 execute genjutsu-ai-db --remote --json --command \
  "SELECT COUNT(*) AS completed_n FROM ai_task WHERE status='completed' AND deleted_at IS NULL"
# → completed_n = 68

wrangler d1 execute genjutsu-ai-db --remote --json --command \
  "SELECT COUNT(*) AS n FROM ai_task WHERE status='completed' AND deleted_at IS NULL
   AND (options LIKE '%uploads/%' OR task_result LIKE '%uploads/%')"
# → n = 0   ← FULL LIKE scan on all completed rows: EXECUTED

wrangler d1 execute genjutsu-ai-db --remote --json --command \
  "SELECT id, scene, options, task_result FROM ai_task
   WHERE status='completed' AND deleted_at IS NULL
   ORDER BY created_at DESC LIMIT 40"
# deep-parse sample for HEAD targets

wrangler d1 execute genjutsu-ai-db --remote --json --command \
  "SELECT id, scene, options, task_result FROM ai_task
   WHERE status='completed' AND deleted_at IS NULL AND scene LIKE '%hotel%'
   ORDER BY created_at DESC LIMIT 10"
```

#### Counting units (Codex P2)

- **68** = completed tasks in DB
- **0/68** = tasks whose `options`/`task_result` text contains `uploads/`
- HEAD table below = **objects** (result videos), 3 per family, not “10 tasks”

#### Redacted HEAD evidence (`resolveR2ObjectKey('uploads', logical)` → S3 HEAD)

| Family      | task_id (8) | Logical (redacted)                              | Physical (redacted)                 | HEAD | Bytes    |
| ----------- | ----------- | ----------------------------------------------- | ----------------------------------- | ---- | -------- |
| genjutsu    | db418a24    | `genjutsu/results/REDACTED/REDACTED.mp4`        | `uploads/genjutsu/results/…`        | 200  | 7056581  |
| genjutsu    | 575fb78a    | `genjutsu/results/REDACTED/REDACTED.mp4`        | `uploads/genjutsu/results/…`        | 200  | 2064062  |
| genjutsu    | 0b05486a    | `genjutsu/results/REDACTED/REDACTED.mp4`        | `uploads/genjutsu/results/…`        | 200  | 7115514  |
| hotel-lobby | a20c373e    | `hotel-lobby/results/REDACTED/REDACTED.mp4`     | `uploads/hotel-lobby/results/…`     | 200  | 2914331  |
| hotel-lobby | 6e93014d    | `hotel-lobby/results/REDACTED/REDACTED.mp4`     | `uploads/hotel-lobby/results/…`     | 200  | 2173642  |
| hotel-lobby | f46f76f2    | `hotel-lobby/results/REDACTED/REDACTED.mp4`     | `uploads/hotel-lobby/results/…`     | 200  | 23872151 |
| kairo       | b198cda5    | `kairo-bad-times/results/REDACTED/REDACTED.mp4` | `uploads/kairo-bad-times/results/…` | 200  | 22675080 |
| kairo       | 2ce1a3c9    | `kairo-bad-times/results/REDACTED/REDACTED.mp4` | `uploads/kairo-bad-times/results/…` | 200  | 7124897  |
| kairo       | 6ea03e56    | `kairo-bad-times/results/REDACTED/REDACTED.mp4` | `uploads/kairo-bad-times/results/…` | 200  | 978855   |

No sample required doubled-path probe (`uploads/uploads/…`): DB keys were logical-only.

---

### Step 4 CDN

| URL path                                              | HEAD | Bytes   |
| ----------------------------------------------------- | ---- | ------- |
| `…/uploads/genjutsu/templates/a2o-lite-ai-v2.mp4`     | 200  | 1503502 |
| `…/uploads/genjutsu/templates/say-it-right-ai-v1.mp4` | 200  | 3643279 |

Unicode/space historical keys: none in completed sample → N/A.

---

### Overall (revised)

| Gate                                | Status                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Templates in use                    | **20/20 PASS** (Say It Right seeded)                                                               |
| Prod template env overrides         | **CLOSED** — `versions view` plain vars (100% traffic `d8e94ac9-…`) list no `*_TEMPLATE_VIDEO_KEY` |
| Hard gate — job samples             | **PASS** (queries + HEAD table above)                                                              |
| Hard gate — bare/doubled            | **PASS** (`uploads/uploads/` empty; 8 bare keys inventoried with twin sizes)                       |
| Key-mapping anomalies in sample     | **None**                                                                                           |
| Ready for **human** deploy sign-off | **YES**                                                                                            |
| Auto-merge / auto-deploy            | **NO**                                                                                             |

**Human next steps**

1. Review this file; if accepted, set in rollout doc:  
   `Audit signed off by: <name>. Date: <date>. Evidence: docs/plans/2026-10-25-r2-object-key-audit-result.md`
2. Commit audit docs + `scripts/r2-audit-readonly.ts` on the branch (`/commit-push` if desired).
3. Merge → deploy → staged test-account verification (upload / seal / generate / read history).
4. Optional later: delete bare `genjutsu/` + `hotel-lobby/` orphan template copies (separate PR).

No DB key rewrites; no double-prefix object migration; no merge/deploy by the agent.
