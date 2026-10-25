# R2 object-key unification — production audit runbook (for Codex / operator)

**Audience:** Codex or a human operator with **read-only** production access.  
**Branch:** `refactor/unify-r2-object-keys-20261025`  
**Companion:** `docs/plans/2026-10-25-r2-object-key-rollout.md`  
**Goal:** Close the hard merge/deploy gate. Do **not** migrate, delete, overwrite, or rewrite DB keys.

---

## Non-negotiables

1. Use **read-only** R2 credentials only. Never run `pnpm r2:put` without `--dry-run`, never `wrangler r2 object put`, never template-sync Action.
2. **Never** paste access keys, secret keys, or full signed URLs with query credentials into chat, PR, or this file.
3. Do **not** “fix” double-prefix orphans in this branch. Inventory only; remediation is a separate PR.
4. If list/HEAD is AccessDenied / 403 / 5xx and cannot be completed → **FAIL / leave PENDING**. Incomplete inspection ≠ pass.
5. After the run, report with the **Output template** at the bottom. A human signs `Audit signed off by` in the rollout doc / PR.

---

## What you need before starting

| Need                                                                                                                      | Who provides           |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Checkout of `refactor/unify-r2-object-keys-20261025`                                                                      | Operator / Codex       |
| Production Admin → Storage: bucket, endpoint or account id, `r2_upload_path`, public CDN domain (values only, no secrets) | Human                  |
| Read-only R2 API token in local env                                                                                       | Human (never commit)   |
| Read access to production DB (`ai_task`)                                                                                  | Human / Codex if wired |
| `aws` CLI + `pnpm` + network to R2                                                                                        | Local machine          |

Set locally (example — replace with real non-secret + secret from vault):

```bash
export R2_BUCKET='REPLACE_BUCKET'
export R2_ENDPOINT='https://REPLACE_ACCOUNT_ID.r2.cloudflarestorage.com'
export R2_UPLOAD_PATH='uploads'   # must match Admin; do not assume
export AWS_ACCESS_KEY_ID='…'      # read-only
export AWS_SECRET_ACCESS_KEY='…'
export AWS_DEFAULT_REGION=auto
cd /path/to/genjutsu-ai
git fetch origin && git checkout refactor/unify-r2-object-keys-20261025
```

If `R2_UPLOAD_PATH` ≠ `uploads`, all physical keys below change; always compute via `resolveR2ObjectKey`.

---

## Step 0 — Record effective config (non-secret)

From Admin → Storage / runtime, record:

- `r2_bucket_name`
- `r2_endpoint` **or** `r2_account_id` (not both secrets)
- `r2_upload_path`
- public / CDN domain

**PASS:** values present and consistent with how the app is deployed.  
**FAIL:** missing or conflicting.

Also note any env overrides of template keys (`A2O_LITE_AI_TEMPLATE_VIDEO_KEY`, `HOTEL_LOBBY_TEMPLATE_VIDEO_KEY`, `ZOMBIE_HUG_*`, etc.). If overridden, HEAD the **override** logical key, not only the defaults below.

---

## Step 1 — Template HEAD (required)

### Default logical keys (from `src/config/index.ts` + hotel/kairo constants)

Genjutsu:

- `genjutsu/templates/zombie-hug.mp4`
- `genjutsu/templates/zombie-hug-9x16.mp4`
- `genjutsu/templates/smalltown-boy-dance-v1.mp4`
- `genjutsu/templates/crazy-frog-v1.mp4`
- `genjutsu/templates/a2o-lite-ai-v2.mp4`
- `genjutsu/templates/enzo-fernandez-ai-v1.mp4`
- `genjutsu/templates/flying-car-ai-v2.mp4`
- `genjutsu/templates/coldplay-kiss-cam-v3.mp4`
- `genjutsu/templates/gangnam-style-ai-v1.mp4`
- `genjutsu/templates/gas-station-dance-ai-v1.mp4`
- `genjutsu/templates/burning-bridges-ai-v2.mp4`
- `genjutsu/templates/say-it-right-ai-v1.mp4`

Hotel Lobby:

- `hotel-lobby/templates/default.mp4`
- `hotel-lobby/templates/crazy-frog-v1.mp4`
- `hotel-lobby/templates/rumpelstiltskin-v1.mp4`
- `hotel-lobby/templates/bulin-47-v1.mp4`

Kairo Bad Times:

- `kairo-bad-times/templates/v2.mp4`
- `kairo-bad-times/templates/v2-preview.mp4`
- `kairo-bad-times/templates/pet-v3.mp4`
- `kairo-bad-times/templates/pet-v3-preview.mp4`

When `R2_UPLOAD_PATH=uploads`, physical = `uploads/<logical>` (idempotent; already-prefixed stays single).

### Command

```bash
KEYS=(
  genjutsu/templates/zombie-hug.mp4
  genjutsu/templates/zombie-hug-9x16.mp4
  genjutsu/templates/smalltown-boy-dance-v1.mp4
  genjutsu/templates/crazy-frog-v1.mp4
  genjutsu/templates/a2o-lite-ai-v2.mp4
  genjutsu/templates/enzo-fernandez-ai-v1.mp4
  genjutsu/templates/flying-car-ai-v2.mp4
  genjutsu/templates/coldplay-kiss-cam-v3.mp4
  genjutsu/templates/gangnam-style-ai-v1.mp4
  genjutsu/templates/gas-station-dance-ai-v1.mp4
  genjutsu/templates/burning-bridges-ai-v2.mp4
  genjutsu/templates/say-it-right-ai-v1.mp4
  hotel-lobby/templates/default.mp4
  hotel-lobby/templates/crazy-frog-v1.mp4
  hotel-lobby/templates/rumpelstiltskin-v1.mp4
  hotel-lobby/templates/bulin-47-v1.mp4
  kairo-bad-times/templates/v2.mp4
  kairo-bad-times/templates/v2-preview.mp4
  kairo-bad-times/templates/pet-v3.mp4
  kairo-bad-times/templates/pet-v3-preview.mp4
)

PASS=0; FAIL=0
for LOGICAL_KEY in "${KEYS[@]}"; do
  PHYSICAL_KEY="$(LOGICAL_KEY="$LOGICAL_KEY" R2_UPLOAD_PATH="$R2_UPLOAD_PATH" \
    pnpm exec tsx -e "import {resolveR2ObjectKey} from './src/lib/r2-object-key'; console.log(resolveR2ObjectKey(process.env.R2_UPLOAD_PATH ?? 'uploads', process.env.LOGICAL_KEY ?? ''))")"
  echo "=== $LOGICAL_KEY → $PHYSICAL_KEY"
  if aws --endpoint-url "$R2_ENDPOINT" s3api head-object \
      --bucket "$R2_BUCKET" --key "$PHYSICAL_KEY" \
      --query '{Size:ContentLength,Type:ContentType}' --output text; then
    PASS=$((PASS+1))
  else
    echo "FAIL HEAD $LOGICAL_KEY"
    FAIL=$((FAIL+1))
  fi
done
echo "templates PASS=$PASS FAIL=$FAIL"
```

**PASS:** every configured/in-use template HEADs at the computed physical key.  
**FAIL:** any missing object or wrong path. (Unused legacy templates may be noted separately if product confirmed retired — still record them.)

### A2O workflow physical path

Confirm production still matches:

`{bucket}/uploads/genjutsu/templates/a2o-lite-ai-v2.mp4`

GitHub Action expects: `genjutsu-ai/uploads/genjutsu/templates/a2o-lite-ai-v2.mp4` (see `.github/workflows/sync-a2o-lite-r2.yml`). If bucket name or prefix differs, **FAIL** this check and open a separate workflow PR — do not “fix” by uploading in this audit.

---

## Step 2 — HARD GATE: bare / doubled prefix inventory

```bash
echo '--- bare genjutsu/ (should be empty or explainable orphans) ---'
aws --endpoint-url "$R2_ENDPOINT" s3api list-objects-v2 \
  --bucket "$R2_BUCKET" --prefix 'genjutsu/' --max-keys 50 \
  --query 'Contents[].Key' --output text

echo '--- bare hotel-lobby/ ---'
aws --endpoint-url "$R2_ENDPOINT" s3api list-objects-v2 \
  --bucket "$R2_BUCKET" --prefix 'hotel-lobby/' --max-keys 50 \
  --query 'Contents[].Key' --output text

echo '--- bare kairo-bad-times/ ---'
aws --endpoint-url "$R2_ENDPOINT" s3api list-objects-v2 \
  --bucket "$R2_BUCKET" --prefix 'kairo-bad-times/' --max-keys 50 \
  --query 'Contents[].Key' --output text

echo '--- doubled prefix ---'
aws --endpoint-url "$R2_ENDPOINT" s3api list-objects-v2 \
  --bucket "$R2_BUCKET" --prefix "${R2_UPLOAD_PATH}/${R2_UPLOAD_PATH}/" --max-keys 100 \
  --query 'Contents[].Key' --output text
```

If historical upload path was multi-segment (e.g. `assets/uploads`), also list that doubled form separately.

**PASS:** listings succeed; bare prefixes empty or inventoried with no impact on completed jobs; doubled prefix empty **or** every key listed with “no completed-task dependency” / escalated to remediation.  
**FAIL:** AccessDenied with no alternate proof; ambiguous doubled keys that may back completed jobs; uninvestigated orphans.

`AccessDenied` on list ≠ proof of no orphans.

---

## Step 3 — HARD GATE: completed-job samples

Sample **successful** `ai_task` rows per product family (genjutsu / hotel-lobby / kairo). Keys live in `options` / `taskResult` JSON (fields such as `videoKey`, image keys, result keys — redact `userId` segments in shared reports).

For each sampled logical key `L`:

1. `P = resolveR2ObjectKey(R2_UPLOAD_PATH, L)`
2. `head-object` on `P`
3. If `L` already starts with `uploads/` (or current upload path):
   - also HEAD `${R2_UPLOAD_PATH}/${L}` only if needed to detect “object only at doubled path”
   - If object exists **only** at doubled path → record for **remediation PR**; this audit **FAIL**s until remediated or explicitly accepted out of band (do not auto-copy)

Suggested minimum: **3+** completed jobs per family (genjutsu, hotel-lobby, kairo), preferring recent successes.

Example resolver one-liner:

```bash
LOGICAL_KEY='genjutsu/results/REDACTED/REDACTED.mp4'
PHYSICAL_KEY="$(LOGICAL_KEY="$LOGICAL_KEY" R2_UPLOAD_PATH="$R2_UPLOAD_PATH" \
  pnpm exec tsx -e "import {resolveR2ObjectKey} from './src/lib/r2-object-key'; console.log(resolveR2ObjectKey(process.env.R2_UPLOAD_PATH ?? 'uploads', process.env.LOGICAL_KEY ?? ''))")"
aws --endpoint-url "$R2_ENDPOINT" s3api head-object \
  --bucket "$R2_BUCKET" --key "$PHYSICAL_KEY" \
  --query '{Size:ContentLength,Type:ContentType}' --output text
```

**PASS:** logical → physical → HEAD size agrees for all samples.  
**FAIL:** 404 at new physical path; only doubled path has bytes; unknown key shape.

---

## Step 4 — CDN sample

Using Admin public domain + **same** physical key the provider would expose (path segments percent-encoded for spaces / non-ASCII):

- HEAD or GET 1–2 ASCII template CDN URLs
- If any historical keys have spaces / Unicode, sample one

Object in R2 alone does not prove CDN works.

**PASS:** expected URL returns media (or intentional auth gate documented).  
**FAIL:** 404 / wrong object / double `uploads/uploads` in URL.

---

## Step 5 — Optional local code smoke (not a substitute for prod audit)

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
# isolated fake credentials only:
R2_BUCKET_NAME=test-bucket R2_ACCESS_KEY=x R2_SECRET_KEY=y R2_ACCOUNT_ID=z R2_UPLOAD_PATH=uploads \
  pnpm r2:put --key=genjutsu/templates/a2o-lite-ai-v2.mp4 \
  --file=public/videos/a2o-lite-ai-tpl.mp4 --dry-run
```

Expect dry-run physical key: `uploads/genjutsu/templates/a2o-lite-ai-v2.mp4`.  
`pnpm exec tsc --noEmit` may show pre-existing errors on `main`; do not block this audit on unrelated TS debt unless new errors appear under `src/lib/r2-*` / storage modules.

---

## Verdict rules

| Result                         | Action                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| All steps PASS                 | Human updates rollout doc: replace `PENDING` with operator, date, evidence link; remove / annotate `DO NOT MERGE`; then merge + deploy + staged post-deploy checks |
| Any HARD GATE FAIL             | Keep `DO NOT MERGE`; file remediation issue/PR with key inventory; **no** in-branch migration                                                                      |
| Cannot obtain read-only access | Leave `PENDING`; do not invent PASS                                                                                                                                |

---

## Output template (paste into PR; redact secrets and user ids)

```text
## R2 audit result — refactor/unify-r2-object-keys-20261025

Operator: <name>
Date (UTC): <ISO date>
Branch HEAD: <sha>

### Config (non-secret)
- bucket: <name>
- endpoint/account: <non-secret>
- upload_path: <value>
- public domain: <host>
- template env overrides: none | <list>

### Step 1 Templates
- PASS/FAIL: <n>/<total>
- Failures: <none | keys>
- A2O workflow path match: PASS/FAIL

### Step 2 Bare / doubled (HARD)
- bare genjutsu/: empty | N keys (summary)
- bare hotel-lobby/: …
- bare kairo-bad-times/: …
- doubled <upload>/<upload>/: empty | N keys (summary)
- Verdict: PASS/FAIL

### Step 3 Job samples (HARD)
- genjutsu: n PASS / n FAIL (redacted logical → physical → size)
- hotel-lobby: …
- kairo: …
- doubled-path-only findings: none | inventory link
- Verdict: PASS/FAIL

### Step 4 CDN
- PASS/FAIL + notes

### Overall
- Code merge after sign-off: YES/NO
- Production deploy allowed: YES/NO
- Follow-ups: none | remediation PR needed
```

---

## After PASS — human sign-off checklist

1. Attach the output template to the PR (redacted).
2. Edit `docs/plans/2026-10-25-r2-object-key-rollout.md`:

   `Audit signed off by: <name>. Date: <date>. Evidence: <PR comment URL>.`

3. Merge branch → deploy.
4. Post-deploy staged verification (test account): browser upload, proxy upload, signed PUT/HEAD, staging→sealed copy, read historical results — per rollout doc.

## Rollback reminder

On path/404/Copy Source regressions: revert the code deploy; leave R2 objects and DB keys untouched; investigate before any copy/migrate.
