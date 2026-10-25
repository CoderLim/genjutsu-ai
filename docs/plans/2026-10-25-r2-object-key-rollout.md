# R2 object-key unification — rollout and read-only audit

Branch: `refactor/unify-r2-object-keys-20261025`.

## Contract

- Product database `storageKey`, upload descriptors, and API responses remain logical keys.
- S3 API, signed GET/PUT/HEAD, Copy Source, Workers `R2_BUCKET.put`, and provider/CDN URLs use `resolveR2ObjectKey(r2_upload_path, key)` exactly once.
- `r2_upload_path` defaults to `uploads`; fully prefixed keys are idempotent.
- Business-layer namespace, ownership, MIME, and byte-size checks are **not relaxed**.
- Do **not** migrate, delete, or overwrite any R2 objects as part of this change.

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

## Required production audit (read-only; not yet performed)

1. Verify current Admin/config values for Bucket, `r2_endpoint`, `r2_account_id`, `r2_upload_path`, and public domain. **Do not paste credentials into reports**.
2. List or HEAD existing objects read-only, verifying the paths of A2O Lite, Zombie Hug, Hotel Lobby, and Kairo Bad Times (including alternate pet/preview templates when configured). Use the actual configured keys and prefixes, not assumed defaults.
3. Sample completed jobs from each business module: compare each saved logical `storageKey` to the physical key computed by the new resolver. Check object existence and byte length by read-only HEAD; do not rewrite DB keys.
4. Search for historical bare/unprefixed objects and already-doubled `uploads/uploads/` objects. Document any exceptions separately with affected logical keys; do not automatically copy or migrate.
5. Confirm the A2O Lite workflow's **physical** Bucket + Key path still matches current production prefix: `genjutsu-ai/uploads/genjutsu/templates/a2o-lite-ai-v2.mp4`. If production prefix changes, update workflow in a separate reviewed change.
6. Check sample public/CDN URL mappings. The presence of an R2 object does not by itself imply the CDN is publicly accessible.

## Staged verification after deploy

Use a test account to exercise browser upload (including Genjutsu Workers proxy upload), signed PUT/HEAD, staging → sealed copy, generation persistence, signed result read, and existing historical work reads in each product. Inspect 404, 403, Copy Source, content type, and object size errors before increasing traffic.

**This branch does not run a production upload, a migration, or the manual template-sync GitHub Action.** Merge and deploy only after the above gates pass.

## Rollback

On 404, signature, Copy Source, or object-location regressions: revert this code version and corresponding config changes while leaving existing R2 objects and saved storage keys unchanged. Investigate the logical-to-physical key mismatch before separately planning any targeted remediation.
