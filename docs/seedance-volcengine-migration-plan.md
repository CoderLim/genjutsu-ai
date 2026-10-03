# Seedance 2.5: fal.ai → Volcengine Ark migration plan

Status: proposed  
Scope: provider migration plan only; no runtime behavior changed by this document  
Verified against Volcengine Ark docs: 2026-10-03

Related: [Seedance 2.5 workflow adapter](./seedance-workflow.md)

## 1. Goal

Move the current Seedance 2.5 path from fal.ai to Volcengine Ark as the primary backend while keeping the existing Genjutsu product workflows and R2 result pipeline stable.

Target outcomes:

- Keep **Motion Transfer** and **Objects Swap** on Seedance 2.5.
- Use Volcengine model \`doubao-seedance-2-5-260628\`.
- Reduce provider cost without coupling the migration to a customer-pricing change.
- Preserve historical fal Seedance tasks so they can still be polled/reconciled.
- Keep fal available as an operational fallback for **new** jobs.
- Never automatically resubmit an ambiguous in-flight job to another provider.

Non-goals for the first rollout:

- Do not remove Higgsfield.
- Do not remove fal.
- Do not change the public credit packs.
- Do not relax the current "no real people" product policy.
- Do not add 1080p/4K product options as part of this migration.
- Do not redesign the Generator UI.

## 2. Verified Ark capabilities

Volcengine Ark exposes Seedance 2.5 through:

~~~text
POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
model = doubao-seedance-2-5-260628
~~~

The current two product workflows map to Ark as follows:

| Product workflow | Current fal task | Ark task |
| --- | --- | --- |
| Motion Transfer | \`reference\` | \`omni_reference_task_type=reference\` |
| Objects Swap | \`editing\` | \`omni_reference_task_type=edit\` |

For Ark **edit** tasks:

- at least one \`reference_video\` is required;
- source video must be 4–30 seconds;
- \`ratio=adaptive\`;
- \`duration=-1\`;
- the prompt must clearly express an edit intent such as replace/modify/remove/add.

This matches the existing 4-second upload/server gate for Objects Swap.

Seedance 2.5 Ark inputs relevant to Genjutsu:

- image: \`type=image_url\`, \`role=reference_image\`;
- video: \`type=video_url\`, \`role=reference_video\`;
- 480p / 720p / 1080p output supported;
- callback URL is supported;
- terminal-user identifier is supported through \`safety_identifier\`;
- successful task responses expose \`usage.completion_tokens\`;
- generated result URLs expire, so successful results must continue to be copied to R2.

The current site restriction on real-person media remains in place. Ark's own Seedance documentation also states that direct reference image/video inputs containing real human faces are not supported in the normal path, so there is no reason to loosen the product gate during this migration.

## 3. Current repository state

Today the logical provider type is:

~~~ts
type GenjutsuProvider = 'higgsfield' | 'seedance';
~~~

The value \`seedance\` is currently coupled to fal.ai:

- \`src/modules/genjutsu/seedance.ts\`
  - calls \`https://queue.fal.run\`;
  - reads the Fal key;
  - builds fal-specific \`image_urls/video_urls/task\` payloads;
  - uses fal list-rate constants;
  - polls fal queue endpoints.
- \`src/modules/genjutsu/workflow.ts\`
  - resolves Seedance to \`bytedance/seedance-2.5/us/reference-to-video\`.
- \`aiTask.provider\` and \`aiTask.model\` are persisted and later used for polling.
- successful output is copied to R2 before completion.
- customer credits are reserved before provider submit.
- \`settleGenjutsuGeneration\` currently marks completion but does **not** reconcile the reserved customer-credit amount against a final provider invoice.

That last point matters: provider cost migration and customer price changes must be treated as separate work.

## 4. Provider identity strategy

### Decision

Do not reinterpret historical \`provider='seedance'\` rows.

Use:

~~~ts
type GenjutsuProvider =
  | 'higgsfield'
  | 'seedance'              // legacy/current fal backend
  | 'seedance-volcengine';  // new Ark backend
~~~

Why:

1. Existing jobs already persist \`provider='seedance'\` with a fal model path.
2. Changing the meaning of that value would make old submitted jobs poll the wrong API.
3. A new explicit provider value makes task recovery deterministic.
4. It avoids a database migration solely for naming.

Later cleanup may rename \`seedance.ts\` to \`seedance-fal.ts\`, but that is not required for the first safe rollout.

## 5. Proposed architecture

~~~text
Generator
  -> /api/genjutsu/generate
  -> resolveGenjutsuProviderTarget(mode)
       -> higgsfield
       -> seedance               (fal, legacy/fallback)
       -> seedance-volcengine    (Ark, new primary)
  -> provider-specific quote
  -> reserve customer credits
  -> claim submission
  -> provider submit
  -> persist provider + model + provider task ID
  -> provider-specific polling/callback verification
  -> copy successful result to R2
  -> mark complete / refund on definitive failure
~~~

Add:

~~~text
src/modules/genjutsu/seedance-volcengine.ts
~~~

Do not initially move the existing fal implementation. Keep the migration diff easy to review.

The new adapter should own:

- Ark authentication;
- Ark request payload construction;
- create task;
- get task;
- status normalization;
- Ark error normalization;
- token/cost extraction;
- callback-aware status handling.

Shared product workflow intent should remain in \`workflow.ts\`.

## 6. Configuration

Add server-only configuration:

~~~env
ARK_API_KEY=
ARK_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
SEEDANCE_VOLCENGINE_MODEL=doubao-seedance-2-5-260628

# rollout
GENJUTSU_MOTION_PROVIDER=seedance-volcengine
GENJUTSU_OBJECT_SWAP_PROVIDER=seedance-volcengine

# emergency routing for NEW jobs only
GENJUTSU_SEEDANCE_FALLBACK_PROVIDER=seedance
~~~

Recommended rollout behavior:

- production starts with existing routing unchanged;
- enable Ark for one workflow first;
- then enable both after quality/cost checks;
- fallback is a routing/config decision for new jobs, not an automatic retry of an already-submitted job.

Do not expose \`ARK_API_KEY\` to the browser.

P0 may use an environment secret only. Admin-panel credential support can be added after the provider path is proven.

## 7. Payload mapping

### 7.1 Shared reference labels

The existing prompt builder emits fal-oriented references such as \`@Video1\` and \`@Image1\`.

Do not assume those literal labels have identical semantics on Ark.

Refactor the prompt builder so product intent is shared but provider reference tokens are injected:

~~~ts
buildSeedanceWorkflowPrompt({
  mode,
  userPrompt,
  imageCount,
  references: {
    video: '@视频1',
    images: ['@图片1', '@图片2'],
  },
});
~~~

The exact Ark labels should be covered by adapter tests and one live smoke test.

### 7.2 Motion Transfer

Ark request shape:

~~~json
{
  "model": "doubao-seedance-2-5-260628",
  "omni_reference_task_type": "reference",
  "content": [
    {
      "type": "text",
      "text": "<motion-transfer workflow prompt>"
    },
    {
      "type": "video_url",
      "video_url": { "url": "<signed R2 source URL>" },
      "role": "reference_video"
    },
    {
      "type": "image_url",
      "image_url": { "url": "<signed R2 reference URL>" },
      "role": "reference_image"
    }
  ],
  "resolution": "720p",
  "ratio": "adaptive",
  "duration": 4,
  "generate_audio": true,
  "safety_identifier": "<stable end-user id>",
  "callback_url": "<app>/api/genjutsu/webhook"
}
~~~

For \`reference\`, duration may be explicit when we want source-length output. Keep the current source-duration probe and clamp to the supported range. Do not trust a browser-supplied duration.

### 7.3 Objects Swap

Ark request shape:

~~~json
{
  "model": "doubao-seedance-2-5-260628",
  "omni_reference_task_type": "edit",
  "content": [
    {
      "type": "text",
      "text": "视频编辑：把 @视频1 中的目标替换为 @图片1 ..."
    },
    {
      "type": "video_url",
      "video_url": { "url": "<signed R2 source URL>" },
      "role": "reference_video"
    },
    {
      "type": "image_url",
      "image_url": { "url": "<signed R2 reference URL>" },
      "role": "reference_image"
    }
  ],
  "resolution": "720p",
  "ratio": "adaptive",
  "duration": -1,
  "generate_audio": true,
  "safety_identifier": "<stable end-user id>",
  "callback_url": "<app>/api/genjutsu/webhook"
}
~~~

Important: do not translate fal's \`duration='auto'\` / \`aspect_ratio='auto'\` literally. Ark edit requires \`duration=-1\` and \`ratio='adaptive'\`.

## 8. Billing and cost accounting

### 8.1 Provider cost

Ark video cost is token based.

Official estimate formula:

~~~text
estimated tokens
= (input video seconds + output video seconds)
  × output width
  × output height
  × output fps
  / 1024
~~~

For successful jobs, use Ark's returned:

~~~text
usage.completion_tokens
~~~

as the provider-cost accounting source.

Seedance 2.5 with video input currently uses the lower "contains video input" rate. As of verification on 2026-10-03, the published rate is ¥42 / 1M tokens. Treat the rate as configuration/data, not as an eternal constant.

Add a cost payload such as:

~~~ts
{
  source: 'volcengine_seedance_estimate',
  currency: 'CNY',
  rateCnyPerMillionTokens,
  estimatedTokens,
  estimatedProviderCostCny,
  sourceDurationSeconds,
  estimatedOutputDurationSeconds,
  resolution,
  fxCnyPerUsdSnapshot
}
~~~

After success, persist actual usage:

~~~ts
{
  completionTokens,
  actualProviderCostCny,
  fxCnyPerUsdSnapshot,
  actualProviderCostUsd
}
~~~

### 8.2 Customer credits: recommended P0/P1 behavior

Do **not** automatically make customer credits 60% cheaper just because the provider became cheaper.

The current product model couples:

~~~text
providerCostUsd -> calculateGenjutsuCredits() -> customer charge
~~~

That coupling should be split.

Recommended first rollout:

- Ark lowers internal provider cost.
- Keep the existing Seedance customer-credit schedule stable.
- Record actual Ark cost for margin analytics.
- Decide customer repricing separately after observing real success rate, retries and token usage.

This avoids silently changing product economics during an infrastructure migration.

### 8.3 Later pricing cleanup

Introduce two explicit concepts:

~~~ts
type GenjutsuQuote = {
  customerCredits: number;
  estimatedProviderCost: Money;
  pricingVersion: string;
};
~~~

Then customer pricing may use a product rate card while provider cost is accounting-only.

If we later want exact cost-plus charging, \`settleGenjutsuGeneration\` must first gain atomic delta settlement/refund support. It does not have that capability today.

## 9. Status, callback and R2 durability

Normalize Ark statuses:

~~~text
queued     -> processing
running    -> processing
succeeded  -> completed
failed     -> failed
expired    -> failed/reviewable timeout state
cancelled  -> failed
~~~

Rules:

1. A callback is only a wake-up signal.
2. As today, verify final state by querying the provider before mutating billing state.
3. On success, download/copy the Ark result into R2 **before** marking the Genjutsu task completed.
4. Store \`usage.completion_tokens\` before/with completion.
5. Ark result URLs are temporary; never expose them as the durable canonical result.
6. Preserve current submission claim/idempotency protection.

The existing webhook route can dispatch by persisted \`task.provider\`.

## 10. Fallback safety

fal should remain available, but fallback must not create duplicate paid jobs.

Safe automatic fallback is allowed only when we know Ark did not create a task, for example:

- configuration/credential preflight failure before request;
- explicit rate-limit rejection returned before task creation;
- deterministic synchronous validation error where changing backend is intentionally allowed.

Do **not** auto-fallback after:

- network timeout after POST;
- connection reset after request body was sent;
- Ark 5xx where task creation is uncertain;
- any response where a task ID may have been created.

For ambiguous submission, keep the current \`submission_unknown\` pattern and reconcile Ark by request/task information rather than creating a fal job.

Operationally, the safest fallback is a circuit breaker that routes **subsequent new requests** to fal.

## 11. Error mapping

Create \`VolcengineSeedanceHttpError\` with:

- HTTP status;
- Ark error code;
- normalized message;
- raw payload.

Map known categories into existing product errors:

- invalid task constraints -> user input / validation;
- real-person / likeness rejection -> existing no-real-people UI message;
- quota / balance / rate limit -> provider unavailable, no customer credit loss;
- definitive task failure -> refund reserved customer credits;
- ambiguous transport -> \`submission_unknown\`, no immediate resubmit.

Do not surface raw Ark internal messages directly when they contain implementation detail.

## 12. Implementation phases

### Phase A — adapter + unit tests, no routing change

Files:

- add \`src/modules/genjutsu/seedance-volcengine.ts\`;
- add \`src/modules/genjutsu/seedance-volcengine.test.ts\`;
- update \`src/modules/genjutsu/types.ts\`;
- update \`src/config/index.ts\`;
- update \`.env.example\`;
- update \`src/modules/genjutsu/service.ts\`;
- update \`src/modules/genjutsu/workflow.ts\` only as needed for provider-specific reference labels.

Tests must cover:

- Motion Transfer -> \`reference\`;
- Objects Swap -> \`edit\`;
- edit always sends \`ratio=adaptive\`, \`duration=-1\`;
- 4s lower bound and 30s upper bound;
- 1–8 current product image references map to \`reference_image\`;
- signed R2 URLs only;
- no client-provided cost/duration authority;
- status mapping;
- malformed task ID rejection;
- callback URL;
- no accidental fal call from Ark adapter.

### Phase B — provider cost telemetry

Before routing production traffic:

- calculate estimate using server-probed duration;
- persist Ark quote metadata;
- on successful smoke jobs record \`usage.completion_tokens\`;
- calculate actual CNY provider cost;
- log estimate-vs-actual delta.

Do not alter public credit-pack pricing in this phase.

### Phase C — live smoke

Run a small controlled matrix against fal and Ark with the same inputs:

1. perfume/product -> plant/object replacement;
2. cat dance -> illustrated/animal reference Motion Transfer;
3. 4s exact-boundary edit;
4. 5–10s normal edit;
5. fast motion;
6. occlusion / subject turn;
7. moving camera;
8. portrait source;
9. landscape source;
10. multiple independent reference images.

Record:

- submit success;
- final success;
- latency;
- unintended edits;
- motion fidelity;
- replacement identity consistency;
- output duration;
- Ark completion tokens;
- actual provider cost;
- R2 persist success;
- retry/failure reason.

### Phase D — canary rollout

Recommended sequence:

~~~text
1. Objects Swap: Ark 10%
2. Objects Swap: Ark 50%
3. Objects Swap: Ark 100%
4. Motion Transfer: Ark 10%
5. Motion Transfer: Ark 50%
6. Motion Transfer: Ark 100%
~~~

If the current router cannot percentage-split deterministically, use explicit environment toggles and short canary windows rather than adding random routing inside request handling.

Persist the selected provider before submit so a config change never moves an in-flight job to another backend.

### Phase E — default + cleanup

After Ark is stable:

- make \`seedance-volcengine\` the Seedance default for new jobs;
- retain fal for emergency routing;
- keep legacy \`provider='seedance'\` polling forever or until all historical tasks are terminal;
- optionally rename \`seedance.ts\` -> \`seedance-fal.ts\` in a cleanup-only commit;
- consider decoupling customer pricing from provider cost;
- add an admin cost dashboard if volume justifies it.

## 13. Rollback

Rollback must be configuration-only for new jobs:

~~~env
GENJUTSU_MOTION_PROVIDER=seedance
GENJUTSU_OBJECT_SWAP_PROVIDER=seedance
~~~

Do not mutate already-submitted Ark tasks.

During rollback:

- Ark tasks continue polling Ark because \`aiTask.provider='seedance-volcengine'\`;
- fal tasks continue polling fal because \`aiTask.provider='seedance'\`;
- completed results remain provider-independent in R2.

This is the primary reason to persist backend identity explicitly.

## 14. Acceptance criteria

Migration is ready to become default when all are true:

- existing fal/Higgsfield tests remain green;
- Ark adapter unit tests are green;
- no duplicate-provider submission is possible for the same generation ID;
- Objects Swap 4–30s constraints match Ark;
- Motion Transfer works with the same product-level intent;
- successful Ark output is durably stored in R2;
- final Ark token usage is persisted;
- failed Ark jobs refund customer credits exactly once;
- ambiguous submission does not auto-submit to fal;
- historical \`provider='seedance'\` rows still poll fal;
- canary quality is not materially worse than the current fal Seedance path;
- measured Ark cost reduction is confirmed from actual \`completion_tokens\`, not only list-price math.

## 15. Suggested commit sequence

Keep implementation reviewable:

1. \`test(genjutsu): define Volcengine Seedance 2.5 adapter contract\`
2. \`feat(genjutsu): add Volcengine Seedance 2.5 adapter\`
3. \`feat(genjutsu): route persisted Ark provider tasks\`
4. \`feat(genjutsu): record Ark token usage and provider cost\`
5. \`test(genjutsu): cover Ark fallback and ambiguous submission\`
6. \`chore(genjutsu): enable Ark Seedance canary\`

Do not combine the first production routing change with the adapter implementation commit.

## 16. Official references

Verified 2026-10-03:

- Seedance 2.5 guide: https://docs.volcengine.com/docs/ark/seedance-2-5?lang=zh
- Create video generation task: https://docs.volcengine.com/docs/ark/create-video-generation-task-api?lang=zh
- Video model pricing: https://docs.volcengine.com/docs/ark/model-pricing?lang=zh
- List/query video tasks: https://docs.volcengine.com/docs/ark/list-video-generation-tasks-api?lang=zh

Key facts to re-check immediately before production rollout because providers can change them:

- model ID;
- token rate;
- minimum-token rules;
- input/output duration constraints;
- callback semantics;
- result URL expiry;
- content policy / likeness restrictions.
