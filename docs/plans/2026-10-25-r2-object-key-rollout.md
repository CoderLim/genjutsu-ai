# R2 object-key unification — rollout and read-only audit

**Production audit signed off** — evidence in
`docs/plans/2026-10-25-r2-object-key-audit-result.md` (templates 20/20,
hard gates sampled PASS, Say It Right template seeded). Merge/deploy
authorized via `/ship-to-cf` after that evidence review.

Branch: `refactor/unify-r2-object-keys-20261025`.

## Contract

- Product database `storageKey`, upload descriptors, and API responses remain logical keys.
- S3 API, signed GET/PUT/HEAD, Copy Source, Workers `R2_BUCKET.put`, and provider/CDN URLs use `resolveR2ObjectKey(r2_upload_path, key)` exactly once.
- `r2_upload_path` defaults to `uploads`; fully prefixed keys are idempotent.
- Business-layer namespace, ownership, MIME, and byte-size checks are **not relaxed**.
- Do **not** migrate, delete, or overwrite any R2 objects as part of this change.

## Compatibility changes to validate

- **Physical key already in DB:** the old resolver could accidentally address
  `uploads/uploads/...` when a stored key already began with `uploads/`.
  Idempotent resolution intentionally addresses `uploads/...` instead. If such
  records exist and their only object lives at the doubled path, the new code
  would get 404. **Do not auto-copy, migrate, or rewrite storageKey.** Open a
  separate, reviewed remediation PR with an affected-key inventory.
- **CDN URL encoding:** the provider now encodes individual path segments.
  For old names containing spaces or non-ASCII characters, compare the exact
  returned CDN URL and successful responses; an object being present in R2
  alone does not prove CDN availability.
- **CLI writes:** normal `pnpm r2:put` now HEAD-checks before PUT. Existing
  targets require an explicit `--force`; authorization, timeout, or other
  HEAD failures abort without writing. Dry-run never makes network requests.

## Tests before merging

Run in a full local checkout with development dependencies:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Dry-run CLI with a complete, isolated `R2_*` environment set (no DB required):

```bash
pnpm r2:put --key=genjutsu/templates/a2o-lite-ai-v2.mp4 \
  --file=public/videos/a2o-lite-ai-tpl.mp4 --dry-run
```

Expected physical key when `R2_UPLOAD_PATH=uploads`:
`uploads/genjutsu/templates/a2o-lite-ai-v2.mp4`.

## Required production audit

**Operator / Codex runbook:** `docs/plans/2026-10-25-r2-object-key-audit-runbook.md`  
**Executed evidence (2026-10-25):** `docs/plans/2026-10-25-r2-object-key-audit-result.md`

**Hard gates:** Steps 3 and 4 are mandatory. Human must review the evidence
file and sign below before merge. A missing object, ambiguous legacy path,
403/5xx during inspection, or any uninvestigated double-prefix record means
**FAIL / DO NOT MERGE**. A finding needs a separate remediation PR, not an
in-branch migration.
The following commands are templates to run with **read-only R2 credentials**,
never with broad write credentials. Do not put access keys in a PR or terminal
output copied to a ticket.

For the effective production `R2_BUCKET_NAME`, `R2_ENDPOINT` (or default
endpoint from `R2_ACCOUNT_ID`) and `R2_UPLOAD_PATH`, set shell variables
locally, using the actual Admin/runtime settings. Read-only S3 operations:

```bash
# Placeholder values; DO NOT paste real secrets into review comments.
export R2_BUCKET='REPLACE_WITH_ACTUAL_BUCKET'
export R2_ENDPOINT='https://REPLACE_WITH_ACTUAL_ACCOUNT_ID.r2.cloudflarestorage.com'
export R2_UPLOAD_PATH='uploads'
# Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY locally from a READ-ONLY R2 token.
export AWS_DEFAULT_REGION=auto

# For each actual template and completed-job key, first calculate its
# physical object key with the *same* shared resolver used by the application:
LOGICAL_KEY='genjutsu/templates/a2o-lite-ai-v2.mp4'
PHYSICAL_KEY="$(LOGICAL_KEY="$LOGICAL_KEY" R2_UPLOAD_PATH="$R2_UPLOAD_PATH" \
  pnpm exec tsx -e "import {resolveR2ObjectKey} from './src/lib/r2-object-key'; console.log(resolveR2ObjectKey(process.env.R2_UPLOAD_PATH ?? 'uploads', process.env.LOGICAL_KEY ?? ''))")"
aws --endpoint-url "$R2_ENDPOINT" s3api head-object \
  --bucket "$R2_BUCKET" --key "$PHYSICAL_KEY" \
  --query '{Size:ContentLength,ETag:ETag,Type:ContentType}'

# Look for historical bare object keys and accidental doubled prefixes.
# Repeat for all relevant prefixes (genjutsu/, hotel-lobby/, kairo-bad-times/).
aws --endpoint-url "$R2_ENDPOINT" s3api list-objects-v2 \
  --bucket "$R2_BUCKET" --prefix 'genjutsu/' --query 'Contents[].Key'
aws --endpoint-url "$R2_ENDPOINT" s3api list-objects-v2 \
  --bucket "$R2_BUCKET" --prefix "$R2_UPLOAD_PATH/$R2_UPLOAD_PATH/" \
  --query 'Contents[].Key'
```

For multi-component prefixes (such as `assets/uploads`), also inspect
`uploads/uploads/` and any historically configured prefix separately;
the double-prefix example above is only meaningful for a single `uploads`
prefix. Check the _actual_ historical prefix, not just the current value.
`list-objects-v2` requires permission to list keys; an AccessDenied does
**not** count as proof there are no orphaned objects.

Audit result record:

| Check                                                  | PASS requires                                                                                        | FAIL / escalate                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Effective Admin/runtime config                         | Bucket, endpoint/account ID, upload prefix, public domain recorded and consistent                    | missing or conflicting values                                   |
| A2O, Zombie Hug, Hotel Lobby, Kairo templates          | Each configured template HEAD succeeds at computed physical key                                      | any missing or mismatched configured key                        |
| Completed-task sample from each module (**hard gate**) | DB logical key + computed physical key + HEAD size are recorded and agree                            | missing object, only doubled object present, unknown key source |
| Bare/doubled historical objects (**hard gate**)        | Listings complete and potential orphans inventoried; no affected completed tasks unresolved          | uninspected/ambiguous legacy objects                            |
| A2O workflow                                           | `genjutsu-ai/uploads/genjutsu/templates/a2o-lite-ai-v2.mp4` verified against effective Bucket/prefix | differs from production                                         |
| CDN sample                                             | Expected URL resolves correctly, including any legacy Unicode/space names                            | inaccessible/redirect-to-wrong-object                           |

Only check privacy-safe metadata. Sample keys may include user identifiers:
redact them in shared audit attachments.

1. Verify current Admin/config values for Bucket, `r2_endpoint`, `r2_account_id`, `r2_upload_path`, and public domain. **Do not paste credentials into reports**.
2. List or HEAD existing objects read-only, verifying the paths of A2O Lite, Zombie Hug, Hotel Lobby, and Kairo Bad Times (including alternate pet/preview templates when configured). Use the actual configured keys and prefixes, not assumed defaults.
3. **HARD GATE:** Sample completed jobs from each business module: compare each saved logical `storageKey` to the physical key computed by the new resolver. Check object existence and byte length by read-only HEAD; do not rewrite DB keys.
4. **HARD GATE:** Search for historical bare/unprefixed objects and already-doubled `uploads/uploads/` objects. Document any exceptions separately with affected logical keys; do not automatically copy or migrate.
5. Confirm the A2O Lite workflow's **physical** Bucket + Key path still matches current production prefix: `genjutsu-ai/uploads/genjutsu/templates/a2o-lite-ai-v2.mp4`. If production prefix changes, update workflow in a separate reviewed change.
6. Check sample public/CDN URL mappings, especially non-ASCII and spaces. The presence of an R2 object does not by itself imply the CDN is publicly accessible.

## Staged verification after deploy

Use a test account to exercise browser upload (including Genjutsu Workers proxy upload), signed PUT/HEAD, staging → sealed copy, generation persistence, signed result read, and existing historical work reads in each product. Inspect 404, 403, Copy Source, content type, and object size errors before increasing traffic.

**This branch’s code change does not migrate objects, rewrite DB keys, or run the
manual template-sync GitHub Action.** During the 2026-10-25 audit, one
**exceptional** production PUT was performed to seed a missing in-use template:

- logical `genjutsu/templates/say-it-right-ai-v1.mp4`
- physical `uploads/genjutsu/templates/say-it-right-ai-v1.mp4`
- source `public/videos/say-it-right-dance-tpl.mp4` via `pnpm r2:put`
- recorded in `docs/plans/2026-10-25-r2-object-key-audit-result.md`

That PUT is an asset-gap fix for Workers `ensure*TemplateInR2` (which cannot
seed from disk on Cloudflare), **not** a double-prefix remediation or key-scheme
migration. Merge and deploy only after hard gates pass and an operator signs the
audit in the PR.

Audit signed off by: **CoderLim** (via `/ship-to-cf`). Date: **2026-10-25**.  
Evidence: `docs/plans/2026-10-25-r2-object-key-audit-result.md`.

## Rollback

On 404, signature, Copy Source, or object-location regressions: revert this code version and corresponding config changes while leaving existing R2 objects and saved storage keys unchanged. Investigate the logical-to-physical key mismatch before separately planning any targeted remediation.
