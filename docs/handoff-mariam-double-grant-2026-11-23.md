# Handoff：mariam.72116@gmail.com — 付一次成功生成两次

**日期：** 2026-11-23  
**查询时间：** 2026-11-23（只读）  
**数据源：** Cloudflare D1 生产库 `genjutsu-ai-db`  
**客诉现象：** 支付一次，却成功生成了两次  
**原则：** 本次只排查、未改代码、未动账、未退款

---

## 一句话

**不是生成侧「一次提交出两片」，是支付入账把同一笔订单 grant 了两次（850×2=1700）。**  
用户用多出来的积分合法完成了第二次 816 成片。根因是 `handleCheckoutSuccess` 的 check-then-act 幂等在 **callback + webhook 竞态**下失效。

---

## 结论摘要

| 项         | 结论                                                    |
| ---------- | ------------------------------------------------------- |
| 支付笔数   | **1** 笔 paid（$9.99 Creator / 应入账 850）             |
| 实际 grant | **2** 笔，同 `order_no`，间隔 **348ms** → 合计 **1700** |
| 成功成片   | **2** 次 `completed`，各净扣 **816**                    |
| 当前余额   | **68**（1700 − 816 − 816）                              |
| 生成链路   | 正常（两枚不同 `ai_task` / 上游 `task_id` / consume）   |
| 代码改动   | **无**（本 handoff 仅记录排查）                         |

---

## 1. 用户与订单快照

| 字段              | 值                                              |
| ----------------- | ----------------------------------------------- |
| User ID           | `1729bffa-9991-486f-b35b-038487981ecc`          |
| Email             | `mariam.72116@gmail.com`                        |
| Name              | Fatima Ali                                      |
| D1 `order_no`     | `ORDrllmo9mwsjesno`                             |
| Waffo `orderId`   | `ORD_0eZhPJGVHAWXEuslxQc32A`                    |
| Waffo `paymentId` | `PAY_1VgVJYFMFMdWVN7sL0RRot`                    |
| 金额 / 产品       | $9.99 / Creator Credits（`credits_amount=850`） |
| 支付方式          | Apple Pay                                       |
| 支付时间 (UTC)    | 2026-11-23 **00:38:53**                         |
| 订单状态          | `paid`（仅此一笔；无第二笔 paid）               |

---

## 2. 时间线（UTC，2026-11-23）

| 时间                | 事件                                                           |
| ------------------- | -------------------------------------------------------------- |
| 00:37:02            | 用户注册                                                       |
| 00:37:32            | 任务 `f30657a7…` → `insufficient_credits`（balance=0，需 816） |
| 00:38:23            | 创建订单 `ORDrllmo9mwsjesno`                                   |
| 00:38:53            | 支付成功（`paid_at`）                                          |
| **00:38:55.539**    | **grant #1** `9752a59f…` +850（同 order）                      |
| **00:38:55.887**    | **grant #2** `aa91c395…` +850（同 order，+348ms）              |
| 00:39:27 → 00:44:12 | 第一次 **completed** `77e43d18…`，consume `a65f14ca…` −816     |
| 00:50:38 → 00:55:54 | 第二次 **completed** `bf0b8726…`，consume `f77989d2…` −816     |
| 00:57 起            | 多次 `insufficient_credits`（balance=68）                      |

第二次消耗明细（FIFO）：

- 从 grant #1 扣完剩余 **34**
- 从 grant #2 扣 **782**
- 合计 816；grant #2 剩余 **68**（与当前余额一致）

---

## 3. 任务对账

| task id                                                   | status               | cost | credit_id / 说明     | 上游 task_id                       |
| --------------------------------------------------------- | -------------------- | ---- | -------------------- | ---------------------------------- |
| `f30657a7-…`                                              | insufficient_credits | 0    | 支付前；balance=0    | —                                  |
| `77e43d18-…`                                              | **completed**        | 816  | consume `a65f14ca-…` | `dee62e44f7094375b576dad2d25a19c7` |
| `8dd0de25-…`                                              | ready                | 0    | 未点到 generate      | —                                  |
| `bf0b8726-…`                                              | **completed**        | 816  | consume `f77989d2-…` | `35fede6594ee46a7bd02d339e60e5a50` |
| `e0285367-…` / `255a7cd5-…` / `19f749d5-…` / `96dcbe7a-…` | insufficient_credits | 0    | balance=68           | —                                  |
| `d94f2289-…`                                              | sealing              | 0    | 上传中断残留         | —                                  |

两成片均为 `seedance-wavespeed` / `bytedance/seedance-2.5/video-edit` / 480p，`customerPriceBasisUsd≈4.799` → `ceil×170=816`。  
结果 key：

- `genjutsu/results/1729bffa-…/77e43d18-….mp4`
- `genjutsu/results/1729bffa-…/bf0b8726-….mp4`

---

## 4. 根本原因（已确认）

### A. 双 grant，不是双支付 / 双 submit

同一 `order_no` 两条 `transaction_type=grant`、`transaction_scene=payment`，各 850。  
订单表只有 1 行 `paid`。  
生成侧两枚独立 attempt → seal → generate → completed。

### B. 入账幂等是 TOCTOU，竞态下双跑

`src/modules/payment/service.ts` → `handleCheckoutSuccess`：

1. `SELECT` order
2. `if (status === PAID) return`（非原子）
3. 事务内 `INSERT credit` grant + `UPDATE order → paid`

两条入口都会调用它：

| 路径          | 入口                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| 浏览器回跳    | `GET /api/payment/callback` → `handlePaymentCallback` → `handleCheckoutSuccess` |
| Waffo webhook | `order.completed` → `checkout.success` → `handleCheckoutSuccess`                |

两边若几乎同时读到 `created/pending`，就会各插一条 grant。本单两笔 grant 间隔 348ms，符合该模式。

事务只保证「单次执行内部一致」，**不**保证「全局只成功入账一次」（无 CAS `WHERE status IN (created,pending)`、无 grant 侧 `UNIQUE(order_no)`）。

### C. 生产上同类事故不止这一单

D1 中 `grant` 按 `order_no` 聚合 `COUNT(*)>1` 至少 **7** 笔（间隔多为几十～几百 ms）：

| order_no            | email                      | 应付 credits | 实发     |
| ------------------- | -------------------------- | ------------ | -------- |
| `ORDrllmo9mwsjesno` | mariam.72116@gmail.com     | 850          | **1700** |
| `ORDd2ac3qmw3p0def` | cgarmire3428@sbcglobal.net | 850          | 1700     |
| `ORDy1hq8smvbkzc7e` | kerogers11@gmail.com       | 850          | 1700     |
| `ORDotf3utmvbkg9zv` | kerogers11@gmail.com       | 400          | 800      |
| `ORD5j2goomvfgu2az` | stephenmoore.01@icloud.com | 400          | 800      |
| `ORD88dqnvmv94rma7` | kiralykevin2007@gmail.com  | 400          | 800      |
| `ORDk9yk9ymusdiugi` | dunnsox91@yahoo.com        | 500          | 1000     |

`dunnsox91` 已在 `docs/paid-users-ops-2026-10-19.md` 标过 double-grant，**当时未修。**

---

## 5. 排除项

| 假设                           | 结论                                                   |
| ------------------------------ | ------------------------------------------------------ |
| 用户付了两笔                   | 否；仅 1 笔 paid                                       |
| 一次 generate 出两片           | 否；两 `ai_task`、两上游 id、两 consume                |
| 失败未退款造成「看起来多一次」 | 否；两笔 consume 均为 `active`，对应两次真实 completed |
| 预览/试生成免扣                | 否；两次均 `cost_credits=816`                          |
| 展示余额与校验口径不一致       | 不适用；问题在入账重复，非余额展示                     |

---

## 6. 账本轧平（本用户）

```
grant:    850 + 850 = 1700
consume:  816 + 816 = 1632（两笔 status=active）
remaining: 68（全部在 grant #2）
1700 - 1632 = 68 ✓
```

多发部分：相对应付 850，多发 **850**；其中约 **782** 已用于第二次成片，账上仍多出 **68**。

---

## 7. 诊断 SQL（只读）

```sql
-- 用户
SELECT id, email, name, created_at
FROM user
WHERE email = 'mariam.72116@gmail.com';

-- 订单
SELECT order_no, status, amount, credits_amount, paid_at, payment_result
FROM "order"
WHERE user_id = '1729bffa-9991-486f-b35b-038487981ecc'
ORDER BY created_at;

-- 积分流水
SELECT id, order_no, transaction_type, credits, remaining_credits, status, created_at, consumed_detail
FROM credit
WHERE user_id = '1729bffa-9991-486f-b35b-038487981ecc'
ORDER BY created_at;

-- 任务
SELECT id, status, cost_credits, credit_id, task_id, created_at, updated_at,
       substr(task_info,1,400), substr(task_result,1,400)
FROM ai_task
WHERE user_id = '1729bffa-9991-486f-b35b-038487981ecc'
ORDER BY created_at;

-- 全库双 grant 扫描
SELECT order_no, COUNT(*) AS grant_count, SUM(credits) AS total_granted
FROM credit
WHERE transaction_type = 'grant'
  AND order_no IS NOT NULL AND order_no != ''
GROUP BY order_no
HAVING COUNT(*) > 1;
```

执行方式：

```bash
npx wrangler d1 execute genjutsu-ai-db --remote --json --command '…'
```

---

## 8. 后续建议（未实施）

### 对客 / 运营（需人工决策）

- 可承认：系统对同一笔支付多发了一份积分，因此第二次生成按账本合法扣费成功。
- 追回口径：多发 850；已消耗约 782 + 余额 68。是否追片、是否忽略小额余额、是否仅记损失，由运营定。
- **不要**对客说查过用户上传内容。

### 工程修复（下次专门开，本次未改）

1. `handleCheckoutSuccess`：用原子  
   `UPDATE order SET status=paid … WHERE id=? AND status IN ('created','pending')`  
   仅当 `changes===1` 时再 insert grant（或把 grant 放进同一条件路径）。
2. 或 credit 表对 payment grant 加 `UNIQUE(order_no)`（需兼容 subscription renewal 多期 grant 的语义）。
3. 评估是否仍需要 callback 同步履约；若 webhook 可靠，callback 可改为「只跳转、不 grant」，降低竞态面。
4. 对上表 7 笔双 grant 做一次 ops 清点（剩余未消耗的第二笔 grant）。

### 明确不做（本 handoff）

- 不改 `payment/service.ts`
- 不 DELETE / UPDATE 生产 credit 行
- 不发起 Waffo 退款

---

## 9. 相关文件

| 文件                                 | 角色                                                             |
| ------------------------------------ | ---------------------------------------------------------------- |
| `src/modules/payment/service.ts`     | `handleCheckoutSuccess` / `handlePaymentCallback` / webhook 路由 |
| `src/routes/api/payment/callback.ts` | 支付回跳触发履约                                                 |
| `src/core/payment/waffo.ts`          | `order.completed` → `checkout.success`                           |
| `docs/paid-users-ops-2026-10-19.md`  | 已记录 dunnsox91 double-grant，未修                              |

---

_本 handoff 只读查询生产 D1，未执行 UPDATE/DELETE，未发起退款或补/扣积分，未改代码。_
