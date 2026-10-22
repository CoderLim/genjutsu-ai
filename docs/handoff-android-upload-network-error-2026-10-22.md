# Handoff — Android Chrome `UPLOAD_NETWORK_ERROR` / `r2 missing`

**Date:** 2026-10-22  
**Status:** Open product bug (ops outreach partially done; upload path still broken for a cohort)  
**Audience:** Eng / ops picking up upload failures shown in Admin → Generations  
**Data source:** Prod D1 `genjutsu-ai-db` queried 2026-10-22 (remote)

---

## TL;DR

- Admin label **`r2 missing` ≠ R2 misconfigured**. It means the object was never written (`r2ObjectExists=false`).
- Dominant pattern: **Android Chrome** → browser `fetch` PUT fails with `TypeError: Failed to fetch` → task ends as `failed_preflight` → **0 credits charged**.
- Not one bad user: **209 failures / 64 users** (of which **187 / 56** are Android Chrome).
- Same-origin Worker proxy (`PUT` → `genjutsuai.net`) shipped earlier; **still fails** for many Android users (76 proxy-path failures / 29 users). Many die in **&lt;200ms** — request often never hits CF edge.
- Latest example: **Noob Bhai** (`noobherahuga13@gmail.com`) — 5/5 fails today, IN / Airtel, proxy host.

---

## What the Admin UI strings mean

| UI / field                                    | Meaning                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| `failed_preflight`                            | Attempt created; upload/seal never completed; no generate billing           |
| Stage `upload_requested` / failed at `upload` | Client reported upload failure via `/api/genjutsu/attempt-failure`          |
| `UPLOAD_NETWORK_ERROR`                        | Browser-side network failure (`httpStatus=null`, usually `Failed to fetch`) |
| `r2 missing`                                  | Server HEAD: object not in R2                                               |
| `3x · ~3s · Chrome/Android · online`          | Client retried 3×; diagnostics attached                                     |
| `uploadHost=genjutsuai.net`                   | Same-origin proxy path (post-fix)                                           |
| `uploadHost=*.r2.cloudflarestorage.com`       | Legacy / large-file direct R2 PUT                                           |

Code pointers:

- Client report: `src/routes/api/genjutsu/attempt-failure.ts`
- Admin “r2 missing” rendering: `src/routes/admin/generations.tsx` (~580–610)
- Diagnostics shape: `src/lib/upload-diagnostics.ts`

---

## Snapshot (prod D1, 2026-10-22)

### Volume

| Metric                               |                Value |
| ------------------------------------ | -------------------: |
| `UPLOAD_NETWORK_ERROR` rows          |                  209 |
| Distinct users                       |                   64 |
| Android + Chrome                     | 187 fails / 56 users |
| OS/browser unknown (pre-diagnostics) |               15 / 5 |
| Non-Android (Win/mac/Linux, mixed)   |             ~7 total |

### Upload target host (among failures)

| Host                         | Notes                                             |
| ---------------------------- | ------------------------------------------------- |
| `genjutsuai.net`             | Proxy still failing — esp. IN, also DE/IR/KZ/CL/… |
| `*.r2.cloudflarestorage.com` | Pre-proxy / direct path — heavy IN/PK             |
| `null`                       | Older rows before host was persisted              |

### Android + proxy only (`uploadHost=genjutsuai.net`)

| Metric                  |                            Value |
| ----------------------- | -------------------------------: |
| Fails                   |                               76 |
| Users                   |                               29 |
| First attempt &lt;200ms |  **61** (local kill before edge) |
| Network type            | mix of 3g / 4g (not “only slow”) |

### Cohort shape

| Cohort                                                  | Users (approx) | Meaning                                           |
| ------------------------------------------------------- | -------------: | ------------------------------------------------- |
| Upload-failers with **only** `failed_preflight`         |         **41** | Never got past upload                             |
| Failers who later `completed`                           |          **2** | `mikeadamian@…`, `gengliming110@…` (owner/tester) |
| Failers with other post-upload statuses (e.g. refunded) |            few | Upload sometimes works                            |

---

## Case study A — Noob Bhai (today’s screenshot)

| Field         | Value                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| Email         | `noobherahuga13@gmail.com`                                                  |
| Name          | Noob Bhai                                                                   |
| User id       | `dec2fc3d-1aae-4fd3-9c9f-71dc0b019dd6`                                      |
| Tasks         | **5** — all `failed_preflight` / `UPLOAD_NETWORK_ERROR`                     |
| Window        | 2026-10-22 ~12:27–12:32 UTC+8                                               |
| Product       | objects-swap / image #1 / Genjutsu                                          |
| Client        | Chrome / Android · online                                                   |
| Geo           | `cfCountry=IN`, colo `MRS`, ASN **24560** (Airtel)                          |
| Host          | `genjutsuai.net` (proxy)                                                    |
| Error         | `Failed to fetch` · per-attempt ~50–70ms                                    |
| Network hints | 4× on 4g (rtt 100 / 10 Mbps), 1× on 3g (rtt 350 / 1.3 Mbps) — **both fail** |
| Credits       | 0                                                                           |

**Conclusion for this user:** same person, retry does not help on current network/device. Not unique — same class as historical PK/IN Android cohort.

Example `task_result` (trimmed):

```json
{
  "stage": "upload",
  "errorCode": "UPLOAD_NETWORK_ERROR",
  "error": "Network error while uploading image 1",
  "httpStatus": null,
  "attemptCount": 3,
  "browser": "Chrome",
  "os": "Android",
  "effectiveType": "3g",
  "origin": "https://genjutsuai.net",
  "uploadHost": "genjutsuai.net",
  "errorName": "TypeError",
  "errorMessage": "Failed to fetch",
  "cfCountry": "IN",
  "cfAsn": 24560,
  "r2ObjectExists": false,
  "r2InspectionStatus": "missing",
  "recovered": false
}
```

---

## Case study B — Exception: intermittent success

**`mikeadamian@gmail.com`** (DE, Android Chrome, proxy):

1. 2026-10-17 17:25–17:28 — **3×** `UPLOAD_NETWORK_ERROR` (`att1` ~19–22ms)
2. 17:28:54 — **`completed`**
3. Later same day — another **`completed`**

So the bug is **not always a permanent block** for every Android user; some are path/timing sensitive. Do not treat “retry forever” as equivalent to “never works for anyone.”

Other known ops note: `contentcreationn005@gmail.com` — 16/16 upload fails (PK Android); **money refunded** 2026-10-19; product bug left open. See `docs/paid-users-ops-2026-10-19.md` §B1.

---

## What we already tried (history)

| When       | Change                                                       | Outcome                                                                                       |
| ---------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| ~Oct 1     | Prod R2 credentials missing in D1 config                     | Separate issue; fixed via Admin Storage                                                       |
| ~Oct 4–5   | Client 3× retry + HEAD recovery + Admin diagnostics          | Helps flaky cases; **0 recovery** when object truly missing                                   |
| ~Oct 8     | Same-origin Worker proxy upload (`/api/genjutsu/upload/...`) | Routes traffic to `genjutsuai.net`; **Android cohort still fails**; edge often sees **0 PUT** |
| Post-proxy | Upload-only test gate for owner account                      | Confirmed proxy works from healthy networks                                                   |

Prior transcripts (for deep dive): `21f9b432…` (cohort + proxy), `9f8083ee…` (post-proxy PK still fails), `7921474e…` (first diagnosis), `73b892cf…` (ops / refund).

---

## Working hypothesis (current)

1. **Not** global R2 outage / missing bucket config (proxy host + HEAD “missing” + healthy networks succeed).
2. **Not** single-user / account corruption.
3. **Likely:** on some Android Chrome + carrier/network paths, large-body `fetch` PUT is aborted in the browser/local stack **before** Cloudflare receives it (explains &lt;200ms + `Failed to fetch` + `r2 missing`).
4. Direct R2 hostname was first suspect; **proxy proved insufficient** for the hard cohort.
5. Severity skewed to mobile markets (IN/PK historically; IN still dominant on proxy fails).

---

## Suggested next steps (for whoever picks this up)

### Product / eng

1. **Alternate upload client on Android** — try `XMLHttpRequest`, chunked upload, or compress/resize images before PUT; keep same server lifecycle (`attempt` → `upload-url` → upload → `seal-inputs` → `generate`).
2. **Failure UX** — after 2–3 `UPLOAD_NETWORK_ERROR`, tell user to switch Wi‑Fi / try desktop or iOS (better than silent retry).
3. **Telemetry** — persist raw UA + whether PUT hit Worker (already partially there); correlate with CF GraphQL/zone logs when investigating a user.
4. **&gt;95MB video** — still may force direct R2 (Worker body limit); treat as separate gap.

### Ops / support

- Credits are **not** consumed on these rows (`0 cr`).
- For paid users stuck 100% on upload: prefer money/credit remediation + “known Android upload issue” wording (pattern: contentcreationn005).
- Noob Bhai (today): unpaid upload-block pattern so far — watch if they pay then still fail.

### How to re-query prod

```bash
# User
npx wrangler d1 execute genjutsu-ai-db --remote --command \
  "SELECT id,name,email FROM user WHERE email='noobherahuga13@gmail.com';"

# Global volume
npx wrangler d1 execute genjutsu-ai-db --remote --command \
  "SELECT COUNT(*) total, COUNT(DISTINCT user_id) users
   FROM ai_task
   WHERE status='failed_preflight'
     AND json_extract(task_result,'\$.errorCode')='UPLOAD_NETWORK_ERROR';"

# OS/browser split
npx wrangler d1 execute genjutsu-ai-db --remote --command \
  "SELECT json_extract(task_result,'\$.os') os,
          json_extract(task_result,'\$.browser') browser,
          COUNT(*) cnt, COUNT(DISTINCT user_id) users
   FROM ai_task
   WHERE status='failed_preflight'
     AND json_extract(task_result,'\$.errorCode')='UPLOAD_NETWORK_ERROR'
   GROUP BY 1,2 ORDER BY cnt DESC;"
```

---

## Top users by upload-network fails (for triage)

| Email                         | Name             | Fails | Notes                          |
| ----------------------------- | ---------------- | ----: | ------------------------------ |
| pari208soni@gmail.com         | Pari Soni        |    21 | only `failed_preflight`        |
| contentcreationn005@gmail.com | Content creation |    16 | refunded money; bug open       |
| androgeek473@gmail.com        | Andro Geek       |     8 |                                |
| mishraji.babluji@gmail.com    | Bablu Mishra     |     8 |                                |
| mikeadamian@gmail.com         | Mike Adamian     |     7 | **exception: later completed** |
| muralescarino@gmail.com       | Murales Cariño   |     7 | also `refunded`; ops emailed   |
| noobherahuga13@gmail.com      | Noob Bhai        |     5 | **2026-10-22, 5/5**            |

---

## Related docs

- `docs/paid-users-ops-2026-10-19.md` — paid cohort B1 (`failed_preflight`), contentcreationn005 refund
- Pipeline rule: homepage Genjutsu chain (`attempt` → `upload-url` → upload → `seal-inputs` → `generate`) — any fix must stay on `/api/genjutsu/*`

---

## One-liner for Slack / email

> Android Chrome users (esp. IN/PK mobile) still can’t upload: browser `Failed to fetch` on PUT, object never lands in R2 (`r2 missing`). Same-origin proxy didn’t fix the hard cohort; ~64 users / 209 rows; latest 5/5 on `noobherahuga13@gmail.com`. Need a non-`fetch` or chunked upload path + clearer client fallback UX.
