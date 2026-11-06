# Burning Bridges AI：基于 Hotel Lobby 原链路复用的 15 秒 Kling O3 专题方案

- 日期：2026-10-14
- 状态：技术方案已确认，尚未实施
- 决策：**方案 A：固定 15 秒参考片，fal Kling O3 Standard Video-to-Video Edit，单次生成**
- 核心约束：**复用现有 `HotelLobbyGeneratorPanel` 和全部 `/api/hotel-lobby/*` 后端生成链路；不复制组件，不创建第二套 API、扣费、任务状态机、R2 上传、Webhook 或轮询**
- 本次提交仅为方案文档，不包含业务代码或模板视频

## 1. 一句话技术方案

把 Hotel Lobby 从“只有一套硬编码模板的生成器”改为“**支持配置的同一套 Kling O3 生成器**”。

- `/hotel-lobby-ai` → `<HotelLobbyGeneratorPanel />`（默认 preset = `hotel-lobby`，所有旧行为保持不变）。
- `/burning-bridges-ai` → `<HotelLobbyGeneratorPanel presetId="burning-bridges" />`（固定 15s 参考片、只上传 1 张角色图片、没有视频替换/裁剪/第二张图）。
- 两个页面调用**同一套**现有 `/api/hotel-lobby/template*`、`upload-url`、`generate`、`status`、`webhook`、`source`、`result`。
- `presetId` 是业务配置选择器，**不是自由填写的任意视频 URL / prompt / scene**。服务器根据白名单生成最终参数。

> 刻意不引入 `src/modules/kling-v2v/*`、`src/modules/burning-bridges/service.ts`、`src/routes/api/burning-bridges/*`，也不拷贝现有 Hotel Lobby 的 billing、storage、reconcile、组件或 API 文件。这比把 Hotel Lobby 拆成通用大型引擎风险更小，也更符合目前流量与产品阶段。

## 2. 方案 A 的规格与价格

| 项目 | Burning Bridges 方案 A |
| --- | --- |
| 接口 | `fal-ai/kling-video/o3/standard/video-to-video/edit` |
| 视频 | **固定 15 秒**，9:16，服务端 R2 模板 |
| 用户上传 | **1 张** JPG/PNG/WebP 图片，上限沿用现有 12 MB |
| 替换目标 | 模板中镜头前景的**唯一主角**；背景客人尽量保留 |
| 原始视频上传 | 不开放，避免二次复杂度 |
| 视频裁剪 | 不开放，固定使用整段模板 |
| 第二人上传 | 不开放 |
| 音频 | `keep_audio: false`（与 Hotel Lobby 当前 `true` 不同，**必须按 preset 配置**）；使用平台官方曲库或有授权音轨 |
| API 模型成本估算 | 15 × $0.126 = **$1.89** |
| 站内积分估算 | `ceil(1.89 × 100 × 1.7)` = **322 credits** |
| 输出时长/画幅 | 参考片驱动；不向该模型提交 `duration`、`resolution`、`aspect_ratio` 等不支持的参数 |
| 后续版本 | >15s 分段拼接、更多角色/模板、Pro 对照实验暂不做 |

模型文档：https://fal.ai/models/fal-ai/kling-video/o3/standard/video-to-video/edit/api

官方要求视频为 MP4/MOV、**3–15 秒、宽高分别 720–3840px**、最大 200MB；站内现行视频 80MB 限制更严格，继续沿用。需要使用实际已裁剪/封装的 15 秒素材，而不是上传 20 秒后指望后端自动截断。尽量让源文件真实媒体时长不超过 15.0 秒，避免编码时间基造成边界失败。

成本是模型标价预估，不等于净利润；依旧让**服务端**计算并预扣积分，不能信客户端自报时长/积分。

## 3. 检查仓库后的复用清单

| 现有文件 | 是否复用 | 仅需调整 |
| --- | --- | --- |
| `src/components/landing/HotelLobbyGeneratorPanel.tsx` | **原组件复用** | 增加可选 `presetId`；固定模板时隐藏视频移除/换视频/裁剪；Burning 只渲染 1 个 PersonSlot；替换对应文案 |
| `src/components/landing/hotel-lobby-trim-bar.tsx` | 原样保留 | Burning 隐藏，Hotel Lobby 继续可用 |
| `src/routes/api/hotel-lobby/template.ts` | **原 endpoint 复用** | 接受白名单 `presetId` query，按 preset 选模板 |
| `src/routes/api/hotel-lobby/template-meta.ts` | **原 endpoint 复用** | 以 preset 查询模板时长、可用状态及展示用积分 |
| `src/routes/api/hotel-lobby/template-file.ts` | **原 endpoint 复用** | Hotel Lobby 裁剪使用；如 Burning 不允许裁剪，Burning 页面不用此接口 |
| `src/routes/api/hotel-lobby/upload-url.ts` | **原 endpoint 复用** | `presetId` 可选；Burning 强制 `useDefaultTemplate=true` 且**恰好一张图**，拒绝自定义视频 |
| `src/routes/api/hotel-lobby/generate.ts` | **原 endpoint 复用** | 解析 preset → 固定模板/图片数/Prompt/音频；沿用 seal、真实时长校验、预扣、提交；重复 generationId 校验 preset |
| `src/modules/hotel-lobby/service.ts` | **原 service 复用** | `keep_audio` 从已验证的 preset 配置读取，Hotel Lobby 默认保持 true |
| `src/modules/hotel-lobby/storage.ts` | **原存储逻辑复用** | `getHotelLobbyTemplateVideoKey(presetId)` 可选择不同模板；staging/sealed/results 全部沿用既有 R2 prefix |
| `src/modules/hotel-lobby/pricing.ts` | **完全复用** | 已是相同 Kling 模型、$0.126/s；现有 15 秒 322 credits 单测可直接用 |
| `src/modules/hotel-lobby/billing.ts` | **同一扣费状态机** | 在 `options` 存 `presetId/version`，新旧任务兼容；增加跨 preset 重放冲突判定 |
| `src/modules/hotel-lobby/reconcile.ts` | **直接复用** | 不建第二套 fal 查询/落 R2/终态退款 |
| `src/routes/api/hotel-lobby/status.ts` | **直接复用** | 不新增 status endpoint |
| `src/routes/api/hotel-lobby/webhook.ts` | **直接复用** | 不新增 webhook endpoint |
| `src/routes/api/hotel-lobby/source/$generationId.ts`、`result/$generationId.ts` | **直接复用** | 保留认证与用户隔离；下载文件名可以按 preset 做小调整 |
| `src/hooks/use-credit-gate.ts`、现有积分弹窗 | **直接复用** | 不新增支付/余额检查 |
| `src/routes/creations.tsx`、`src/routes/api/user/generations.ts` | **复用既有列表** | 从 `options.presetId` 区分展示名称，并继续使用 Hotel Lobby status/result 媒体路径 |
| `src/routes/hotel-lobby-ai.tsx` | **维持原页** | 不改原页 SEO，默认 preset 无需改调用 |
| **新增** `src/routes/burning-bridges-ai.tsx` | 只新增**专题展示页** | SEO、FAQ、示例视频、现有生成组件 1 个实例 |
| **新增** `src/modules/hotel-lobby/presets.ts` | 只新增**轻量配置** | whitelist registry、固定 Prompt、音频、模板 key、图片槽位配置；**无业务服务或生成引擎** |

**不要**为了重用去把旧文件全部改名或大规模重构。保持 Hotel Lobby 的对外 API 和 `hotel-lobby` storage prefix，专注于加一个 preset 参数，先完成最小可回归变更。

## 4. preset 配置（唯一新增的后端概念）

示意结构（非已实现代码）：

~~~ts
type KlingV2VPreset = {
  id: 'hotel-lobby' | 'burning-bridges';
  version: number;
  templateVideoKey: string;
  imageCount: { min: number; max: number };
  allowCustomVideo: boolean;
  allowTrim: boolean;
  promptFor(imageCount: number): string;
  keepAudio: boolean;
  enabled: boolean;
};

const PRESETS = {
  'hotel-lobby': {
    version: 1,
    templateVideoKey: '<existing HOTEL_LOBBY_TEMPLATE_VIDEO_KEY>',
    imageCount: { min: 1, max: 2 },
    allowCustomVideo: true,
    allowTrim: true,
    promptFor: buildHotelLobbyPrompt,
    keepAudio: true,
    enabled: true
  },
  'burning-bridges': {
    version: 1,
    templateVideoKey: 'hotel-lobby/templates/burning-bridges-15s-v1.mp4',
    imageCount: { min: 1, max: 1 },
    allowCustomVideo: false,
    allowTrim: false,
    promptFor: buildBurningBridgesPrompt,
    keepAudio: false,
    enabled: false // 取得有权使用的素材 + smoke 成功后再打开
  }
} satisfies Record<string, KlingV2VPreset>;
~~~

- `hotel-lobby` 保持默认：无 `presetId` 时必须等价于当前生产行为。配置中的 `<existing HOTEL_LOBBY_TEMPLATE_VIDEO_KEY>` 是伪代码，实际沿用 `envConfigs.hotel_lobby_template_video_key` 及当前默认值。
- `burning-bridges` 暂时将素材放在 `hotel-lobby/templates/` 下，是为了**继续通过现有 getHotelLobbyTemplateVideoKey / R2 归属校验**，不做重命名或跨 prefix 存储改造。
- `templateVideoKey`、prompt、音频、图片数、可用状态等都只在服务端生效；客户端只能发送选中的合法 ID。
- 不允许客户端提供任意 `templateVideoKey` / 原片 URL；服务端任何未知、禁用 ID 都返回明确的 400/404。
- `version` 和模板视频 key（最好另存 ETag）封存到 `aiTask.options`；替换模板后不应该影响已提交任务。
- **本方案不表示官方 Drake MV 已获授权**。制作真正可公开使用的素材前不得把示意 key 设为 enabled。

### Burning Bridges Prompt（服务端固定）

~~~text
In @Video1, replace only the main foreground performer who approaches
the camera with the person or character from @Element1.
Preserve the original timing, body movements, gestures, camera motion,
party lighting and surrounding guests.
Do not replace anyone in the background. Keep the new subject's
appearance and identity consistent throughout the whole video.
~~~

与 Hotel Lobby 相同，通过 `elements: [{ frontal_image_url: imageUrl, reference_image_urls: [imageUrl] }]` 引用唯一主体。`shot_type: "customize"`，`keep_audio: false`。短 prompt 优先，通过小样本验证人物是否替换成功，不能假定“其他人百分之百不会被改”。

## 5. 前端：只有一个生成组件，两套 preset

**最小实现**：直接在当前组件增加 `presetId?: 'hotel-lobby' | 'burning-bridges'`，默认 `hotel-lobby`。

~~~tsx
// 旧页面，调用方式保持不变
<HotelLobbyGeneratorPanel />

// 新专题，仍然使用同一个组件
<HotelLobbyGeneratorPanel presetId="burning-bridges" />
~~~

组件内部根据服务端提供的 preset 信息有条件展示：

- Hotel Lobby：保持 1–2 张图片、可更换视频、TrimBar、当前提示文案，功能和 DOM 尽量不变。
- Burning Bridges：只显示竖屏模板预览和**一个**人物上传卡片；**完全隐藏**移除模板、上传/更换视频、TrimBar 和第二个人物槽位；不能通过调用旧事件绕过限制。
- 预览容器：Hotel Lobby 仍 `aspect-video`；Burning Bridges 用 `aspect-[9/16]` + `object-contain`。现有生成后视频预览也根据 preset 选择容器比例。
- 文案：不要继续显示“两个人面对麦克风”“Orange Booth”等 Hotel Lobby 文字；局部 props/消息映射支持 EN/JA/KO，禁止用新组件复制整份 JSX。
- 图片上传、压缩/校验（如现有）、本地预览、额度不足弹窗、上传进度、队列状态、生成结果、下载按钮、登录跳转等完全沿用原组件方法。
- 仍只调用 `/api/hotel-lobby/*`。将 `presetId` 加入 `/template?...`、`/template-meta?...`、`upload-url` 和 `generate` 请求。Burning 的 `useDefaultTemplate` 恒为 true，前端只传图片。
- 模板不可用时 UI 禁止生成，不提供“删了再上传自己的 MV”的回退入口。
- 现有 `HotelLobbyGeneratorPanel` 只有组件内 `generationId` 状态，刷新不会自动回到同一生成进度。**最低限度先让 My Creations 能恢复结果；如果要回到生成器原位，在同一组件上增加 URL/session 恢复 generationId，不再做第二套轮询。**

## 6. 后端：只对旧接口增加 preset 参数

仍然是**同一**条生成路径：

~~~text
Burning / Hotel Lobby 页面
  → 同一个 HotelLobbyGeneratorPanel（presetId 不同）
  → /api/hotel-lobby/template、template-meta（读取白名单模板）
  → /api/hotel-lobby/upload-url（只签 1 张图上传）
  → R2 existing image staging
  → /api/hotel-lobby/generate（preset 校验 / seal）
  → Hotel Lobby 现有 estimate → reserve → CAS claim → FalProvider.generate
  → 同一个 /api/hotel-lobby/webhook、status（fal 查询）
  → 同一个 reconcile → R2 persist → completed/refunded
  → 同一个 /api/hotel-lobby/result/:generationId
  → My Creations
~~~

### 需要补的最小校验

1. **既有接口默认兼容**：未传 `presetId` 等价 `hotel-lobby`。旧上传路径、旧模板配置、旧任务在新版本仍可用。
2. **Burning 强制**：`presetId=burning-bridges` + `useDefaultTemplate=true`，图片恰好 1 张；拒绝 videoKey、自定义视频、第二张图、任意 prompt 或主动覆盖模型。
3. **服务端才可信**：服务端从 preset registry 取得模板 key + Prompt + `keep_audio`；使用 R2 HEAD / metadata 验实际时长和宽高、文件大小，**扣费之前**完成校验；浏览器传的 `durationSeconds` 最多作为提示。
4. **15s 边界**：现有 `normalizeHotelLobbyDuration` 对原始媒体时长存在容差 + round，账单会 round 到 15。上线素材仍应真实 `<=15.00s`，在模板上线预检中用精确探测值拒绝超时素材，不能因为容差就把 15.x 秒交给 fal。
5. **输入封存**：继续用 `sealHotelLobbyInputs`，源视频从对应 preset 选择；封存后的 key 继续 `hotel-lobby/sealed-inputs/.../`，结果仍 `hotel-lobby/results/.../`。
6. **幂等绑定**：`aiTask.options` 加入 `presetId/presetVersion/keepAudio`；已有任务缺失 `presetId` 等价 `hotel-lobby`。更新 `assertTaskMatches` 比对这些字段以及原有图片/视频输入。当前 `generate.ts` 在校验传入配置前就可能直接返回同 `generationId` 的旧任务：必须改成先检查 preset 是否匹配，否则 **409 Conflict**。
7. **保持 scene 不变**：MVP 统一 `aiTask.scene = 'hotel-lobby'`，因为 status/webhook/result/creations 当前都按此 scene 路由；**通过 options.presetId 区分产品**，避免新增 scene 后漏掉扫描、作品列表、鉴权、管理工具。后续真做通用模型平台再迁移 scene。
8. **My Creations**：`/api/user/generations` 读取 `options.presetId`，Hotel Lobby 用旧名称，Burning 展示 Burning Bridges；保持同一个 `statusPathFor` / `generationMediaBasePath`。可按 preset 输出下载文件名，不开新 media endpoint。
9. **fal payload**：复用 `submitHotelLobby`，仅把 `keep_audio: true` 改为可信参数（Hotel Lobby 默认 true，Burning false）；不要引入一套 `submitBurningBridges` 或重复调用 FalProvider。

### 共享 bug：Fal request_id 在 bind 失败时丢失（上线 P0）

当前 `/api/hotel-lobby/generate.ts` 将 Fal submit 与 `markHotelLobbySubmitted` 放进同一 try/catch。假设 fal 返回 `requestId` 后 DB bind 失败，后续误判为 submit 异常，可能进入 `submission_unknown` 且没有保存已知 ID，既增加成本又影响用户恢复。

本次只在**原链路**内修复：
- submit 和 bind 使用独立错误边界；保存已获得的 `requestId`（必要时独立 recovery 记录 / 可查询日志），绝不把 bind 失败判成“fal 明确拒绝”而退款。
- unknown 保留积分、禁止自动二次提交；可靠扫描/人工恢复手段能够根据保存的 requestId 补绑、继续 reconcile。
- webhook 早于 bind、R2 落盘失败、并发 status/webhook、幂等退款覆盖测试。不要借 Burning 独立复制一份“更安全”的链路。
- 当前 webhook 依赖已绑定的 requestId，失配 webhook 不自动找回任务；这一点要通过原链路的 recovery 设计解决。

## 7. 文件改动边界（希望实施 PR 尽量小）

**预期新增**：
1. `src/modules/hotel-lobby/presets.ts` —— 轻量配置与 Burning Prompt。
2. `src/routes/burning-bridges-ai.tsx` —— 页面 SEO、示例/FAQ、实例化**已有**组件。

**预期局部修改**：
- `src/components/landing/HotelLobbyGeneratorPanel.tsx` —— preset props + 隐藏/文案/画幅分支；其余生成函数复用。
- `src/modules/hotel-lobby/storage.ts` —— 读多个可信模板。
- `src/modules/hotel-lobby/service.ts` —— 配置 `keep_audio` 与 prompt。
- `src/modules/hotel-lobby/billing.ts` —— preset 任务快照/冲突校验。
- `src/routes/api/hotel-lobby/{template,template-meta,upload-url,generate}.ts` —— 传递/校验 preset，**不增加同等新 API**。
- `src/routes/api/user/generations.ts`、`src/routes/creations.tsx` —— 展示分辨。
- 必要的消息字典、sitemap、SEO、本来就存在的测试与共享 requestId 恢复点。

**本期不应新增**：
- `src/components/landing/BurningBridgesGeneratorPanel.tsx`（如只有一个薄的 1 行包装组件也无必要）
- `src/modules/burning-bridges/{billing,storage,reconcile,service}.ts`
- `src/modules/kling-v2v/*`（暂不为两模板做大重构）
- `src/routes/api/burning-bridges/{upload-url,generate,status,webhook,result}.ts`
- 新数据库 task 表、独立 credit scene、独立支付、独立生成日志系统、分段合成任务。

## 8. 验收/回归测试

### 15s Burning Bridges 的正常路径
- [ ] 已准备**有权用于商业网站**的 15.0 秒以内 9:16 模板，编码正确，授权证据可查。**未经授权不得把 Drake 官方 MV、原片片段或原音作为公开模板。**
- [ ] `/burning-bridges-ai` 只显示一个角色图片槽位与固定视频，不出现 Hotel Lobby 的第二张图、视频替换、TrimBar 或麦克风文案。
- [ ] 模板预览/时长/报价均读取 `presetId=burning-bridges`；模板不可用时禁用 Generate。
- [ ] 发送 Kling O3 Standard payload 包含 `keep_audio:false`、唯一 `@Element1`、固定可信模板 URL，不包含不支持的参数。
- [ ] 后端按真实 15s → $1.89 → **322 credits** 计算，先预扣；上传失败、预检失败不扣费。
- [ ] 生成成功先落 R2 再标 completed，同一结果可在 My Creations 查看与下载。
- [ ] 对实际用户授权图、动物/动画素材分别抽样验证效果；保真度不作未经测量的保证。

### Hotel Lobby 不能回归
- [ ] 旧页面不传 `presetId` 仍使用旧模板、1–2 张角色照片、上传替换视频及 TrimBar。
- [ ] 旧 `keep_audio:true`、原价格算法、既有 API 入参、Webhook、Result/Source URL 和原用户任务记录不变。
- [ ] 旧任务无 `options.presetId` 仍能在 status / My Creations 正常识别为 Hotel Lobby。
- [ ] 两个页面同时使用时 template-meta、template URL 不串模板；不同 generationId 不串任务，不能通过 URL/DB key 读取他人的上传内容。
- [ ] 同 `generationId` 先以 hotel-lobby 提交、后改 burning-bridges 请求 → 409，且无重复扣费。

### 关键异常
- [ ] 未授权、非法 preset、Burning 提交第二张图/上传自定义视频、过长/非法尺寸模板全部前置拒绝。
- [ ] submit 已成功但 DB bind 失败能够恢复 requestId；不要重复提交、错误退款或永久吃掉积分。
- [ ] fal FAILED 仅退款一次；fal 成功但 R2 暂时失败能够继续保存；乱序/重复 webhook 幂等。
- [ ] 充值返回或页面刷新后，至少可在既有 My Creations 恢复任务进度/成品，不能依赖原页面持续打开。
- [ ] `pnpm test`、`pnpm build`、现有 Hotel Lobby / Genjutsu 回归验证；真实 fal smoke 在有授权素材后进行。

## 9. 上线步骤与素材边界

1. 先取得/拍摄**可商用、有权使用的**派对动作参考片并裁剪为 15.0 秒以内，上传既有 R2 的 `hotel-lobby/templates/burning-bridges-15s-v1.mp4`。
2. 增加 preset 配置（默认 enabled=false）、旧生成组件小范围兼容分支和原 API preset 参数。
3. 将 requestId bind 失败恢复修在现有 Hotel Lobby 生成链路，完成回归测试。
4. 加 Burning 专题页面（SEO 与使用说明），做好只有一个角色上传的前端交互及语言文案。
5. 管理员在 staging 做 15s 实际生成和成本检查后才启用 preset 并部署；出现稳定性/版权问题可以单独关 Burning preset，不影响 Hotel Lobby。

**上线不等于使用 Drake 的原始素材。** 未取得授权时可做“同类派对视频风格”的自制模板，并在页面明确标记为 inspired，不宣称是官方 MV 或官方合作；音轨由用户在发布平台内按其许可使用。

---

**本文件为方案 A 的审查修订版，实际仓库尚未新增 Burning 页面或修改业务代码。**
