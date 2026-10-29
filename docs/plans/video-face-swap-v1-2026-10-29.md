# Video Face Swap V1 — 产品、技术与 SEO 一体化实施方案

> 状态：**Ready for implementation planning, not production-approved**  
> 日期：2026-10-29  
> 目标 URL：`/video-face-swap`  
> 产品入口名：**Video Face Swap**；底层模型：**WaveSpeed Video Head Swap**（不是 WaveSpeed Video Face Swap）  
> 范围：只新增功能和必要入口，不改变已有 Genjutsu / Hotel Lobby / 其他模板生成链路。  
> 本文是**实施方案**，不代表代码已开发、API 已实测或生产已上线。

## 0. 决策摘要（优先阅读）

1. **SEO 主词和 URL 不变**：面向搜索 `video face swap` 的用户，Title/H1 明确“Video Face Swap”；产品必须透明说明实际是**完整换头**（脸、头发、头部轮廓），不是单独换脸，更不是替换整个角色。
2. **本期唯一供应商**：`wavespeed-ai/video-head-swap`，不接入较便宜的 `wavespeed-ai/video-face-swap`，不借用 Seedance/Motion Transfer/Objects Swap 的提示词或设置。
3. **输入**：1 个源视频 + **恰好 1 张**授权人像；Prompt 可选；分辨率 **480p / 720p**；不支持 8 张参考图和 1080p。产品第一版接受 **3–30 秒**（主动设定的产品上限，不是供应商公布的技术最长时长）。
4. **功能语义**：尽量保留原身体动作、服装、场景及镜头构图；允许多镜头上传，但**不保证**跨镜头锁定同一身份、准确选定多人视频中的某一个人、保留音频或每次画质稳定。相关承诺须等 P0 实测。
5. **定价**：使用仓库现有 `calculateProviderCredits`：`ceil(providerCostUsd × 100 × 1.7)`；最低计费 3 秒；480p $0.04/s，720p $0.08/s，按源时长向上取整。服务器确定报价并完成原子预扣。
6. **任务与数据**：使用现有 `aiTask` + `scene='video-face-swap'` + `provider='wavespeed'`，接现有 R2 logical key、通用 WaveSpeed Client、幂等预扣/退款/结果落库模型；新增独立边界，避免复制 Hotel Lobby 的 Fal/预设业务逻辑。
7. **SEO 先英文**：自指 canonical；sitemap 只放真实英文页面；其余语言页面和 hreflang 要等翻译内容真实上线后再加。不能用英文镜像冒充多语言翻译。
8. **P0 真机实测是放量门槛**：当前官方文档确认 API 字段及定价，**并未实证多镜头、音频保留、结果时长和精确选人**；这些不能写成营销保证。
9. **合规**：只允许有权处理的影像；对真人肖像要求授权/同意；禁止欺骗性冒充、未经同意的换脸及违反平台政策的用途。媒体私有存储、访问隔离、清理周期和审核/举报流程须落实。

### 0.1 参考 SEO 稿与 V1 的差异裁决

用户提供的《video-face-swap SEO 内容参考》是**营销和内容结构参考**，其中部分“产品事实”描述的是现有 Genjutsu/Seedance 工作流，不能直接发布为本次 Head Swap 的能力。

| SEO 参考稿说法                               | V1 正确口径 / 原因                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 源视频 4–30s                                 | **3–30s**；产品主动限制，3s 为官方最低计费时长。若真实 API 对 3s 输入有限制，P0 后调整一致性 |
| 最多 8 张参考图；正/侧/三分之四多图          | **恰好 1 张** `face_image`，建议正面或三分之四角度                                           |
| 480p / 720p / 1080p                          | **480p / 720p**，官方接口不支持 1080p                                                        |
| Motion Transfer / Objects Swap 二选一        | **不提供**；这是独立的 Head Swap 工作流                                                      |
| `@Video 1` / `@Image 1`                      | **不使用**，不是该 API 的资源引用语法                                                        |
| 同时换服装、道具、场景                       | **不支持**；该模型意图保留身体、服装、背景                                                   |
| “换成整个角色 / any clip / 每个镜头稳定”     | 改为“以授权照片替换主要人物头部”；多人、遮挡、多镜头均有失败风险                             |
| “分钟内生成 / 音频完整保留 / 完全不改变镜头” | 不作确定承诺；实际时间、声音与一致性需实测                                                   |
| 七语言 hreflang 一次性全开                   | **仅英文内容**；真实翻译完成后逐语言开                                                       |
| “免费 / price: 0”                            | **积分付费**；不可用错误的免费结构化数据                                                     |
| 首屏多图、1080p 对比素材                     | 改为**单张人像示例**、480p/720p；真实案例未生成前不伪造前后对比                              |
| 参考稿中的竞品排名、DR、用户指标             | 视作未经本次复核的研究快照，不作为需求优先级或发布保证                                       |

## 1. 来源与已核实事实

### 1.1 WaveSpeed 官方文档（2026-10-29 检索）

- API：<https://wavespeed.ai/docs/docs-api/wavespeed-ai/video-head-swap>
- Playground：<https://wavespeed.ai/models/wavespeed-ai/video-head-swap>
- 提交：`POST https://api.wavespeed.ai/api/v3/wavespeed-ai/video-head-swap`
- 查询：`GET https://api.wavespeed.ai/api/v3/predictions/{id}/result`
- 参数表：`video` required、`face_image` required、`prompt` optional、`resolution` optional（`480p`/`720p`，默认 `480p`）、`seed` optional。
- 定价：源视频时长向上取整；最低计费 3 秒；官方披露的**最长计费时长** 120 秒；480p $0.04/s，720p $0.08/s。**120 秒计费上限不等于保证支持任意长度完整输出。**
- 官方定位：替换完整头部（face、hair、head outline），尽量保留 body pose、clothing、background、composition。
- 未明确确认：单个视频的接受上限、跨镜头稳定追踪、具体人物选择、音频保留策略、容器/编码、回调可用性、所有参考图格式。进入 P0 验证，不要假定。

### 1.2 仓库现状（GitHub main，2026-10-29 查阅）

- `src/core/ai/wavespeed.ts` 已有 `submitWavespeedPrediction`、`getWavespeedPredictionStatus`、`classifyWavespeedSubmitFailure`、标准结果解析；**复用，不再平行开发一套 WaveSpeed HTTP 客户端**。
- `src/lib/ai-credits.ts` 的当前公共公式为 100 credits/USD × 1.7 倍率。
- `src/modules/hotel-lobby/{billing,storage,reconcile}.ts` 具有 `aiTask` 原子积分预扣、CAS 提交/结算、R2 密封输入、结果持久化、鉴权输出 URL 的可参考模式；**Fal 和模板独有细节不可原样照搬**。
- `src/routes/api/hotel-lobby/{upload-url,generate,status}.ts` 和 `src/routes/api/hotel-lobby/result/$generationId.ts` 可参考 API 结构与前端轮询契约。
- `src/routes/sitemap[.]xml.ts` 有静态路径表、`LIMITED_STATIC_PATH_LOCALES` 和自动 alternate 构造；英文本地化限制在此处显式配置。
- `src/lib/seo.ts` 的 `localeLinks(path, locale, supportedLocales)` 会为单一可用语言返回 canonical 且不输出无效的 alternate。
- `src/routes/index.tsx`：首页 title/description 用 `m['site.home.meta_*']()`，修改首页 SEO 文字需要找到**所有实际启用的对应译文**，不能只改英文。
- `src/routes/video-face-swap.tsx` 当前不存在；本次是新建页面。

> 代码路径是建议改动入口，不是已提交的实现。Cursor 开发前重新检查 main/目标分支最新代码与接口签名。

## 2. 用户需求、范围和体验

### 2.1 目标用户与 Job To Be Done

用户已有一个可用的舞蹈、对话、表演或生活短视频，希望用**有权使用的一个人像**替换其中主体的头部，保留原视频动作和环境，在线生成并下载。

- 独立工具页，移动优先，表单式流程，不做时间轴编辑器。
- 优先服务**单人、清晰正脸、稳定光线**的源视频。
- 多人/快速运动/转头/遮挡/多镜头可以输入，但在提交前提示结果可能不稳定；不宣称精确选人。
- 不能用此模型完成宠物拟人、全身服装置换、改道具、改场景等任务；通过 Related Tools 链接到 Genjutsu 首页适当能力。

### 2.2 V1 范围

| 维度   | V1                                                  | 明确不做                                      |
| ------ | --------------------------------------------------- | --------------------------------------------- |
| 页面   | `/video-face-swap`，首屏直接见生成器                | 与首页 Object Swap / Motion Transfer 模式合并 |
| 输入   | 1 视频 + 1 人像，用户自主授权确认                   | 多身份映射、8 张人像                          |
| 视频   | 产品上限 3–30 秒；MP4 优先，其他容器仅实测后允许    | >30 秒、自动切镜头与拼接                      |
| 输出   | 480p / 720p；默认 720p（需实测成本/成功率）         | 1080p、保证保留原音轨                         |
| Prompt | 后端默认安全、简短指导 + 可选 Advanced Instructions | 提示词改衣服、换场景、强制定位人物            |
| 预览   | 浏览器本地预览输入；生成完成后播放输出              | 免费 4 秒 AI 生成预览                         |
| 支付   | 积分预扣、完成交付、明确失败退款                    | 新订阅/单独支付系统                           |
| 任务   | 关闭页面后可恢复，服务端 reconcile                  | 全靠浏览器轮询维持任务                        |
| 语言   | 英文 SEO 正文首发                                   | 自动发布未人工核对的六语言英文镜像            |

### 2.3 首屏信息架构

1. **H1**：Video Face Swap Generator（全页只有一个）。
2. 副标题：一句话说明“上传视频 + 一张授权人像，AI 更换头部并尽量保留原动作与场景”。
3. 可见生成器：**Source Video** 上传/本地预览，**Head Photo** 上传/裁剪预览；有示例，支持删除重选。
4. 480p / 720p 分辨率选择；Advanced Settings 可选 Prompt（默认收起）。
5. 上传后显示**源视频秒数、估算积分及余额**，不足时拉起既有积分弹窗。用户授权勾选必选（覆盖肖像与视频编辑权利）。
6. Generate：登录校验 → 预签名直传 R2 → 服务端验证 → 预扣 → 提交 → 状态展示。
7. Completed：播放、下载、重新生成（新费用）；Failed：明确错误与退款状态；Unknown：不要引导重复创建任务，提供人工核对入口。
8. 首屏下面先展示**真实的前后案例**（没有真实输出则暂不放案例），再展示 How-to、差异表、限制/FAQ、Related Tools。

### 2.4 输入校验与隐私

- 前端：文件大小、MIME、视频元数据、1 张照片、时长、登录/余额、授权确认；服务端**再次校验**源对象属主、键前缀、对象实际大小和格式/时长，不信任提交的 duration/credits/价格。
- 建议产品初始大小门槛：视频 ≤100 MiB，照片 ≤12 MiB；**这是拟定配置**，必须与 R2 上传链路、供应商真实限制、移动端稳定性联合确认后启用。
- 首期白名单先 MP4 视频、JPG/PNG 人像；WebP/MOV 根据 P0 实测通过后开放。对无法可靠解析时长的素材拒绝计费前提交，不能使用客户端“估算秒数”绕过计费。
- 使用带过期时间的服务端 R2 签名 URL；确认有效期足以让供应商读取素材；只允许由本次任务合法上传、sealed 的对象，不接受前端任意外部 URL。
- 本地预览不等于免费 AI 预览；文案区分。
- 不在日志、IM 告警、客服通知中泄露用户上传内容、原始可访问 URL、完整 Prompt 或人像细节；管理员访问审计；输入/结果 TTL、用户删除、滥用举报及禁止用途与现行隐私政策衔接。
- 多镜头、多人脸和模糊/遮挡风险做真实告知；避免把算法概率成功写成保证。

## 3. WaveSpeed API 与 Prompt

### 3.1 供应商调用

```http
POST https://api.wavespeed.ai/api/v3/wavespeed-ai/video-head-swap
Authorization: Bearer <WAVESPEED_API_KEY>
Content-Type: application/json
```

```json
{
  "video": "<server-signed-video-url>",
  "face_image": "<server-signed-head-image-url>",
  "prompt": "Replace the main visible subject's head with the head from the provided reference portrait. Preserve the original body, clothing, actions, camera framing and background. Match lighting and perspective naturally.",
  "resolution": "720p"
}
```

- V1 仅发送官方接口明示的字段；`seed` 默认不传（未来可在内部实验暴露固定值）。不传 `duration`、`target_index`、`reference_images`、`@Image` 等其他模型的参数。
- `prompt` 可选且属于 **best-effort guidance**。默认 Prompt 简短且保持“仅换头”，用户输入需长度限制、风险校验，与默认指导合并后在任务快照中固定；禁止通过 Prompt 绕过安全限制。
- “main visible subject”不等于确定性的人物追踪；不能宣称支持提示词精确锁定多镜头某一身份。不得偷偷增加单帧人脸搜索和全视频跟踪而不提成本与合规。
- 服务端用现有 `submitWavespeedPrediction` / `getWavespeedPredictionStatus`；适配模型 ID 和 payload 即可。
- 检查返回 `data.id`、终态 `completed/failed/cancelled/timeout/deleted`、`data.outputs` 的实际结构；标准解析器在“completed 但没有 URL”时要按错误/待核对处理，避免直接丢失或误退。
- 同一 HTTP 提交**不能自动重试**。网络断连/408/429/5xx 可能已经提交上游；只有确认拒绝时才直接退款。

### 3.2 真实调用验收 P0（开发前）

准备**已获授权**的 3–5s、15s、30s 测试素材和一张清晰人像；用 WaveSpeed Playground/一次性脚本分别验证：

| 测试                              | 需要记录                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ |
| 480p/720p 各一条                  | 实际接受的 JSON、价格、时长、输出尺寸、音频存在与否、输出格式/URL 有效期 |
| 单镜头正脸/侧脸/遮挡/快动作       | 头部接缝、脸型/发型、身份一致性                                          |
| 多镜头：单人→双人→单人            | 是否误替换第二人；跨镜头同人是否稳定                                     |
| 仅默认 Prompt vs 加用户 Prompt    | Prompt 有无实际约束效果、是否影响身体服装和场景                          |
| 3s / 30s 边界、无效输入、错误参数 | 输入允许范围、失败分类与供应商是否收费                                   |
| 真实 10–30s 作业                  | 端到端处理时长、R2 签名 URL 到期风险、移动端可用性                       |

**P0 结论必须给出样例记录和是否通过**，不能把“官方宣称”当作实测；音轨不保留时应更新 UI/FAQ 或暂停发布。没有实测结果时禁止在网页宣称“多镜头稳定”“完美口型”“保留原声音”。

## 4. 后端实现架构

### 4.1 推荐的文件边界

```text
src/routes/video-face-swap.tsx
src/routes/api/video-face-swap/upload-url.ts
src/routes/api/video-face-swap/generate.ts
src/routes/api/video-face-swap/status.ts
src/routes/api/video-face-swap/result/$generationId.ts

src/modules/video-face-swap/pricing.ts
src/modules/video-face-swap/service.ts
src/modules/video-face-swap/billing.ts
src/modules/video-face-swap/storage.ts
src/modules/video-face-swap/reconcile.ts
src/modules/video-face-swap/video-metadata.ts

src/components/landing/VideoFaceSwapGeneratorPanel.tsx
src/components/landing/VideoFaceSwapSeoSections.tsx
```

不为单功能重复造 WaveSpeed provider；若现有 R2、任务结算接口不适合跨场景直接调用，可抽取**小范围共享底座**并用旧场景回归测试兜底。不要做范围失控的统一生成平台重构。

### 4.2 内部模型/任务快照

- `scene='video-face-swap'`；`provider='wavespeed'`；`model='wavespeed-ai/video-head-swap'`。
- `aiTask.options`/`taskInfo` 的建议快照字段：`videoKey`、`imageKey`、`durationSeconds`、`billableSeconds`、`resolution`、`effectivePrompt` 或 Prompt hash（遵守隐私留存策略）、`pricingVersion`、`providerCostEstimateUsd`、`estimatedCredits`、`inputVersion`、`consentVersion`。
- 定价、输入文件、Prompt、参数**创建任务后不可变**；若相同 `generationId` 携不同内容重复请求，返回 `409 GENERATION_CONFLICT`，不得以旧扣费执行新素材。
- `userId`、`scene`、任务 ID 三者关联用于所有读、写和结果获取；管理员权限显式审计；不泄露上游内部对象信息。

### 4.3 请求/响应建议（以前后端现有 `respData`/`respJson` 格式为准）

1. `POST /api/video-face-swap/upload-url`：`generationId`、2 个内容类型、长度；返回各自独立签名上传 URL 与 logical keys；验证登录、上传额度和允许类型。
2. `POST /api/video-face-swap/generate`：`generationId`、`videoKey`、`imageKey`、`resolution`、`userInstructions`、必要的上传元数据；**不接受**客户端直接传 `credits`、`providerCost` 或最终视频时长作为结算依据。
3. `GET /api/video-face-swap/status?generationId=...`：`processing/completed/failed`，进度阶段、所扣/退积分、结果受保护访问路径；只查本人任务。
4. `GET /api/video-face-swap/result/:generationId`：检查本人所有权与 completed，读服务端结果 key，发短期签名 URL 或安全流式下载；不能直接暴露长期公开对象地址。

签名上传阶段 R2 key 示例：

```text
video-face-swap/inputs/{userId}/{generationId}/video.mp4
video-face-swap/inputs/{userId}/{generationId}/head.jpg
video-face-swap/sealed-inputs/{userId}/{generationId}/video.mp4
video-face-swap/sealed-inputs/{userId}/{generationId}/head.jpg
video-face-swap/results/{userId}/{generationId}.mp4
```

保持仓库既有“**数据库/API 存 logical key，物理 prefix 在 R2 边界只加一次**”约定。上述为命名约定，不要求迁移老对象。对象 seal 时复核 size、MIME、ETag/内容一致性，防 TOCTOU 换文件；输入签名与结果签名不可混用。R2 文件访问必须考虑 URL 过期、Range/媒体读取与浏览器 CORS。

### 4.4 计费与幂等状态机

```text
local_upload
  -> preflight_ok
  -> reserved (transaction: reserve credits + create aiTask)
  -> submitting (CAS owner)
  -> submitted (predictionId stored)
  -> completing (provider completed, copy to R2)
  -> completed (authorized result available)

reserved/submitting -> refunded       [definite rejection, exactly once]
submitted           -> refunded       [confirmed terminal failure, exactly once]
submitting          -> submission_unknown [timeout / 429 / 5xx / lost ACK]
submitted           -> processing     [poll transient errors, bounded retry]
completing          -> completing     [R2 write failed: retry persistence]
```

- 开始请求前先检查用户余额、输入、模型配置，再在**同一数据库事务**内冻结报价、消耗积分、创建任务。若同 ID 已存在先对照快照。
- 通过 CAS 抢占提交权，多个浏览器重入只能发起**一个**真实供应商请求。
- `classifyWavespeedSubmitFailure` 返回明确拒绝才退款；网络超时/429/5xx 标记 `submission_unknown` 且**暂停重试/暂不自动退款**，记录运维待核验告警；上游已接受但 DB 绑定失败时必须保留 prediction ID 以便恢复。
- 状态轮询发现终态失败，CAS 退款一次；provider completed 但 R2 copy 失败视为 `completing/persisting`，可重试存储，**不能误退用户**。
- 任务已返回 completed 只展示自家持久化结果 URL；不能依赖供应商临时下载链接长期可用。
- 客户端关闭仍能恢复：服务端定时 reconcile（复用现有 scheduler/cron 能力，若没有则加最小定时恢复）扫描 submitted/completing/unknown；设定上限、退避、运维报警和人工对账入口；不可只由前端轮询触发。
- 用户手动重试：明确区分同 generation ID 的**状态查询/续传**与新 generation ID 的**付费新生成**。远端提交不确定的任务绝不自动创建新收费任务。

### 4.5 积分与价格展示

官方费率（需发布时复核）：

| 输入秒数 | 480p 成本 | 480p 积分 | 720p 成本 | 720p 积分 |
| -------: | --------: | --------: | --------: | --------: |
|        3 |     $0.12 |        21 |     $0.24 |        41 |
|        5 |     $0.20 |        34 |     $0.40 |        68 |
|       10 |     $0.40 |        68 |     $0.80 |       136 |
|       15 |     $0.60 |       102 |     $1.20 |       204 |
|       30 |     $1.20 |       204 |     $2.40 |       408 |

```ts
// product-side billing rule — server authoritative
const billedSeconds = Math.max(3, Math.ceil(authoritativeDurationSeconds));
if (authoritativeDurationSeconds < 3 || authoritativeDurationSeconds > 30) {
  throw new Error('Source video must be 3–30 seconds');
}
const usdPerSecond = resolution === '720p' ? 0.08 : 0.04;
const providerCostUsd = Number((billedSeconds * usdPerSecond).toFixed(6));
const credits = calculateProviderCredits(providerCostUsd);
```

- 不依赖客户端 metadata 作最终计费；引用项目服务端媒体元信息探测，探测失败时在预扣前拒绝，严格避免 0 秒/NaN/长度兜底错误。
- UI 估价与服务器预扣使用相同纯函数，服务器二次计算；冻结 `pricingVersion`，后续改费率不修改旧任务和旧订单。
- 不对用户保证固定美元购买价；展示“estimated X credits”与当前余额，正式价格以服务器报价为准；真实 provider charge 与估算差异记录运维指标，**不悄悄追加扣费**。

## 5. SEO 策略与页面技术

### 5.1 页面语义与 TDK（英文 V1）

- **Primary intent**：`video face swap`（工具可直接用）；**secondary**：`AI face swap video`、`head swap video`。
- **URL**：`https://genjutsuai.net/video-face-swap`。
- **Title**：`Video Face Swap Generator – AI Head Swap | Genjutsu AI`。
- **Meta description**：`Swap a face in a video with one authorized portrait. Upload a 3–30s clip, keep the original body motion, and generate an AI head swap in 480p or 720p.`
- **H1**：`Video Face Swap Generator`。
- **Hero subtitle**：`Replace a head in your video with one portrait you have permission to use. Keep the original performance and scene while AI adapts the head to the camera angle and lighting.`
- **Trust chips**：`One Portrait` · `Original Motion` · `Up to 720p` · `Authorized Media Only`。
- **Canonical**：self-reference 英文页面。OG/Twitter 复用 `socialMeta`，真实案例图待产出后使用独立 OG；避免无资源路径/失效图片。
- 明确这是 Head Swap（头发也可能改变），而非只更换面部五官。不要为 SEO 把模型和 UI 功能写错。

### 5.2 SSR、语言、sitemap、Schema

- 路由使用仓库的 TanStack Router / Start `createFileRoute`；Title、description、H1、正文首段、How-to、规格表和 FAQ 都应有**服务端可见的 HTML**，生成器交互再客户端 hydrate；可用 `curl` 或抓取 HTML 实际验证。
- 英文内容先发：`localeLinks('/video-face-swap', getLocale(), ['en'])` 或项目兼容等价方式；**不得输出 /ja /ko /es /pt-BR /fr /de 的 hreflang**。参照 `/tiny-desk-ai` 英文优先策略。用户切到其它语言时不可保留英语镜像却宣称翻译完备。
- `src/routes/sitemap[.]xml.ts`：`STATIC_PATHS` 添加 `/video-face-swap`，`LIMITED_STATIC_PATH_LOCALES['/video-face-swap'] = [baseLocale]`；只产出真实英文 URL。`priority=0.9` 可按 SEO 稿建议特判，但不是排名因素，不必为数值做复杂架构。
- 结构化数据：`SoftwareApplication` 的 `name`、`url`、`applicationCategory='MultimediaApplication'` 可基于真值；`offers` 不得写 `price:0`，因为推理需要积分；若无法准确建模可变积分价格，可暂不输出 Offers，等上线后以用户实际可见的收费逻辑生成。`FAQPage` 如使用，内容必须与可见 FAQ 完全一致，且不要预期所有网站都能获得 Google FAQ 富摘要（此类富结果资格有限）。
- 重要：检查首页各语言已有 `site.home.meta_description` 是否真的包含“without changing who or what is in it”；**先确认再修改**。如果确有冲突，可以改成更准确的“preserve the source shot and motion while editing permitted visual elements”；不能承诺所有镜头绝对像素级不变。
- 不要按参考稿假设 `/blog` 有可直接编辑的任意文章；内链从真实存在且语义相关的页面添加，并避免胡乱堆锚文本。

### 5.3 SEO 可发布正文（English, V1，开发需保持事实一致）

以下正文在 P0 验证前**不含多镜头、音轨保留、精确选人或具体完成时长的保证**；开发可直接以可见章节/FAQ 数据实现。

#### What a video face swap actually takes

A photo face swap changes a still image. Video adds head turns, changing light, expressions, and camera movement. A convincing result needs more than placing a static face over each frame.

Genjutsu AI's Video Face Swap tool uses a source clip and one reference portrait. Under the hood, it performs a head swap: the face, hair and overall head shape can change, while the model aims to preserve the original body movement, clothing and background. Results depend on the source footage and the quality of the portrait.

Start with a clip where the subject is clearly visible. A well-lit, steady shot usually gives the model more useful information than a heavily blurred or obstructed face.

#### How to swap a face in a video

**1. Upload your source video.** Choose a 3–30 second clip with a clear main subject. Preview your original video before starting.

**2. Add one reference portrait.** Use a sharp front-facing or three-quarter-view image of a person whose likeness you are authorized to use. Neutral lighting and an unobstructed face are recommended.

**3. Choose the output resolution.** Select 480p for a lower-cost result or 720p for higher-resolution output. You can optionally add a short instruction, but it cannot guarantee which person is targeted in complex footage.

**4. Review credits and generate.** We show the estimated credits before you submit. Once processing finishes, review the result and download your video.

#### Why keeping the original performance matters

You have already captured the movement, timing, and framing you want. Head swap works from that performance rather than asking you to describe a brand-new dance or camera move. The model attempts to adapt the replacement head to the original head movement, lighting and perspective.

There are limits: fast cuts, strong motion blur, hands covering the face and scenes with multiple people can reduce consistency. If an individual shot matters, review the output carefully before publishing.

#### Video face swap vs. photo face swap

|                | Photo face swap            | Video face swap (this tool)                      |
| -------------- | -------------------------- | ------------------------------------------------ |
| Input          | Still images               | One source video + one portrait                  |
| Main challenge | Face angle and lighting    | Moving faces, changing perspective and occlusion |
| Output         | A single edited image      | A processed video                                |
| Best for       | Avatars, still-image memes | Short skits, dances and personal video projects  |

If you only need to change a face in a single photo, choose a photo editor. Use this tool when the material you want to edit is already a video.

#### What changes — and what stays

**Changes:** the subject's head appearance, including facial features, hairstyle and head shape, based on your authorized reference portrait.

**Designed to stay:** the original body pose, clothing, surrounding scene and framing. This is a goal of the model, not a frame-perfect guarantee. For full-character replacement, outfit changes or scene edits, explore Genjutsu AI's other video editing workflows instead.

#### Specs at a glance

| Spec              | Video Face Swap V1                                          |
| ----------------- | ----------------------------------------------------------- |
| Source video      | 3–30 seconds per generation (site limit)                    |
| Reference images  | Exactly one portrait                                        |
| Output resolution | 480p or 720p                                                |
| Prompt            | Optional guidance                                           |
| Multi-shot input  | Accepted; cross-shot identity consistency is not guaranteed |
| Multiple people   | No precise target-person selection guaranteed               |
| Price             | Prepaid credits, shown before generation                    |
| Processing time   | Varies by video length and provider queue                   |
| Page language     | English at initial launch                                   |

#### Consent, likeness and responsible use

Use only video and portraits you own or have permission to edit. Obtain the necessary consent before changing a real person's likeness in a video. Do not create deceptive impersonations, misleading endorsements or content intended to make others believe someone said or did something they did not. Follow the site's Terms of Service and the model provider's policies.

#### What people use video head swaps for

Creators experiment with their own authorized portraits in dance clips, skits, personal storytelling and short-form video. Teams can use authorized footage to prototype fictional or consented character appearances without reshooting the original body movement. Always review the result and get the necessary rights before sharing or commercial use.

### 5.4 FAQ：英文可直接展示；Schema 必须同源

**Q: What is the difference between face swap and head swap?**  
A: This tool uses a head-swap model. It may change the face, hair and head outline, while trying to keep the original body, clothes and background. It is not a full-character replacement tool.

**Q: How many photos do I need?**  
A: One clear reference portrait, plus the video you want to edit. You do not need several reference angles for this tool.

**Q: How long can the video be?**  
A: This version accepts videos from 3 to 30 seconds. The limit is set for this tool and may change after additional testing.

**Q: What resolutions are available?**  
A: 480p and 720p. The credit estimate depends on source duration and selected resolution.

**Q: Can I swap a face in a video with several cuts or people?**  
A: You can upload a video with cuts, but consistent identity across cuts or accurate selection of one person in a crowd is not guaranteed. A clear single-subject clip is recommended.

**Q: Can I change the clothes or the background too?**  
A: No. This tool is designed to replace the head while retaining the original body and scene. Use another Genjutsu AI editing workflow for broader changes.

**Q: Is video face swap free?**  
A: Generating a result uses prepaid Genjutsu AI credits. The estimated credit cost is displayed before you start.

**Q: Can I leave the page while the video processes?**  
A: Yes. Your job is recorded so you can return to check its status when processing has finished.

**Q: Can I use the output commercially?**  
A: Only when you have the necessary rights and consent, and your use complies with the site's terms, provider policy and applicable law. The tool itself does not grant rights to anyone's likeness or source footage.

**Q: Does it keep the original audio?**  
A: Audio behavior depends on the model's output. Check the result before publishing; we do not guarantee preservation of the original soundtrack.

对 FAQ 不要另写一套手工 JSON-LD 文本：从页面实际展示的同一 `FAQ_ITEMS` 生成结构化数据，减少内容漂移。

### 5.5 内链布局（上线时少量、真实、自然）

| 来源                                            | 锚文本建议                                   | 位置 / 约束                                          |
| ----------------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| 首页 `WhatYouCanChange` 或 Feature 区           | `video face swap`                            | 1 个显著入口，准确描述“头部替换”，不要归类成全身换人 |
| `SiteHeader` Trending / Tools（按真实 UI 结构） | `Face Swap`                                  | 1 个入口，兼顾移动菜单                               |
| `/genjutsu-prompts`（确有适合上下文时）         | `swap a face into a video`                   | 内容末段，与独立 Head Swap 的 Prompt 用法区别开      |
| `/ai-zombie-hug` / `/shan-shen-bu`（酌情）      | `try a video face swap`                      | 只在内容自然相关处加，别把不同模型能力说成同一种     |
| 新页 `Related tools`                            | `video to video editing` / `motion transfer` | 链到首页或实际存在的对应工具页                       |

“精确匹配锚文本轮换”是写作提示，不是 Google 排名保证；不必为 SEO 在无关页面强插内链。首发不用强制新博客文章，真实案例和页面体验优先。

### 5.6 素材资产规划

| 资产               | 文件建议                            | 内容/规格                                               | 上线门禁                       |
| ------------------ | ----------------------------------- | ------------------------------------------------------- | ------------------------------ |
| 首屏短循环         | `video-face-swap-demo.mp4`          | 真实授权 before/after，静音循环，可延迟加载，建议 ≤3 MB | P0 真实生成、授权、可播        |
| 参考人像示意       | `face-swap-reference-portrait.webp` | **单张**真实可用人像（不是三张示例）                    | 不涉及未经授权人物             |
| 前后对比           | `face-swap-before-after.webp`       | 同一个源片与实际输出的真实帧，建议 1600×900             | 明确标注 source/result         |
| OG                 | `og-video-face-swap.webp`           | 1200×630，清晰可读 Title/产品视觉                       | 资源部署后再写 og:image        |
| 分辨率对比（可选） | `face-swap-480p-vs-720p.webp`       | 同源素材真实对比                                        | 不能伪造分辨率效果或宣称 1080p |

首屏生成器必须早于冗长 SEO 文章，素材压缩避免影响 LCP；视频 poster、preload、图片 width/height/alt 及移动端网络策略要验证。

## 6. 观测、运维与失败告警

事件建议：`face_swap_view`、`face_swap_upload_started`、`face_swap_upload_failed`、`face_swap_quote_shown`、`face_swap_generate_clicked`、`face_swap_submit_accepted`、`face_swap_completed`、`face_swap_failed`、`face_swap_credits_refunded`。**严禁将媒体 URL、用户照片内容、完整 Prompt 作为埋点属性**。

服务端结构化日志最少含 `generationId`、`scene`、`provider`、`model`、`stage`、`errorCode`、`status`、`durationBucket`、`resolution`、`estimatedCost`（不记录用户敏感数据）。重要指标：生成成功率、供应商 API 提交失败率、端到端耗时 P50/P95、未完成任务年龄、R2 落库失败率、自动退款率、实际/预估成本差、每单支付贡献毛利。

告警分类：

- **P0**：同一任务重复扣费/重复提交、跨用户结果可访问、批量失败、敏感数据泄露。
- **P1**：`submission_unknown` 累积、任务长时间停留 `reserved/submitting/submitted/completing`、结果落库持续失败、退款 CAS 失败。
- **P2**：暂时性 WaveSpeed 429/5xx、上传偶发失败、成本偏离阈值。

优先复用已有监控/IM 通道；不在本期重新引入一套告警平台。通知消息只包含可操作的内部任务 ID、非敏感错误分类和后台链接。

## 7. 任务拆分与开发验收

### P0 — Provider Spike / 技术事实验证（上线阻断项）

- [ ] 用官方真实 API 逐项确认 `face_image`、`prompt`、`resolution` 输入契约。
- [ ] 留存至少一条 480p、一条 720p 真实成功样例的预测 ID、成本和已授权测试材料说明（不提交私人 URL/API key/原片）。
- [ ] 验证 3 秒、15 秒、30 秒；单镜头、切镜头、多人、侧脸；音轨、输出格式和结果有效期。
- [ ] 基于结果写“支持/不保证/暂禁用”清单；有重大限制同步修订文案与功能范围。

### P1 — 独立纯逻辑 + Provider Adapter

- [ ] 新建 `pricing.ts`（费率、整数计费、价格版本、输入校验）和纯单元测试。
- [ ] `service.ts` 复用核心 WaveSpeed client，新增 payload builder / 参数校验 / 状态归一化单测。
- [ ] 明确默认 Prompt、用户文字限制、只换头的功能边界。

### P2 — 受保护输入 / 任务结算

- [ ] 上传地址、R2 封存、源元数据权威校验、属主与 key 校验。
- [ ] 生成接口预扣与任务创建同事务；重复生成幂等、同 ID 改参数冲突。
- [ ] 提交不确定态（不能立即退款）、成功/失败 CAS、定时 reconcile、R2 结果持久化、受保护下载。
- [ ] 错误模拟：上游 4xx/429/5xx/断线/超时、DB 写失败、R2 copy 失败、重复状态轮询、取消请求。

### P3 — 交互页

- [ ] `/video-face-swap` SEO 服务器可见、生成器首屏、上传/本地预览、余额与报价、授权勾选、实时状态、结果下载。
- [ ] 无障碍校验、移动端（尤其 Android 上传）与 iOS 浏览器测试、非法视频时长/类型拒绝。
- [ ] 关闭页面再打开可恢复历史任务；不能误提示成功、不能在未知状态诱导重新消费积分。

### P4 — SEO、内容与入口

- [ ] 上线本方案的英文 TDK、正文、FAQ、真实 Specs、canonical、JSON-LD（与可见正文一致）。
- [ ] sitemap 英文限定 + 检查多语言 alternates；真实可访问页面再开放收录。
- [ ] 首页 Feature、Tools/Trending 加入口；检查并按需修正首页多语言 meta 描述冲突。
- [ ] 真实授权前后案例、OG；没有真实素材时隐藏占位，不使用模型想象的“真实输出”。

### P5 — 回归与灰度发布

- [ ] `pnpm test`、`pnpm build`、`pnpm cf:build`（按仓库 CI 实际命令），必要的端到端 Mock/真实小额度测试通过。
- [ ] 现有 Genjutsu 主流程、Hotel Lobby、Tiny Desk 和 R2 logical key 路径不受影响。
- [ ] 试运行阶段开放限流/特性开关，监控成本、成功率、退款、长时间无终态任务。
- [ ] 生产手工检查 HTML 源码含 H1/SEO 文本、canonical、sitemap 只英文；提交 GSC 网站地图并请求索引（人工步骤，未执行不得标记完成）。
- [ ] 检查 Terms、隐私政策、模型商业使用授权与用户肖像同意文案；完成政策与风险人工审查。
- [ ] 记录最终上线 commit SHA、模型定价复核日期、真实监控结果，之后再标记完成。

## 8. 测试矩阵（必须有可重复自动化测试）

| 分类      | 必需案例                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------- |
| 时长/计费 | 3.0/3.01/4.2/15/30/30.01s；计费向上取整、最低 3 秒；前后端报价一致                             |
| 分辨率    | 480p、720p 正常；1080p/未知值后端拒绝                                                          |
| 输入契约  | 0/2 张照片、缺视频、错误 MIME、大小超限、损坏视频、无可信服务端时长                            |
| 权限      | 未登录；跨用户 uploadKey、结果、status；伪造 R2 logical key / 外部视频 URL                     |
| 幂等      | 相同 ID 同参多次点击、并发请求、相同 ID 不同参数/素材、已提交任务断线重进                      |
| 供应商    | API 400、401、408、429、500、断线；返回 ID 后 DB 异常；完成无 URL；坏 URL                      |
| 结算      | 退款只一次；预扣只一次；completion 多次 callback/poll；R2 存储失败重试不退款                   |
| 持久化    | SSR 页面刷新、关闭页面恢复、结果 URL 签名有效期、R2 logical key 前缀不重复                     |
| UI        | 移动端上传、网络失败可恢复、低余额入口、错误/等待态、下载适配                                  |
| SEO       | Title/H1/description、英语 canonical、自指链接、sitemap 英语唯一、no 404 hreflang、Schema 同文 |

## 9. 上线门禁、风险与待决事项

**必须修复才可上线**

- API P0 成功案例 + 真实价格 / 结果格式确认；代码测试通过。
- 积分重复扣费 / 重复供应商提交 / 跨用户访问不可发生。
- `submission_unknown`、卡住任务、结果持久化失败有恢复与告警。
- 公共页面功能、收费、同意及输出能力说明真实，不宣传 1080p、8 张图、精确选人、多镜头稳定性、完整音轨保留。
- 首发英文的 sitemap/hreflang/canonical 正确，不能公开 404 或未经翻译语言版本。

**需要后续实测/产品裁决，不阻止写代码但阻止误导发布**

1. 3 秒视频是否被供应商实际接受（若不接受则调整网站最小值与定价展示）。
2. 720p 默认是否合适：若 P0 发现失败率或延时明显更差，可改成 480p 默认。
3. 上游是否保留原音频：未证实前页面不承诺。
4. Prompt 对“指定主体”和发型的一致性效果：不能把 Prompt 当 tracking ID。
5. 支持 MOV、WebP、其它编码及输入文件大小的安全范围：只在 P0 证实后开放。
6. 媒体留存 TTL、删除入口、举报/人工审查策略与平台现行政策协调。
7. 英文页发布后，通过 GSC、生成完成率、付费转化、退款率评估下一轮多语言投入；不是先堆 7 个英文镜像。

## 10. Cursor 执行说明（作为开发入口）

1. **以本方案为规格**。先阅读当前 main 里 `src/core/ai/wavespeed.ts`、`src/lib/ai-credits.ts`、`src/modules/hotel-lobby`、`src/routes/sitemap[.]xml.ts`、`src/lib/seo.ts` 及现有页面/相关测试；若本方案与更新后的代码冲突，说明差异并采用仓库最新正确约定。
2. 按 P0→P1→P2→P3→P4→P5 分组实施，每组可独立测试、提交；优先实现完整的原子计费/故障恢复再连上公网入口。
3. 不要擅自改动其他生成器、R2 物理前缀、积分礼包与全站多语言架构；任何必要共享抽取要有旧场景回归证据。
4. 未取得真实外部 API 凭据时，用 Mock/测试替身完成可验证部分，把必须在线核验的 P0 项标注为 `NOT VERIFIED`，**不得伪称通过**。
5. 最终提交需包含关键测试命令结果、实际风险、手动上线步骤和可回滚开关；生产发布由维护者决定。

---

### References

- User-provided SEO reference draft: `粘贴的 Markdown (1).md`（输入来源，用于写作结构；非本期模型能力的权威来源）
- WaveSpeed Head Swap official docs: <https://wavespeed.ai/docs/docs-api/wavespeed-ai/video-head-swap>
- WaveSpeed Head Swap model card: <https://wavespeed.ai/models/wavespeed-ai/video-head-swap>
- Repo contracts: `src/core/ai/wavespeed.ts`, `src/lib/ai-credits.ts`, `src/modules/hotel-lobby`, `src/routes/sitemap[.]xml.ts`, `src/lib/seo.ts`

**文档变更原则**：后续 P0 或模型定价变化时，要同步改 `能力矩阵 → 费用计算 → UI/SEO 文案 → FAQ/Schema → 测试`，禁止仅修改提示词或单处 marketing text。
