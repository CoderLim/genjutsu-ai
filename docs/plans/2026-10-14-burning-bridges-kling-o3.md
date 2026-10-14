# Burning Bridges AI 专题：fal Kling O3 V2V Edit 技术方案

- **日期**：2026-10-14
- **状态**：待实现 / 待素材授权确认
- **目标仓库**：CoderLim/genjutsu-ai
- **范围**：专题页 + 1 张角色照片 + 固定参考视频 + 异步生成、积分与作品回收
- **不包含**：本 PR 不修改生产代码、不部署、不下载或上传 Drake 官方 MV / 音轨

## 1. 背景和产品决策

近期“Drake Burning Bridges / where she at”派对换人视频传播较广。用户想用自己的照片（或获得授权的人物/宠物图片）替换舞台中央表演者，并保留举杯、面向镜头、挥手、遮额眺望等动作，以及原视频的镜头运动和周围人群。

**首版不是从文本重新生成整段视频，而是基于我们拥有使用权的参考视频做单主角 Video-to-Video Edit。**

已定 MVP：
1. **模型**：fal-ai/kling-video/o3/standard/video-to-video/edit；Pro 仅作为对照实验，不默认开放质量切换。
2. **入口**：/burning-bridges-ai；主 CTA：Upload a photo → Generate。
3. **视频**：固定一段 **10 秒、9:16、720×1280 或更高** 的授权/自制派对参考片；可多模板配置，但首版只启用一个。
4. **图片**：1 张明确包含单主体的人物或宠物图（本人或经同意的照片）；**1 个 @Element1**；不替换其他宾客。
5. **音频**：向 Kling 显式发送 keep_audio: false；用户可在 TikTok/Reels 使用其平台提供的官方音频。产品不分发 MV 原版音轨。
6. **用户体验**：预览模板 → 上传照片 → 展示服务端报价 → 余额校验 → 生成 → 刷新可恢复 → 预览/下载 → My Creations。
7. **范围边界**：不支持自定义原视频、整段 20–30 秒拼接、多人换脸、直接 TikTok 导入、无登录游客支付。迭代再做。

### 素材授权是 Go/No-Go 前置条件

- Drake 官方 MV 以及其片段、录音、人物肖像有独立的使用与商业传播风险；**公开网站不得默认抓取、裁剪、托管、再分发官方 MV 和音频**。
- 上线模板应为自制或取得适当授权的派对视频；如果要求与 MV 原片完全相同的现场/镜头，必须先获得素材的相应使用权。
- 可以在 SEO 解释热点来源，并附官方视频链接；页面不得暗示 Drake、唱片公司或 TikTok 官方合作。
- 实际产品标题可用 Burning Bridges AI Video Maker，但演示素材与文案需要如实标注“inspired party template”，不能宣称“原 MV 片段一键换脸”却展示自制片。
- 用户上传需有本人/被摄者同意与处理权利，不支持未经同意的真实人物冒充、欺骗或违规深伪内容。

## 2. 官方 API 已核对约束（2026-10-14）

官方文档：
- Standard 参数：https://fal.ai/models/fal-ai/kling-video/o3/standard/video-to-video/edit/api
- Standard 公开价格：https://fal.ai/models/fal-ai/kling-video/o3/standard/video-to-video/edit
- Pro 参数：https://fal.ai/models/fal-ai/kling-video/o3/pro/video-to-video/edit/api
- Pro 公开价格：https://fal.ai/models/fal-ai/kling-video/o3/pro/video-to-video/edit

| 属性 | Standard V2V Edit |
| --- | --- |
| 模型 ID | fal-ai/kling-video/o3/standard/video-to-video/edit |
| 必填字段 | prompt, video_url |
| 参考视频 | .mp4 / .mov，**3–15 秒**，宽高需在 720–3840 px 范围，最大 **200 MB** |
| 角色引用 | elements: [{ frontal_image_url, reference_image_urls }]；Element 参考图总计至少一张，额外参考图可有 1–3 张 |
| 总素材数限制 | 视频模式中 elements + image_urls 的总数量最多 4（以接口最终校验为准） |
| 原始音轨 | keep_audio（默认 true；本功能明确 false） |
| 其他可用参数 | shot_type（推荐 customize）；可选 image_urls 用 @ImageN 指代 |
| 输出 | video.url（MP4）以及可能的文件元数据 |
| **不可当作 V2V Edit 输入** | duration、resolution、aspect_ratio、generate_audio：本 endpoint 的文档未列为可提交的编辑参数，输出时长/画幅主要由参考视频决定 |

**选择 edit 而非 reference：** edit 的目标是修改原片主体、尽量维持现有镜头/场景；reference 适合以视频为参考重新生成镜头，可能改变背景和镜头。即使 edit 也不是逐像素保留，必须通过实际质量实验验证。

**定价快照**：Standard $0.126/输出秒，Pro $0.168/输出秒。价格会变化，严禁在前端写死为最终扣费依据。视频样例 10s Standard **$1.26**、15s **$1.89**；不含存储、带宽、支付及额外重试成本。

**重要**：热门原版剪辑常见 15–20 秒或更长，不能把完整 20 秒直接提交给 V2V Edit。MVP 固定 10 秒；阶段二才做两段分别生成与合成。

## 3. 仓库现状与复用点

仓库以 TanStack Start + Nitro/Cloudflare、Drizzle、R2、FalProvider、现有积分钱包为底座。

已核实的实现：
- src/modules/hotel-lobby/pricing.ts：HOTEL_LOBBY_MODEL 与本次模型完全相同；价格 $0.126/s；3–15s 校验。
- src/modules/hotel-lobby/service.ts：FalProvider、fal_api_key、@Video1 与 @ElementN、webhook、Kling payload。
- src/modules/hotel-lobby/storage.ts：R2 签名上传、staging → sealed copy、私有模板、结果固化、R2 对象归属校验。
- src/modules/hotel-lobby/billing.ts：aiTask scene、余额检查、事务预扣、CAS 状态、失败返还积分。
- src/modules/hotel-lobby/reconcile.ts：webhook / polling 后查询 fal、结果落 R2 再标完成。
- src/components/landing/HotelLobbyGeneratorPanel.tsx：本地预览、图片上传、积分弹窗、生成轮询、恢复与下载。
- src/routes/api/hotel-lobby/{upload-url,generate,status,webhook,result/*,template,template-meta,template-file}.ts：对应的可用路由形式。
- src/routes/hotel-lobby-ai.tsx：专题 landing SEO、FAQ 与 HowTo JSON-LD、生成器区。
- src/routes/creations.tsx：全站作品页面。
- src/modules/genjutsu/pricing.ts：100 credits / provider USD × 1.7 成本倍率，按 ceil 计费。
- .cursor/rules/higgsfield-genjutsu-pipeline.mdc：强制 Higgsfield 专题复用首页链；**明确排除 Kling/Fal 专题**，因此本项目可沿 Hotel Lobby 路线。

**不要**为 Burning Bridges 完整复制 Hotel Lobby 的 billing / storage / reconcile 文件。建议把二者共性的 Kling V2V 生命周期按场景配置抽为公共引擎，再由不同 preset / 业务路由调用。首期 refactor 不改变 Hotel Lobby 对外 API 或持久化格式，以回归测试保证原业务正常。

### 建议的代码划分（实施目标，并非现有文件）

~~~text
src/core/ai/kling-o3-v2v.ts               # Fal payload 构造、官方参数校验（不含业务场景）
src/modules/kling-v2v/                     # scene-aware 状态机、成本、封存/落盘
  pricing.ts
  task-lifecycle.ts
  storage.ts
  reconcile.ts
  presets.ts
src/modules/burning-bridges/
  preset.ts                                # 模板 registry、固定 prompt、业务约束
src/components/landing/BurningBridgesGeneratorPanel.tsx
src/routes/burning-bridges-ai.tsx
src/routes/api/burning-bridges/
  template.ts
  upload-url.ts
  generate.ts
  status.ts
  webhook.ts
  result/$generationId.ts
~~~

- **原则**：共享 Kling 代码不 import hotel-lobby 私有实现；既有 Hotel Lobby 逐步迁入共享引擎，保持 API 外观不变。具体跨模块依赖要遵守 AGENTS.md（必要时让 billing 通过既有 ai-tasks 模块协调 credits，避免横向直接耦合）。
- 可以先通过薄 adapter 将 Hotel Lobby 现有校验、R2、账务、状态逻辑参数化为 scene 配置；切勿因为赶热点把 scene 固定写成 hotel-lobby 并与新页面共用任务记录。
- 一切价格、prompt、模板 ID 由服务端查 registry；浏览器不能传 provider URL、任意 prompt、场景 key 或 credits。
- 移除 UI 中与本 endpoint 无关的 resolution / promptExpansion / aspectRatio 选择，避免让用户误以为 Kling 支持这些参数。

## 4. 固定模板与 Prompt

### 模板配置

~~~ts
type BurningBridgesPreset = {
  id: string;
  version: number;
  videoKey: string;            // 私有 R2 中的已授权视频
  width: number;
  height: number;
  durationSeconds: number;     // 服务端从素材实际探测并校验
  enabled: boolean;
  rightsStatus: 'owned' | 'licensed';
  rightsEvidenceRef: string;   // 内部授权凭据引用，不在前端暴露
};

const preset = {
  id: 'party-walk-10s-v1',
  version: 1,
  videoKey: 'burning-bridges/templates/party-walk-10s-v1.mp4',
  width: 720,
  height: 1280,
  durationSeconds: 10,
  enabled: true,
  rightsStatus: 'owned',
  rightsEvidenceRef: 'REQUIRED_BEFORE_ENABLE',
};
~~~

这是数据结构示例，**不是已经存在/已授权/已上传的素材**。不能仅凭配置字段为 owned 就视为拥有版权；必须由运营确认素材与凭据，然后才打开 enabled。

服务端应：
- 创建任务时固化 preset ID + version + R2 videoKey + ETag/版本，避免模板更换时旧任务错误绑定新版本。
- R2 模板设只读、私有；前台可获得短时预览 URL / 代理流，但生成所用 URL 仍由服务端解析。
- 素材校验 **3–15s**、长宽各 720–3840、支持 MP4/MOV、产品层最大 80 MB（沿用 Hotel Lobby，比 fal 的 200 MB 更严格）。
- 对原片超 15s 必须预裁剪/转码后作为模板；本版不在用户点击 Generate 时临时切割。
- 仅 9:16 模板，输出也预期为竖版；以实际结果为准，不传不存在的 aspect_ratio 参数。

### 单主角替换 Prompt（V1）

~~~text
In @Video1, replace only the main foreground performer who approaches
and interacts with the camera with the person or character from @Element1.
Keep the same timing, body gestures, hand movements, camera movement,
framing, party lighting, and crowd in the background.
Keep every background guest unchanged. Maintain the new subject's facial
features, outfit, and identity consistently in all frames.
Do not introduce extra people or change the camera sequence.
~~~

建议用 1 张正脸/上半身参考图传作 frontal_image_url；为了兼容 Kling Element 的 reference_image_urls 必填约束，**MVP 可复用同一图片作为 reference_image_urls[0]**，与 Hotel Lobby 现有实现一致。后续测试第二视角，未验证前不在页面承诺多图提升质量。

### 实际 fal payload（服务器构造）

~~~json
{
  "prompt": "In @Video1, replace only the main foreground performer with @Element1. Preserve the original timing, gestures, camera and surrounding guests. Keep the new identity consistent.",
  "video_url": "<server-signed-r2-url>",
  "elements": [
    {
      "frontal_image_url": "<server-signed-r2-image-url>",
      "reference_image_urls": ["<server-signed-r2-image-url>"]
    }
  ],
  "keep_audio": false,
  "shot_type": "customize"
}
~~~

使用现有 FalProvider.generate 队列提交 + HTTPS webhook；不在请求线程用 fal.subscribe 阻塞 Cloudflare Worker。密钥读取既有 Admin Settings AI 的 **fal_api_key**，仅服务器侧使用。

## 5. 用户交互与 API 合同

### 页面

- 首屏 H1：Burning Bridges AI Video Generator（或 Video Maker），展示**自有/获授权** Before/After 和 10s 预览。
- 生成器只有 1 个图片槽位（上传/移除/预览），模板不可被用户替换；显示“Replace main performer only”。
- 图片支持 JPG/PNG/WebP、最大 12 MB，客户端检查单主体提示；服务端再次校验扩展名、文件头/MIME、R2 HEAD 长度与归属。真实图片审核按现行站点规则执行。
- 展示“10s · Vertical · Kling O3 · ~215 credits”（初期可依据预估）；提交前请求服务端最终报价；Loading 包含 Uploading / Queued / Generating / Saving。
- 未登录复用已有登录跳转；余额不足复用 InsufficientCreditsModal；刷新、支付返回后支持 generationId 恢复。
- 作品完成后固定私有结果路由，可预览、下载；My Creations 显示 Burning Bridges 来源，不暴露 signed URL。
- 如模板未启用/缺失/授权未确认：禁止生成，页面改为 Coming soon 或提供自定义合法素材的替代方案。

### 端点

| Method | Endpoint | 行为 |
| --- | --- | --- |
| GET | /api/burning-bridges/template | 返回公开模板 ID/版本、缩略图/短时预览、实际时长与可用状态（不暴露 R2 内部 key） |
| POST | /api/burning-bridges/upload-url | session + generationId + 单图类型/长度 → 单图 R2 signed PUT |
| POST | /api/burning-bridges/generate | session + generationId + presetId + imageKey + 文件元数据 → seal、服务端定价、reserve、submit |
| GET | /api/burning-bridges/status?generationId=... | 仅本用户查询，轮询/对账并返回业务状态 |
| POST | /api/burning-bridges/webhook | fal 唤醒；按 request_id 定位，**重新向 fal 查询**，不信任 webhook body 中的 URL 或结果 |
| GET | /api/burning-bridges/result/:generationId | 登录本人/管理员鉴权，校验 R2 key 归属，短时签名播放；?download=1 提供下载 |

采用当前 src/lib/api-client.ts 的响应习惯。不要信任客户端传入 durationSeconds、credits、model、prompt、scene、video_url。服务端直接查 preset registry + R2 元信息，必须对相同 generationId 的不同图片哈希/预置版本请求返回 **409 CONFLICT**，不能拿旧任务伪装为新任务。

可选额外 GET /api/burning-bridges/quote?templateId=...；报价无需上传，可依据实际模板长度。最终 reserve 仍然必须服务端再算。

### 数据记录

继续沿用 aiTask，scene = **burning-bridges**，provider = fal，model = Kling O3 Standard 完整 ID：
- id / userId / scene / model / costCredits / creditId / taskId（fal request_id）。
- options 持久化 presetId、presetVersion、sealedVideoKey、sealedImageKeys、durationSeconds、keepAudio=false、inputFingerprint。
- taskInfo 包含 estimatedProviderCostUsd、providerReceipt / recoveryRequestId（必要时）。
- taskResult 含完成后 R2 videoKey、providerStatus、异常/退款元信息。
- scene 与 userId 应参与所有读写 WHERE 和 webhook 任务定位；作品查询与管理后台要能区分 Hotel Lobby。
- 同一代生成 ID 只能一次 charge 与一次 fal submit，不允许失败重试创建第二笔同 ID 提交。

## 6. 服务端状态机与异常恢复（P0）

~~~text
upload image
  -> verify R2 object metadata / ownership
  -> seal image + versioned template snapshot
  -> server-side quote
  -> atomic reserve credits + ai_task(reserved)
  -> CAS claim(submitting)
  -> fal.queue.submit
       -> request_id persisted -> submitted -> query / webhook wake-up
       -> provider FAILED -> refund once -> refunded
       -> provider COMPLETED -> persist video to R2 -> completed
  -> authenticated result / My Creations
~~~

重点不是 happy path，而是**避免“fal 已扣钱但站点认为失败、甚至再次扣款提交”**：

1. **区分 submit 阶段与 bind 阶段**：fal 成功返回 request_id 后，后续 markSubmitted / DB 写入失败**不得落入 submit 失败分类并退款或二次提交**。
2. **恢复 request_id**：在正常任务表 bind 失败时，把已知 ID 写入可恢复字段/独立恢复记录并告警；如果 DB 同样不可写，至少在结构化日志/独立持久化恢复通道留下 generationId、scene、requestId 和时间戳。不得只记录“unknown, hasRequestId=false”。
3. **未知提交结果**：网络超时、429、5xx、Cloudflare 中断不能证明 fal 未受理；标记 submission_unknown、保留积分，禁止自动重投。只有确定的拒绝（经 classifyFalSubmitFailure 判定）或 fal 官方终态 FAILED 才可退款。
4. **任务扫描**：定时扫描超时的 submitting / submission_unknown / submitted / completing / refunding，按 request_id 再查 fal；无 ID 的 unknown 转人工恢复队列，且在后台展示积压数量和年龄。不能靠用户保持页面打开才能最终完成。
5. **webhook 竞态**：webhook 可能早于 DB bind 到达；无法匹配时记录可重试事件，让后续扫描消化；绝不根据任意 webhook 的内容直接把任务标 SUCCESS。
6. **结果持久化**：确认 fal 成功后下载 result video，校验非空、合理媒体类型/长度，保存至用户私有 R2，HEAD 核验，再标 completed；R2 失败保持 completing 继续重试，**不能退款已经成功生成的 fal 任务**。
7. **幂等退款与结算**：数据库 CAS + creditId revoke 保证并发 webhook、轮询、扫描只退款一次；不要丢失错误状态或把 refunded 再显示为 processing。
8. **隐私**：R2 私有存储、短时 URL、result 路由校验 userId；日志不记录照片原始 URL、敏感人脸信息或密钥。限制 template-file 代理带宽，设置上行大小/频率/并发限额。

现有 Hotel Lobby 已实现多数 reserve/reconcile 逻辑，但其 generate.ts 存在“submit 返回 request_id 后 bind 失败进入同一 catch”的边界风险；本次提取公共引擎时需拆开 catch 范围并加恢复测试，也要确保 Hotel Lobby 不回归。

## 7. 成本与积分

和当前站点定价公式一致（src/modules/genjutsu/pricing.ts）：
- providerCost = **ceil/input 计费秒数 × 0.126 USD**（以实际传给 Kling 的模板长度和平台计费规则核对；不是任由客户端报秒数）。
- displayedCredits = **ceil(providerCost × 100 × 1.7)**。
- 10s：$1.26 → **215 credits**；12s：$1.512 → **258 credits**；15s：$1.89 → **322 credits**。
- 用户付费积分包对应的实际美元收入另行计算毛利；**1.7 倍是 credit 刻度的成本倍率，不等于 70% 真实毛利率**，也未扣支付费、退款、R2。
- 引入独立的 model price 配置/服务端 rate snapshot，更新时与 quote + reserve 同步；收费之前校验实际 billedSeconds，不允许结果超 15s 或超预算。
- 服务器最低额度不足使用全站既有 Finish Pass / 小额积分包机制，不新建一套支付链路。
- 不提供免费生成承诺。测试时用内部有额度账号，不把 fal 成本转嫁成无人值守的开放免费额度。

## 8. 质量验证 / 验收

先在 fal Playground 与 staging 运行小样本，不凭演示视频推断效果稳定：
- [ ] 已有可商用/获授权 10s 竖版模板，权利与作者记录齐全，且不包含未经授权 MV 原音。
- [ ] 同模板 3 种主体：真人照片（取得同意）、动画角色、宠物；每类至少 5 次（共 ≥15 次）；记录 fal request_id / 实际费用 / 生成时长 / 主角替换成功率。
- [ ] 主角识别清楚、动作大体一致、邻近宾客不被误替换、手遮脸后身份能恢复；在观感不佳时不自动宣称“完美保留”。
- [ ] 比较 Prompt A（短命令）/ B（强调背景不变），挑选最优；必要时用 Pro 做小样本对照，只有收益覆盖成本才开放。
- [ ] 720×1280、3s、10s、15s、非法尺寸/时长、视频格式与图片内容类型前置校验，超限不得扣费。
- [ ] 标准 Fal payload 不夹带不支持的 duration、resolution、aspect_ratio 参数；keep_audio=false 验证输出无未经授权音轨。
- [ ] 生成过程重试、重复点击、刷新、购买积分返回、网络中断，不重复 submit / 扣费。
- [ ] 4xx 拒绝、5xx/429/超时、provider FAILED、bind DB 异常、webhook 乱序、R2 存储失败、fal result URL 过期等故障注入覆盖。
- [ ] 已受理 request_id 必须可恢复；unknown / query error 计数有告警和人工处置入口。
- [ ] 完成任务可在 My Creations 重新打开、下载；其它账号无法访问该结果。
- [ ] Hotel Lobby 原有路径、账务、UI 与测试无行为回归。
- [ ] 桌面 + iOS Safari + Android Chrome 上传/播放/下载；至少验证一次弱网。

建议测试文件：src/modules/kling-v2v/*.test.ts、src/modules/burning-bridges/*.test.ts，以及一条含 fal fake、R2 fake 的 API 级 E2E。CI：pnpm test、pnpm build、pnpm e2e:genjutsu（既有回归），另做真实 fal smoke（管理员手动开关）。

## 9. 运营 SEO / 可观测性 / 上线

SEO 建议（描述必须与授权素材的实际效果一致）：
- URL：/burning-bridges-ai
- Title：Burning Bridges AI Video Generator | Make the Party Trend
- H1：Make Your Own Burning Bridges AI Party Video
- Description：Upload one photo to replace the lead in a party-style AI video. Generate a short vertical clip with Kling O3.
- FAQ：What is the trend? / Can I use one photo? / How long? / Does it use the original MV? / Is audio included? / Why might a generation fail?
- HowTo / VideoObject / FAQPage 结构化数据只在展示的真实内容与 metadata 成立时添加；不要伪造评价或时长。
- 关联 Hotel Lobby、Zombie Hug、Genjutsu Object Swap 页面；sitemap 和 hreflang 按现有路由惯例接入；i18n 先跟随站点已启用语言，未翻译不要输出空壳。

监控：template_view、photo_selected、quote_viewed、generate_clicked、insufficient_credits、upload_failed、provider_submitted、provider_failed、result_persisted、download_clicked。后台记录 scene、presetVersion、requestId、provider_cost_estimate、reserve_credits、state_age；追踪 unknown/bind_failed/R2_persist_retry。真实生产素材/用户图片不得进入 analytics payload。

上线顺序：
1. P0：授权模板准备（录制或合法取得）、上传 R2、注册 preset（默认 disabled）。
2. P0：公共 Kling V2V engine 整理 + 幂等恢复补强 + Hotel Lobby 回归测试。
3. P0：Burning Bridges 薄业务模块/API + 生成器 UI + SEO/法律文案 + My Creations。
4. P0：staging 真实测试、成本核对、故障注入与限流；确认模板授权文件。
5. P0：preset enabled + 小流量放开，观察 request_id recoverability、失败退款、效果投诉。
6. P1：多模板 / 多视角主体图片；P2：20–30s 分段生成与拼接（独立付费/结果编排、分段失败政策、音画同步评估）。

**最终上线门槛**：模板合法可用；10s 主角换人效果至少在小样本中过关；不存在重复扣费；fal 已接单时 request_id 能恢复；成果已落 R2 才对用户显示成功。

## 10. 待确认项（不阻塞文档）

- 10s 自制模板的具体镜头与授权记录；**若实际追求 MV 原片一比一复刻，则先解决授权，否则不公开该模板**。
- 15 次测试的实际换人成功率、宠物表现与速度，以及 Standard/Pro 的主观效果差距。
- fal 生产账单是否按实际模板整数秒收费、是否有平台价格变化；以最终账单校准公开预估。
- 长视频路线由新的异步转码/合成服务完成；Cloudflare Worker 当前不适合直接承担长视频 FFmpeg 转码，此项留 P2。

---

**本文件是技术设计，不代表开发、素材授权、真实模型调用或上线已经完成。**
