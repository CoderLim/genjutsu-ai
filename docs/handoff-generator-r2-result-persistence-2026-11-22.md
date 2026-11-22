# Generator: Fal Completed but R2 save stays completing

Based on GitHub `main` commit `0717774` at the time this branch was created.

## Confirmed production incident (from Worker tail and read-only D1 evidence)

- Generation: `234c85e4-925d-4b72-a778-1fce2261fe5b`
- Fal model: `bytedance/seedance-2.0/mini/text-to-video`
- Fal request: `01a20373-d571-7ab0-a418-f050aa3dff22`
- D1 status: `completing`, refreshes completion lease every ~3 minutes.
- Fal already returned Completed. `claimGeneratorCompletion` succeeded.
- Cloudflare Worker error:
  `TypeError: Provided readable stream must have a known length`
  in `saveProviderOutput → persistGeneratorResults`.
- Root cause: `R2_BUCKET.put(key, response.body.pipeThrough(new TransformStream(...)))`
  passes an unknown-length stream. R2 rejects it even though the source
  may have a known upstream length.
- This is a **result persistence failure**, not a failed Fal generation or
  incorrect status URL. Do not refund or submit another paid Fal request.

## Fix

- Workers R2 result persistence now uses `R2Bucket.createMultipartUpload`
  and `uploadPart` with **8 MiB Uint8Array parts**; the last part may be
  shorter. Multipart uploads complete only after the whole source stream
  finishes and all size checks pass. No `R2.put(TransformStream)` is used.
  Only one part is buffered at a time, not an entire 300MB video.
- The downloader still permits only trusted HTTPS media CDNs and validates
  each redirect before following; Fal queue URLs and provider tokens are
  unaffected.
- The maximum 300 MiB video / 30 MiB image limits are enforced while
  downloading, whether or not Content-Length is present. When the upstream
  declares Content-Length, a mismatch fails and aborts instead of storing
  incomplete data.
- On network, R2 part, size or completion failure, the multipart upload
  is aborted. `completed` is written to D1 only when all result keys are
  persisted.
- The first two persistence failures keep the claim lease and set a generic
  customer-visible save/retry warning. Lease expiry permits another
  reconciliation with the **same Fal request ID**.
- Three consecutive persistence failures transition to
  `persistence_review`, halting automatic polling and notifying support.
  The result diagnostic is stored as `task_result.persistenceMessage`,
  while the customer sees a safe generic message. Failure counters persist
  across completion lease reclamation and are updated with claim-token CAS.
- Admin `resume-query` supports `persistence_review` and refreshes the
  result from the original provider. Manual refund requires verified
  upstream billing and explicit operator approval. No automatic refund,
  another Fal POST or schema migration.

## R2 source material

- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
- https://developers.cloudflare.com/r2/api/workers/workers-multipart-usage/

Cloudflare requires known-length streams for `R2.put` and
`uploadPart` when passing a stream; multipart `uploadPart` also accepts
known-length byte arrays. Each non-final part must be at least 5 MiB, so
8 MiB satisfies the requirement.

## Release gates

1. CI: `pnpm test`, `pnpm build`, relevant TypeScript checks.
2. Worker staging test with a **real Fal output whose response lacks
   Content-Length**: verify multipart complete, R2 HEAD size, D1
   `completed`, and My Creations / Latest generation playback.
3. Inspect `234c85e4…`: the `completing` task will be eligible for
   lease reclaim (3 minutes) once this fix is deployed, unless its
   provider result URL has expired. An admin can trigger `reconcile`
   for it and observe the output key. No refunds / new requests.
4. Inspect older `31cd04c8…` (query_review from Workers unsupported
   `redirect: 'error'`): after the R2 fix is deployed, admin
   `resume-query` can reuse that exact request ID, if Fal still
   exposes the result.
5. Check all other `scene='generic-generator'` tasks with
   `status='completing'` or `persistence_review`. Do not bulk-force
   them to completed without verifying R2 objects.
6. Confirm the production Cloudflare deployment includes this commit;
   passing GitHub unit tests does not prove the real Worker/R2 path.

Read-only D1 inspection:

```sql
SELECT id, status, model, task_id,
       json_extract(task_result, '$.persistenceFailureCount') AS failures,
       json_extract(task_result, '$.persistenceMessage') AS storage_error,
       json_extract(task_result, '$.resultKeys') AS result_keys
FROM ai_task
WHERE scene = 'generic-generator'
  AND (
    id = '234c85e4-925d-4b72-a778-1fce2261fe5b'
    OR status IN ('completing', 'persistence_review')
  );
```
