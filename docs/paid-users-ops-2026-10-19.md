# Paid users ops snapshot — 2026-10-19

Source: prod D1 `genjutsu-ai-db` (queried 2026-10-19).  
Purpose: decide outreach / credit fix / refund / product follow-ups for paid users who never got a completed generation.

## Definitions

| Term             | Rule                                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Paid user**    | ≥1 `order.status = 'paid'` (subscription table is empty; no active-sub path)                                                                              |
| **Complete**     | ≥1 `ai_task.status = 'completed'`                                                                                                                         |
| **Orphan recon** | `payment_result.source = 'manual_reconciliation'` (“Historical Waffo orphan payment reconciliation”) — paid on Waffo, credits granted later by manual fix |

Payment and `ai_task` are **decoupled**: checkout buys credit packs; tasks are created only when the user starts a generation (`attempt` / product generate).

## Headline numbers

| Metric                                  |        Count |
| --------------------------------------- | -----------: |
| Paid users                              |       **36** |
| Paid with ≥1 complete                   | **17** (47%) |
| Paid with **0** complete                | **19** (53%) |
| Of which: never created any task        |        **4** |
| Of which: attempted but never completed |       **15** |

Paid orders total: 49 (`paid`). Abort/unpaid checkouts also exist (`created` / `failed`) and are ignored here unless noted.

---

## Cohort A — Paid, **0 tasks** (4) — “bought pack, never generated”

Likely causes (from ledger + payment_result):

1. **Waffo orphan / delayed credit** (2): user paid; site did not grant credits until ~3h later via manual reconciliation → bounce at “I paid but nothing happened”.
2. **Credits-first funnel + soft return** (2): Starter pack from pricing; success redirect is `#pricing` / billing, not generator; credits sit unused.

| Email                   | Name               | First paid (UTC) |    $ | Product         | Remaining credits | Orphan recon? | Notes                                                                                |
| ----------------------- | ------------------ | ---------------- | ---: | --------------- | ----------------: | :-----------: | ------------------------------------------------------------------------------------ |
| map.am.73@gmail.com     | Анастасия Майорова | 2026-10-02 12:18 | 4.99 | Starter Credits |               600 |    **Yes**    | Pay→credit delay ~202 min; +100 bonus grant later                                    |
| punyaprakash1@gmail.com | Punya Prakash      | 2026-10-02 12:46 | 4.99 | Starter Credits |               600 |    **Yes**    | Pay→credit delay ~174 min; +100 bonus grant later                                    |
| dunnsox91@yahoo.com     | Matt Dunn          | 2026-10-03 12:34 | 4.99 | Starter Credits |          **1000** |      No       | Credit ~1 min after pay; **double grant 500×2** on same order — ledger bug to verify |
| soulfitness05@gmail.com | Soul Fitness       | 2026-10-05 18:08 | 4.99 | Starter Credits |               500 |      No       | Credit ~0.5 min after pay; never started generate                                    |

### Handling ideas (A)

- [ ] Confirm whether orphan-recon users were ever emailed that credits finally arrived.
- [ ] Outreach: “credits are ready — open generator” deep link (homepage / product they came from).
- [ ] Fix Matt Dunn double-grant (1000 for one $4.99) before offering more credits.
- [ ] Product: after successful pack purchase, return to generator + one-shot “upload to start” CTA (not `#pricing` only).

---

## Cohort B — Paid, tasks exist, **0 complete** (15)

Grouped by dominant failure mode (distinct statuses on their tasks). Amounts = sum of paid orders.

### B1 — `failed_preflight` (3)

| Email                         | Name             | First paid       |         $ | Remaining | Task statuses                                    | Tasks | Status                                                         |
| ----------------------------- | ---------------- | ---------------- | --------: | --------: | ------------------------------------------------ | ----: | -------------------------------------------------------------- |
| n.n.srivatsan@gmail.com       | sri vatsan       | 2026-10-03 18:38 | **49.98** |      6100 | failed_preflight, insufficient_credits, refunded |     7 | **Done** — emailed 2026-10-19                                  |
| muralescarino@gmail.com       | Murales Cariño   | 2026-10-07 18:30 |      9.99 |      1100 | failed_preflight, refunded                       |     9 | **Done** — emailed 2026-10-19                                  |
| contentcreationn005@gmail.com | Content creation | 2026-10-07 19:18 |      4.99 |       400 | failed_preflight                                 |    16 | **Done — money refunded** (Android Chrome upload still broken) |

**Handling ideas:** inspect preflight for remaining open row(s).

**sri vatsan — done (2026-10-19):**  
WaveSpeed topped up. Soft retry email **sent** from `support@genjutsuai.net` (no API-balance / refund wording). Subject: _Your Genjutsu credits are ready — please try again_. Awaiting reply / retry.

**contentcreationn005 — done money-side (2026-10-19):**  
Root cause: **Android Chrome upload failure** (all 16 tasks `failed_preflight` / `UPLOAD_NETWORK_ERROR` — “Network error while uploading video 0”). Product bug **still unresolved**. Owner already issued **money refund** (Waffo/merchant). Local `order` `ORDudh8ccmuyhlilf` may still show `paid` until marked refunded — optional cleanup. No further outreach required unless they write in.

**muralescarino — done (2026-10-19):**  
Earlier: Android Chrome upload fails + two Seedance r2v rejects (pixel count; user saw generic failure). Soft retry email **sent** from `support@genjutsuai.net`. Subject: _Your Genjutsu credits are ready — please try again_. Awaiting reply / retry.

### B2 — `insufficient_credits` / stuck before submit (4) — next batch

| Email                     | Name              |     $ |  Rem | What actually happened                                          | Suggested next                                           |
| ------------------------- | ----------------- | ----: | ---: | --------------------------------------------------------------- | -------------------------------------------------------- |
| ahdashtii29@gmail.com     | Ali Dashti        |  9.99 | 1100 | Needed **1110**, had **1100** (差 10 分)；未扣生成分            | **低优 / 暂不处理** — 充值不够，客诉风险低（2026-10-19） |
| realharis39@gmail.com     | Mirza Haris       |  4.99 |  500 | Starter 后仍要 1110 / 甚至 3474；未扣生成分                     | **低优** — 包太小，同 Ali                                |
| asrorburxonov27@gmail.com | Asror Burxonov    |  9.98 | 1000 | 反复要 **1622**；未扣生成分                                     | **低优** — 同 Haris                                      |
| yanovichlari82@gmail.com  | Fabiano Nicoliche | 14.99 | 1100 | 后两次 Seedance **分辨率过低**；用户只看到 generic fail；分已退 | **Done** — emailed 2026-10-19                            |

### B3 — `refunded`（4）— credits already back

| Email                    | Name         |     $ |  Rem | Root cause (user-facing?)                | Suggested next                                                             |
| ------------------------ | ------------ | ----: | ---: | ---------------------------------------- | -------------------------------------------------------------------------- |
| mister.willy99@gmail.com | Yekcim       | 19.99 | 2400 | 内容安全 / **真人 likeness**（用户可见） | **高盯防投诉** — $19.99 最高；政策未变则慎主动发信（易催退款）；来信再处理 |
| snaplift@email.cz        | tom tond     |  9.99 | 1100 | **真人**拒识（用户可见）                 | 同 Yekcim，金额较低                                                        |
| ohlsenkevin999@gmail.com | Kevin Ohlsen |  4.99 |  500 | **真人**拒识 ×3（用户可见）              | 同 Yekcim                                                                  |
| opw01024404432@gmail.com | 이희용       |  9.99 | 1472 | Kairo 照片拒识（用户可见 tip）；分已退   | **中优** — 可软召回换清晰照片 / Pet mode                                   |

### Remaining complaint-risk queue (2026-10-19)

已结案外联/退款的不算。按下表处理：

| Priority         | Who                                | Why risk                                              | Action now                                                                 |
| ---------------- | ---------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| **P0 in flight** | Carlo Cantu                        | 已投诉到 Waffo                                        | 等退款到账 → 改本地 order / 清剩余分                                       |
| **P1 outreach**  | Fabiano `yanovichlari82@gmail.com` | $14.99、从未 complete、分辨率失败但 UI 只显示 generic | **Done** — soft retry + higher-res tip email sent 2026-10-19 from support@ |

**Fabiano — done (2026-10-19):** Soft retry email **sent**. Subject: _Your Genjutsu credits are ready — please try again_ (credits ready + if fails, try higher-resolution source video). Awaiting reply / retry.
| **P1 watch** | Yekcim `mister.willy99@gmail.com` | **$19.99**、多次真人拒识 | **先别主动推销重试**；若来信：解释政策 / 或退款。政策若已放宽再召回 |
| **P2 optional** | 이희용 `opw01024404432@gmail.com` | 最近（10-17）Kairo 全失败 | 软召回可选 |
| **P2 watch** | tom / Kevin | 真人拒识，金额较低 | 同 Yekcim，等来信 |
| **Skip for now** | Ali / Haris / Asror | 包不够估价，未吞生成分 | 低客诉，不主动 |
| **Skip** | Cohort A 0-task | 买了没用 | 账已到，不主动 |
| **Product debt** | Android Chrome upload；低分辨率 generic 报错 | 持续制造 contentcreation / Fabiano 类客诉 | 另排期修 |

**今天建议你动手的：** ① 跟 Carlo 退款收尾清单 ② 给 **Fabiano** 发召回邮件 ③ 心里记下 **Yekcim** 若来信优先响应。

### B4 — `submission_unknown` (4) — recent, high priority

这些**不是**「上游结果真的不知道」为主，而是 **Fal 明确拒图/拒输入后，积分被扣住、任务停在 `submission_unknown`**（自动退分规则没盖全）。

| Email                          | Name          | First paid       |    $ |          Remaining | Tasks | Status                                      |
| ------------------------------ | ------------- | ---------------- | ---: | -----------------: | ----: | ------------------------------------------- |
| rosco.karcyn@minafter.com      | billy         | 2026-10-14 12:42 | 9.98 |                800 |     2 | **Credits already restored** — no email     |
| iphone.martin.sander@gmail.com | Martin Sander | 2026-10-15 18:59 | 4.99 | restored + emailed |     3 | **Done** — email sent 2026-10-19 (see note) |
| carlorcantu@gmail.com          | Carlo Cantu   | 2026-10-16 02:48 | 9.99 |                228 |     1 | **Waffo money refund in progress**          |
| csirobyn@mac.com               | Robyn Rolfes  | 2026-10-16 04:32 | 4.99 | restored + emailed |     2 | **Done** — email sent 2026-10-19            |

#### Carlo Cantu — money path (already decided)

Complained to Waffo; merchant refund in progress (2026-10-19). Scene `kairo-bad-times`, 622 credits consumed, order `ORDu9jveemvadb2q1` still `paid`, 228 left.

When Waffo settles:

- [ ] Confirm payout reversed
- [ ] Flip local order off `paid` / tag refunded
- [ ] Revoke remaining 228 + close task

#### billy — no further credit action

Admin shows **800** credits. Ledger: two Starter packs granted **400+400**, two hotel-lobby attempts consumed **236+236**, then a manual grant **+472** at `2026-10-14 15:46` already put the balance back. UI “800” = purchase credits after restoration (not “never deducted”). Tasks may still show `submission_unknown`; optional cleanup only. **Skip outreach unless he writes in.**

#### Martin + Robyn — **done** (2026-10-19)

Credits restored by owner; Pet-mode outreach emails sent.

| User          | Email                            | Sent              | From                                                          | Notes                                                                                                                                           |
| ------------- | -------------------------------- | ----------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Martin Sander | `iphone.martin.sander@gmail.com` | 2026-10-19 ~12:04 | `lim@videotextremover.org` (wrong mailbox — forgot to switch) | Subject: _Your Genjutsu credits are restored — Pet mode is live_. Optional follow-up from `support@genjutsuai.net` if brand consistency needed. |
| Robyn Rolfes  | `csirobyn@mac.com`               | 2026-10-19        | (owner)                                                       | Same subject/body template as Martin.                                                                                                           |

Checklist:

- [x] Restore credits to full pack balance
- [x] Send EN email — credits restored + Pet mode (cats/dogs) + CTA
- [ ] Optionally mark stuck tasks `refunded` for clean admin history
- [ ] Product: auto-refund `image_too_large` etc. so this does not recur
- [ ] Ops hygiene: set Gmail default From to `support@genjutsuai.net` for support sends

##### Email body sent (both)

Subject: Your Genjutsu credits are restored — Pet mode is live

```
Hi {Martin|Robyn},

Thanks for trying Genjutsu and for your patience.

A few of your recent generations didn’t finish successfully. We’ve restored
your credits in full so you’re not out of balance for those attempts.

Good news: Kairo Bad Times now has Pet mode. You can upload photos of your
own cats or dogs and generate with them.

Try it here (switch to Pet mode on the page):
https://genjutsuai.net/kairo-bad-times

If anything still looks off, just reply to this email and we’ll help.

— Genjutsu Support
```

---

## Cohort C — Paid with ≥1 complete (17) — healthy baseline

Listed for contrast / do-not-disturb (unless support ticket). Sorted by first paid.

| Email                       | Name                | First paid       |     $ | Completes | Remaining |
| --------------------------- | ------------------- | ---------------- | ----: | --------: | --------: |
| gengliming110@gmail.com     | Liming Geng         | 2026-10-02 16:33 |  1.00 |        21 |       655 |
| mikeadamian@gmail.com       | Mike Adamian        | 2026-10-03 23:30 | 14.98 |         2 |       397 |
| ivancicisinovi111@gmail.com | Ivan Nikolic        | 2026-10-08 17:22 |  4.99 |         1 |       347 |
| frau.vu@gmail.com           | frau vu             | 2026-10-08 19:42 |  9.99 |         1 |        72 |
| jpeng50204@gmail.com        | Ryan Peng           | 2026-10-14 13:58 |  4.99 |         1 |        47 |
| kiralykevin2007@gmail.com   | Kevin Király        | 2026-10-14 17:54 |  9.98 |         1 |       584 |
| junghan0804@gmail.com       | 이정한              | 2026-10-15 04:55 | 39.99 |         1 |      2279 |
| tentarro@gmail.com          | Tentarro            | 2026-10-16 03:19 |  9.99 |         1 |       234 |
| jsy980503@gmail.com         | saeyeon jho         | 2026-10-16 13:05 | 14.98 |         3 |        10 |
| austindanna7@gmail.com      | Austin D'Anna       | 2026-10-16 17:25 |  9.99 |         2 |       678 |
| kerogers11@gmail.com        | Kelly Rogers        | 2026-10-16 22:56 | 14.98 |         2 |      1170 |
| benrusk1@gmail.com          | kujo                | 2026-10-17 11:08 |  9.99 |         1 |       234 |
| eva.krause83@gmx.de         | Eva                 | 2026-10-17 15:57 | 19.98 |         4 |       284 |
| wiseguy1236@gmail.com       | Richard Morris      | 2026-10-17 16:24 |  9.99 |         1 |       228 |
| monica2824@gmail.com        | Hannah              | 2026-10-17 17:57 |  9.98 |         2 |       368 |
| aloenee@gmail.com           | Alexandra Kordonsky | 2026-10-18 07:02 | 34.95 |         5 |       326 |
| amazinggracej89@gmail.com   | Grace Jung          | 2026-10-18 09:25 |  9.99 |         1 |       228 |

---

## Suggested decision board

Use this to pick a path per cohort (fill in as you decide):

| Cohort                        | Priority | Options                                                                                        | Owner | Decision                                                                                                                                    |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A orphan recon (2)            | High     | Email “credits ready” + generator link / optional goodwill top-up                              |       |                                                                                                                                             |
| A normal no-task (2)          | Med      | Same outreach; fix Dunn double-grant first                                                     |       |                                                                                                                                             |
| B4 submission_unknown (4)     | **High** | Carlo = Waffo money refund. billy already restored. Martin/Robyn = credit restore + Pet email. |       | **Carlo** refund in progress. **Martin + Robyn** emails sent 2026-10-19 (Martin From was videotextremover by mistake). **billy** no action. |
| B1 failed_preflight (3)       | Med      | Content tips + retry; VIP assist for $49.98                                                    |       | **B1 closed for outreach**: sri vatsan + muralescarino emailed; contentcreationn005 money refunded (Android Chrome upload bug still open).  |
| B2 insufficient_credits (4)   | Med      | Ali/Haris/Asror = low complaint, skip. Fabiano = P1 soft retry                                 |       | **Fabiano emailed 2026-10-19**. Ali still deprioritized.                                                                                    |
| B3 refunded (4)               | Med      | Yekcim = P1 watch (don’t cold-email). 이희용 = P2 optional                                     |       | See complaint-risk queue                                                                                                                    |
| Product: post-pay → generator | High     | Change default redirect from `#pricing`/billing                                                |       |                                                                                                                                             |

---

## Re-query snippets (D1)

```sql
-- Paid vs never-complete counts
WITH paid_users AS (
  SELECT DISTINCT user_id FROM "order" WHERE status = 'paid'
),
completed_users AS (
  SELECT DISTINCT user_id FROM ai_task WHERE status = 'completed'
)
SELECT
  (SELECT COUNT(*) FROM paid_users) AS paid_users,
  (SELECT COUNT(*) FROM paid_users p
   WHERE NOT EXISTS (SELECT 1 FROM completed_users c WHERE c.user_id = p.user_id)
  ) AS paid_without_complete;
```

```bash
npx wrangler d1 execute genjutsu-ai-db --remote --command '…'
```

Companion canvas (same snapshot):  
`.cursor/projects/.../canvases/paid-users-no-complete.canvas.tsx`

---

## Changelog

| Date       | Note                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-19 | Initial snapshot from prod D1; 36 paid / 19 never-complete / 4 no-task                                                                              |
| 2026-10-19 | Carlo Cantu (`carlorcantu@gmail.com`): Waffo complaint + merchant refund in progress                                                                |
| 2026-10-19 | B4 remaining 3: Fal input rejects with credits held — plan = credit refund (not Waffo), see per-user table                                          |
| 2026-10-19 | billy: +472 already granted 10-14; no further credit action. Martin/Robyn: full restore then privacy-safe email (pet support, no upload disclosure) |
| 2026-10-19 | Martin + Robyn: Pet-mode emails sent. Martin From=`lim@videotextremover.org` (wrong); Robyn sent same day.                                          |
| 2026-10-19 | sri vatsan: WaveSpeed topped up; soft retry email sent from support@                                                                                |
| 2026-10-19 | contentcreationn005: Android Chrome upload (`UPLOAD_NETWORK_ERROR`); money refunded; product bug still open                                         |
| 2026-10-19 | muralescarino: soft retry email sent from support@                                                                                                  |
| 2026-10-19 | Pulled B2/B3 detail — next: Ali (+10), Fabiano, 이희용; likeness trio last                                                                          |
| 2026-10-19 | Ali deprioritized (low complaint). Complaint-risk queue: Carlo P0, Fabiano P1 outreach, Yekcim P1 watch                                             |
| 2026-10-19 | Fabiano: soft retry + higher-res tip email sent from support@                                                                                       |
