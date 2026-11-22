# Fal queue URLs: submit, poll, recover

Based on `main` at `13c2219`. This is a provider-transport reliability fix, not a model-specific endpoint update.

## Root cause and invariant

Some Fal endpoints accept POST on a longer path (for example,
`minimax/h3-max-turbo/text-to-video`). Fal's public queue documentation
shows GETs at `/{owner}/{app}/requests/{requestId}`, but the production
incident demonstrated that hard-coding a two-segment lookup can instead
miss a completed request. **Neither two-segment nor multi-segment queue
GET paths should be inferred from the submitted model ID.** The POST
response URL is the only authoritative lookup location for new jobs.

**New invariant:** The canonical queue `status_url` and `response_url`
from Fal's POST response are bound to the corresponding `request_id`.
Reconciliation uses this saved pair, not the current product model profile.

## Implementation

- `core/ai/fal.ts`: `FalProvider.generate()` already exposes the raw
  Fal POST response in `taskResult`. `FalProvider.query()` now accepts
  optional verified queue URLs, uses them for both status and result GETs,
  and disables redirect-following when sending an API key.
- `core/ai/fal-queue-urls.ts`: strict URL allowlist: HTTPS only,
  `queue.fal.run` only. Accept **one or more safe model path segments**
  before the final `/requests/{requestId}` and optional `/status`;
  require the identical request ID and the exact matching status/result URL
  pair. Reject userinfo, query, fragments, wrong host/port, percent-encoded
  or traversal segments, and changed URL normalization. Do not truncate
  canonical URLs to two segments. Untrusted/malformed values are never fetched.
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
- **Compatibility only:** Tasks without saved URLs still start at
  `falQueueQueryModel` (including the historic `bytedance/*` and `/edit`
  rules). On a 404/405, a **bounded, model-agnostic** list of alternate
  submitted-model prefixes is tried, including both two-segment → full
  path (Seedance Mini) and full path → two-segment (MiniMax/Kling) recovery.
  It never retries other errors and never sends a second POST. These paths
  are strictly a fallback, **not** the canonical route for new jobs. A
  saved canonical URL is never replaced by a guessed fallback.
- A new Fal submission with missing/invalid `status_url` or `response_url`
  now logs a server-side warning with request ID, endpoint, and the presence
  of response fields, without dumping provider credentials or the full raw
  response. Its `taskInfo` saves `falQueueUrlState: missing-at-submit` so
  it is distinguishable from legacy null metadata. Recovery stays bounded;
  no automatic refund or second generation is allowed.

## Operational recovery for prior query_review jobs

The production example `37248de4…` entered `query_review` before queue
URLs were stored and is not silently reopened by this change. An admin should
verify the Fal request ID and account result, then invoke
`POST /api/admin/generator/resolve` with `action: "resume-query"` and
the existing required `generationId`, `userId`, and operator `note`.
The task is queried using the legacy lookup algorithm (including its
single owner/app retry on a 404/405). If Fal still returns 404, the
operator must confirm the provider's actual result/URLs and recover through
an audited repair, not create a second charged task or automatically refund
a possibly successful one.

## Canonical URL examples and verification status

**These are examples, not a captured MiniMax production response:**

```text
# Two segments: fal API docs example shape
https://queue.fal.run/minimax/h3-max-turbo/requests/<requestId>
# Three segments: supported by validator, not yet observed live
https://queue.fal.run/minimax/h3-max-turbo/text-to-video/requests/<requestId>
# Deeply nested: supported by validator, not yet observed live
https://queue.fal.run/fal-ai/kling-video/v3/pro/text-to-video/requests/<requestId>
```

Mock transport tests now assert that both two-segment and multi-segment
canonical URLs survive parsing and are used **verbatim** for GET requests.
This does not establish which shape Fal currently emits for MiniMax.

**Actual Fal smoke: not executed in this patch.** No verified staging
Fal API credentials or raw submit response were available to this
GitHub code-editing session. The production sign-off owner must:

1. Submit a paid/staging H3 Max Turbo text-to-video request; capture
   `request_id`, `status_url` and `response_url` from the raw
   **POST response** (redact request IDs and tokens in PR comments).
2. Confirm the actual returned URL pair passes validation unchanged
   and matches `aiTask.taskInfo.falQueue`, then inspect status/result
   GETs and R2/DB completion for the **same** task.
3. Optionally run the same path check with Kling v3, which has a
   deeper model endpoint path.
4. Document only observed endpoint shape as live evidence; do not
   infer multi-segment status URLs from the original 404 incident.

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

## Seedance 2.0 Mini query_review follow-up

The pictured task `31cd04c8…` shows the correct **customer-visible**
review state, not an upstream generation failure. However the screenshot
alone does **not** identify which Fal URL returned 404, whether the saved
queue metadata was missing, or whether status vs result fetch failed.

Read the D1 `ai_task` record before changing provider-specific routing:

```sql
SELECT id, status, model, task_id,
       json_extract(task_info, '$.falQueue.statusUrl') AS status_url,
       json_extract(task_info, '$.falQueue.responseUrl') AS response_url,
       json_extract(task_info, '$.falQueueUrlState') AS url_state,
       json_extract(task_result, '$.providerStatus') AS provider_status,
       json_extract(task_result, '$.queryMessage') AS query_message,
       json_extract(task_result, '$.queryFailureCount') AS failure_count
FROM ai_task
WHERE scene = 'generic-generator' AND id LIKE '31cd04c8%';
```

If `status_url` is present, the provider queried that URL directly;
the legacy `bytedance/*` truncation **cannot** be the root cause. Check
actual Fal request ID, status/result GET response, authentication, output
availability, and whether the current Cloudflare deployment includes PR #38.
If `status_url` is missing, the old two-segment lookup may have returned
404; the new bounded fallback tries the original full
`bytedance/seedance-2.0/mini/text-to-video` path and intermediate prefixes.

An existing `query_review` job will not restart on its own. After deploying
the fix, an admin should verify the original Fal request and perform
`resume-query` for that task, keeping the original request ID and credit
reservation. **Never automatically retry generating or refund when upstream
execution might have succeeded.**

The fallback recovery unit tests are mocked, not proof of a real Mini result
or real Cloudflare D1/R2 status reconciliation.
