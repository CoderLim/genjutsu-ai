# Fal queue URLs: submit, poll, recover

Based on `main` at `13c2219`. This is a provider-transport reliability fix, not a model-specific endpoint update.

## Root cause and invariant

Some Fal endpoints accept POST on a longer path (for example,
`minimax/h3-max-turbo/text-to-video`), while queue GETs may live at
`/{owner}/{app}/requests/{requestId}`. Deriving GET URLs by splitting
the submission model name caused successful paid jobs to go to
`query_review`.

**New invariant:** The canonical queue `status_url` and `response_url`
from Fal's POST response are bound to the corresponding `request_id`.
Reconciliation uses this saved pair, not the current product model profile.

## Implementation

- `core/ai/fal.ts`: `FalProvider.generate()` already exposes the raw
  Fal POST response in `taskResult`. `FalProvider.query()` now accepts
  optional verified queue URLs, uses them for both status and result GETs,
  and disables redirect-following when sending an API key.
- `core/ai/fal-queue-urls.ts`: strict URL allowlist: HTTPS only,
  `queue.fal.run` only, exactly the queue GET path, same request ID,
  matching status and result parent path, no credentials, query, fragments,
  or encoded/path-traversal segments. Untrusted/malformed values are never
  fetched.
- `modules/generator/adapters.ts`: extract the validated pair from
  the Fal POST result, pass it through the provider abstraction.
- `modules/generator/billing.ts`: atomically store the pair in
  `aiTask.taskInfo` alongside `aiTask.taskId` on successful submit.
  If the DB write fails after Fal accepted the task, the
  `submission_unknown` recovery path also attempts to persist both.
  No schema migration is needed. `taskInfo` is deliberately separate
  from `taskResult`, which is overwritten by polling / claims / refunds.
- `modules/generator/service.ts`: query the saved endpoint and URLs
  for this exact task. An exception, including corrupt persisted metadata,
  counts toward the existing `query_review` policy rather than leaving
  the task in Processing. A lookup failure is *not* a reason to refund.
- **Legacy compatibility:** Old tasks without saved URLs continue to use
  the existing `falQueueQueryModel` fallback. This includes the
  `bytedance/*` and nested `/edit` special cases. No automatic
  resubmission or account debit occurs when polling.

## Operational recovery for prior query_review jobs

The production example `37248de4…` entered `query_review` before queue
URLs were stored and is not silently reopened by this change. An admin should
verify the Fal request ID and account result, then invoke
`POST /api/admin/generator/resolve` with `action: "resume-query"` and
the existing required `generationId`, `userId`, and operator `note`.
The task is queried using the current legacy fallback. If Fal still returns
404 for that request, the operator must use the verified provider status/result
URLs to recover the output through an audited repair, not create a second
charged task or automatically refund a possibly successful one.

## Release and verification gates

1. Run `pnpm test` (including `fal-submit.test.ts` and
   `fal-queue-metadata.test.ts`) and `pnpm build`.
2. Stage Fal H3 Max Turbo **text-to-video** and image-to-video jobs:
   verify the saved `taskInfo.falQueue` equals the POST response and
   polling calls the exact pair. Check R2 persistence and My Creations.
3. Test a different nested model path (for example Kling V3 Pro).
4. Verify legacy queued jobs with no `taskInfo` continue polling.
5. Simulate Fal queue 404/5xx and tampered queue metadata:
   no API key may leave `queue.fal.run`; no automatic refund;
   repeated inconclusive lookup enters admin review.
6. Confirm actual provider billing and credit accounting. Neither
   code-level tests nor `precision: exact` stand in for a real API
   smoke test.

Source: https://fal.ai/docs/api-reference/inference-api/queue/submit-path
and https://fal.ai/docs/api-reference/inference-api/queue/status

No production deployment or data migration is performed by this patch.
