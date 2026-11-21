# Unified AI Image / Video Generator — 技术设计与实施方案

> Date: 2026-11-20  
> Status: **Design approved for implementation; NOT implemented** (updated 2026-11-21: separate generation pipeline)  
> Scope: Genjutsu AI 的新通用 AI Video Generator 和 AI Image Generator 内页  
> Target: `main` 分支后续实施；本文仅是设计，不代表 API / 模型已可用。

## 0. 已确定的产品决策

1. **共用一套表单内核**：图片/视频共用 Model Registry、能力/参数校验、素材处理、积分计算、任务执行；两种媒体类型可以分别呈现不同字段。
2. **模型能力决定表单**：模型是否支持 First Frame、Start & End、All-in-One Reference、音频、画质、尺寸等，均通过模型配置声明；不依赖组件里的 model-id 判断。
3. **切换时直接规范化**：合法参数保留；不合法参数恢复新模型默认值；多余素材直接从当前表单移除；不做隐藏草稿/撤销恢复。不同语义的素材不能自动错位映射。
4. **积分与当前表单参数组合挂钩**：模型、模式、分辨率、时长、输出张数/条数、音频、参考素材数、质量/快速档等；并非每个字段对所有模型都收费。
5. **前端本地即时计算**：普通表单切换不会调用报价 API；前后端共享确定性的价格规则。后端仍独立校验并最终计费。
6. **移动端纵向平铺**：素材 → Prompt → Model → 参数项 → Generate；不是桌面紧凑工具栏里的多层弹窗。桌面保留紧凑 Composer 方向，二者共用状态和组件。
7. **独立的新业务链路**：新 `/api/generator/*` + `src/modules/generator/*` 独立拥有生成任务编排、状态、适配器、上传封存、计费与恢复；不调用现有 `/api/genjutsu/*` 或 `src/modules/genjutsu/*` 业务流程。旧 `GeneratorPanel`、`image-to-video`、`hotel-lobby`、`h3-lab` 与已发布内页保持原样。

### 明确不做

- 不引入通用可编程表单 DSL / 任意 JS 表达式求值引擎；有限的字段依赖直接使用类型化规则和简单 `normalize` 函数。
- 不搭建常规 `POST /api/generator/quote`；仅启动时获取公开能力/定价配置，参数变更同步重算。
- 不为每个模型复制一套完整的表单和任务系统。
- 不直接向用户承诺所有模型都能做同一种模式；展示与 API 能力必须逐一核实。
- 不在本次设计文档提交中修改业务代码、部署、修改支付配置或数据库。


## 0.1 架构隔离：新生成器 ≠ Genjutsu API 扩展（2026-11-21 澄清）

**“Genjutsu AI” 是网站/仓库名称；`genjutsu` 也是已有特定视频业务模块。新的通用 Image/Video Generator 是另一套业务系统，不因同在一个站点就复用旧 Genjutsu 生成入口。**

~~~text
旧链路（保持不变）：
  老模板 / 首页 GeneratorPanel
    -> /api/genjutsu/{attempt,upload-url,seal-inputs,generate,status,...}
    -> src/modules/genjutsu/{workflow,billing,service,storage,...}
    -> 旧业务专属 provider/model/template 流程

新链路（独立实现）：
  /ai-image-generator + /ai-video-generator
    -> /api/generator/{models,upload-url,generate,status,result,...}
    -> src/modules/generator/{registry,normalize,pricing,validation,storage,billing,service}
    -> 新 GeneratorProviderAdapter (Fal / WaveSpeed / future)
    -> 新 generation task、webhook/cron/reconcile、R2 result

共用基础设施（不共用旧业务编排）：
  Auth / Credits wallet & payments / DB connection & aiTask table / R2 client
  / logging & rate limit / generic AI provider transport / My Creations entry
~~~

| 必须是新 generator 自己的业务模块 | 可以共用的基础设施 |
| --- | --- |
| model registry、workflow 能力、参数映射 | `core/auth` 账户会话 |
| `/api/generator/*` API、上传签名/输入封存与任务查询 | `core/storage` / R2 底层客户端与 logical-key 解析函数 |
| generator 的任务状态机、幂等 claim、提交/恢复/退款编排 | `modules/credits` 钱包扣减/撤销原语（非旧业务 `reserveGenjutsuCredits`） |
| generator 的积分费率、表单合法性、模型 feature flags | `aiTask` 表和数据库连接（`scene = 'generic-generator'`） |
| generator 自己的 provider adapters、webhook/定时补偿 | `core/ai` 中稳定、无旧业务语义的 SDK/HTTP transport |
| generator 自己的任务结果持久化与 API response | `My Creations` 查询展示入口（要扩展新 scene） |

禁止依赖：

- 新页面/新 API **不得调用** `/api/genjutsu/*`、`/api/image-to-video/*`、`/api/h3-lab/*`、`/api/hotel-lobby/*` 等旧业务生成接口，也不把旧业务路由改成新系统的统一代理。
- 新的 `modules/generator` 不调用或 import **旧业务任务编排函数**，例如 `createGenjutsuAttempt`、`reserveGenjutsuCredits`、`submitImageToVideo`、`claimHotelLobbySubmission`；旧业务状态机和参数约定仅作设计参考。
- 新功能不依赖 `GENJUTSU_*` env/model/profile 路由、旧模板 allowlist、历史任务的 provider binding 或提示词绑定；使用独立 `GENERATOR_*` 配置、新 registry。
- 即使新旧链路调用同一家供应商或 SDK，也保持独立 adapter、任务 ID 绑定、回调路由、恢复任务与计费快照。**新 webhook/cron 不处理旧 scene；旧任务恢复也不能接管新任务。**
- 共用余额和数据库表是**基础资源共用**，不是共用旧业务 Service。积分流水记录新 generator scene + generationId，并且仅退回自身预扣；任务/结果查询按 userId + scene 隔离。
- 可以抽取完全无业务语义的公共纯函数/低层库（如文件签名、图片预处理、R2 key utils、金额舍入），但不得为了“复用”直接依赖旧 `genjutsu/*/billing.ts`、`service.ts` 或包含旧模板语义的 helper。

**独立性验收**：静态依赖检查加完整生成/失败/退款/定时补偿测试，确保新 API 和 `src/modules/generator` 不 import 旧业务 service/billing/workflow，不调用旧路由，且旧 API 契约与任务数据不变。

## 1. 仓库现状与复用边界（对照 2026-11-20 main）

- 技术栈：TanStack Start、React 19、TypeScript、Tailwind、TanStack Query；组件层应沿用现有 UI 风格和 `@/lib/api-client`。
- `src/components/landing/ModelPicker.tsx` 已有图片和视频模型列表与选型 UI，但组件内的部分展示信息是静态目录，**不等于对应模型已经真实接通后端**。需要拆分为“可用的模型注册表”和“展示内容”。
- `src/components/landing/GeneratorPanel.tsx` 已实现上传、积分预估、任务恢复与轮询；抽取稳定能力，不要把整段页面代码挪到新组件。
- `src/modules/image-to-video/*`：已有预扣、提交、状态轮询、`submission_unknown`、最终结果入 R2 和失败退款的实现，仅用于**参考设计/测试思路**，新 generator 不调用其业务 service/billing。
- `src/modules/hotel-lobby/pricing.ts`、`service.ts` 与 `src/routes/api/h3-lab/*`：仅供研究已验证的 API 参数与计费思路，新 generator 不调用其业务流程。现有 `minimax/h3/reference-to-video` 支持 1 个参考视频及 1–9 张参考图片，代码限定时长 5–15 秒，并有独立价格公式；**这不是竞品所称 All-in-One Reference 的等价证明**。通用生成页只有在模型 endpoint 核实支持对应 workflow 后才开放。
- `src/modules/genjutsu/model-config.ts`：Standard/Light 共用同一 Higgsfield provider，model id 不同；仅作模型标识设计参考。新系统有**自己的 registry 与路由**，不能读取旧产品 pin/env 作为模型选择来源。
- `src/modules/genjutsu/pricing.ts`：仅用于识别动态报价场景，新 generator 使用独立 pricing，不调用旧 Genjutsu 业务计费函数。现有 Higgsfield 正式扣费可能需要 `POST /estimate/<model>` 的实时上游报价。不能用前端静态估价覆盖这种动态价格逻辑。
- `src/lib/ai-credits.ts`：目前有成本转积分的公用逻辑（provider cost × 100 × 1.7 后向上取整）。**内部供应商成本/利润加成不应作为公开模型目录直接返回前端**；前端采用不泄露内部成本的用户积分费率表。
- `src/config/db/schema.postgres.ts` 中 `aiTask` 已包含 `mediaType/provider/model/options/status/taskId/taskInfo/taskResult/costCredits/scene/creditId`。优先复用现有表与 `credits` 模块；若开发发现现有字段、并发 CAS/索引无法表达多结果父子任务，则单独审查 migration，不在 V1 无依据扩表。
- `src/modules/genjutsu/prompt-safety.ts` 存在旧业务提示词扫描；新生成器直接接入 `src/core/content-safety/*` 的通用扫描能力或提取独立、无旧业务依赖的 wrapper，并使用 generator 侧明确的策略，不调用旧模块业务入口。

## 2. 概念与边界

| 概念 | 说明 | 示例 |
| --- | --- | --- |
| MediaType | 输出媒体 | image / video |
| Model | 用户选择的模型产品 | 内部 `modelId`（稳定 ID） |
| Provider | 实际 API 供应商 | fal / wavespeed / 以后其他 |
| ProviderModel | 对应供应商 endpoint | 具体 API model ID |
| Workflow | 输入素材与生成任务的语义 | text-to-video / first-frame / start-end / all-in-one-reference / reference-to-video |
| Capability | 工作流、字段、取值、约束 | 时长/分辨率组合、参考图最大数量 |
| Pricing | 用户积分费率及版本 | 不必与 provider 的成本结构相同 |
| Adapter | 标准任务参数到 provider request / status / result 的映射 | FalAdapter / WaveSpeedAdapter |

**重要区分**：First Frame 是首帧控制；Start & End 是首尾关键帧；All-in-One Reference 是可能混合图片/视频/音频的复杂参考任务；H3 的 Reference-to-Video 是已有参考视频 + 多图的另一种工作流。各自的素材字段与映射不能混同。

## 3. 数据契约（建议）

使用类型定义 + 显式模型配置；不要把文件 `File` 或临时 blob URL 放进服务端模型配置。

~~~typescript
type MediaType = 'image' | 'video';

type Workflow =
  | 'text-to-image'
  | 'image-to-image'
  | 'text-to-video'
  | 'first-frame'
  | 'start-end'
  | 'all-in-one-reference'
  | 'reference-to-video';

type MediaSlot =
  | 'startFrame'
  | 'endFrame'
  | 'referenceImages'
  | 'referenceVideos'
  | 'referenceAudio';

type MediaLimit = {
  min: number; // min: 0 表示可选
  max: number;
  allowedMimeTypes: string[];
  maxBytesPerFile?: number;
  minSeconds?: number;
  maxSeconds?: number;
};

type FieldSpec<T = string | number | boolean> = {
  visible: boolean;
  default: T;
  values?: readonly T[];
  min?: number;
  max?: number;
  step?: number;
};

type WorkflowSpec = {
  inputSlots: Partial<Record<MediaSlot, MediaLimit>>;
  fields: Record<string, FieldSpec>;
  // 明确的规则类型，不能传任意表达式
  constraints?: ConstraintRule[];
};

type ModelSpec = {
  id: string;
  displayName: string;
  mediaType: MediaType;
  provider: string;
  providerModelId: string; // 服务端存；不必完整暴露浏览器
  enabled: boolean;
  defaultWorkflow: Workflow;
  workflows: Partial<Record<Workflow, WorkflowSpec>>;
  pricingId: string;
  pricingVersion: string;
};
~~~

`ConstraintRule` 应是有限、可测试的判别联合，如 `allowedValuesWhen`、`maxWhen`、`combinedMediaLimit`、`requiresFieldWhen`；仅实现已接入模型实际需要的几类。若模型的条件依赖确实不能用现有规则表达，再添加**明确的服务端/共享校验函数**，不要先搭抽象解释器。未登记字段严格拒绝。

可变参数只从当前 workflow 的 `fields` 中枚举，统一转成规范参数；`providerModelId`、API key、内部供应商成本、供应商路由环境变量只在服务端可信配置出现。可给前端返回过滤后的 `PublicModelSpec`（含公开积分费率）和版本号。

### 3.1 素材槽位 / 工作流

| Workflow | 表单布局 | 输入约束 |
| --- | --- | --- |
| text-to-image | Prompt + 图片参数 | 无必填参考素材 |
| image-to-image | Prompt + 参考图网格 | 参考图上限逐模型 |
| text-to-video | Prompt + 视频参数 | 无必填参考素材 |
| first-frame | **1 个** Start Frame 槽 | 最多 1 张图片；是否必填由模型定 |
| start-end | Start / End 两个有明确语义的槽 | 每个最多 1 张；是否都必填由模型定 |
| all-in-one-reference | 多素材网格及可选音视频输入 | 各类型 min/max、组合总量、时长均逐模型 |
| reference-to-video | 参考视频 + 多图等独立槽位 | 按真实 endpoint 的类型和数量约束 |

**不在 registry 里列出的 workflow = 彻底不支持**，UI 隐藏，API 必须拒绝；仅靠客户端隐藏不能作为鉴权/校验。

### 3.2 典型字段

- 公共：`prompt`、`modelId`、`workflow`、`aspectRatio`、`resolution`。
- 视频：`duration`、`generateAudio`、`videoQuality`、`outputCount`、模型特定 `fastMode` / `promptExpansionMode`。
- 图片：`outputCount`、`quality`、`style`、`outputFormat`、`referenceImages`、模型特定 `fastMode` / `webSearch`。
- 字段显示不代表每个模型都支持：合法值与默认值严格按 `ModelSpec + WorkflowSpec`；例如某个分辨率没有音频能力、某个时长在高清下不合法，须建立组合约束。
- `outputCount` 大于 1 只能为后端已验证支持的模型开启；浏览器不能虚构模型 API 原生批量能力。部分模型输出格式需要后处理时，应分别说明原生参数和交付格式，并计入成本。

### 3.3 示例配置（**示意，非真实 API 能力或真实售价**）

~~~typescript
const DEMO_MODEL: ModelSpec = {
  id: 'demo-video-model',
  displayName: 'Demo Video Model',
  mediaType: 'video',
  provider: 'fal',
  providerModelId: 'demo/provider/endpoint',
  enabled: false, // 核实/测试前不开放
  defaultWorkflow: 'first-frame',
  pricingId: 'demo-video-pricing',
  pricingVersion: 'v1',
  workflows: {
    'first-frame': {
      inputSlots: {
        startFrame: {
          min: 1, max: 1,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        }
      },
      fields: {
        duration: { visible: true, default: 5, values: [5, 10] },
        resolution: { visible: true, default: '720p', values: ['480p', '720p'] },
        aspectRatio: { visible: true, default: '16:9', values: ['16:9', '9:16'] },
        generateAudio: { visible: false, default: false },
        outputCount: { visible: true, default: 1, values: [1] }
      }
    }
  }
};
~~~

首批真正支持的模型、mode、费率须以供应商当前 endpoint 文档和本项目实测为准；不得把竞品截图、`ModelPicker.tsx` 的占位宣传文案当成真实能力清单。

## 4. 切换联动：单一 normalize 函数

核心：**保留合法、重置非法、截断多余；没有影子缓存**。修改 workflow、model 或任意影响其他字段合法范围的参数时，立即归一化一次。

~~~typescript
type GeneratorState = {
  mediaType: MediaType;
  modelId: string;
  workflow: Workflow;
  prompt: string;
  inputs: {
    startFrame?: MediaItem;
    endFrame?: MediaItem;
    referenceImages: MediaItem[];
    referenceVideos: MediaItem[];
    referenceAudio: MediaItem[];
  };
  params: Record<string, unknown>;
};

function applyGeneratorChange(
  current: GeneratorState,
  patch: Partial<GeneratorState>,
  nextModel: ModelSpec
): GeneratorState {
  return normalizeGeneratorState({ ...current, ...patch }, nextModel);
}
~~~

规范化顺序（必须固定、易测）：

1. 将新模型与媒体类型固定为可信 registry 中的合法目标。
2. 不支持当前 workflow → 切到该模型的 `defaultWorkflow`。
3. 对素材槽做**有语义**的转换（见下）；不支持的槽位清空，超过最大数量截取前 N 个，缺少必填素材由提交校验提示，不要自动补造。
4. 根据当前 workflow 字段列表，移除不存在的参数；保留合法值；非法值改用默认值；有依赖的字段重复规范化到稳定合法组合（规定确定的优先级，不能死循环）。
5. 清理无效价格状态，浏览器同步重新计算预估积分。

| 从 → 到 | 规则 |
| --- | --- |
| Start & End → First Frame | 保留 Start；End 立即移除 |
| First Frame → Start & End | 保留 Start；End 留空 |
| All-in-One（只有图片）→ First Frame | 第一张图作为 Start，丢弃其余 |
| First Frame → All-in-One（允许图片） | Start 成为第一张 reference image |
| 5 张参考图 → 上限 3 张 | 保留前 3 张，其余从表单移除 |
| 其他模式 → H3 Reference-to-Video | 不把无关首尾帧误当参考视频；不同语义输入清空 |
| 模型切换后时长/分辨率不支持 | 改为新模型合法默认值 |
| 模型不支持 Sound / Fast | 删除或置 false；不能继续发送 |
| 图片 ↔ 视频切换 | 保留 Prompt（可行时），重置不兼容的媒体槽和参数 |

只在语义清楚且目标模型接受该类型时转换图片；多模态素材不做隐式重排。一次切换只有一次归一化与一次最终报价刷新。已上传的 R2 staging 文件仅移除表单引用，按 TTL 清理；本地 `URL.createObjectURL` 应在素材移除时及时 revoke，避免内存泄漏。已有任务的 sealed input 不因用户切换草稿而被改写。

## 5. 前端 UI / 响应式

### Desktop

沿用现有站点紧凑 Composer 的视觉语言：Prompt、素材、ModelPicker、参数按钮/Popover、Generate + credits；右侧/下方可放生成状态与结果。不要无关地重做已有模板页。

### Mobile（按用户提供参考图，**纵向平铺**）

顺序固定：

1. Image / Video 切换；
2. 当前 Workflow 的上传区域（首帧 1 槽、首尾帧 2 槽、All-in-One 参考网格）；
3. Prompt（字数统计）；
4. Model 全宽选择；
5. Aspect Ratio、Duration、Resolution、Quality / Style / Format / Count 等逐项平铺；有能力才显示 Fast / Sound / Web Search；
6. Generate 全宽按钮，直接显示当前积分。

比例/分辨率选项允许自动换行；模型选择器可用移动端 Drawer 搜索/分组；复杂素材模式展示可逐个删除的缩略图，不展开大段文案；禁用状态明确解释原因。

共享 `useGeneratorForm` / 状态机、字段组件、上传处理和计算器；布局使用 CSS 响应式优先，避免同时挂载两套昂贵上传组件或出现两个不同表单实例。

建议的组件：

~~~text
src/components/generator/
  GeneratorForm.tsx
  GeneratorModelPicker.tsx
  GeneratorWorkflowTabs.tsx
  PromptEditor.tsx
  GeneratorSettings.tsx
  GenerateButton.tsx
  MediaUploader.tsx
  FirstFrameInput.tsx
  StartEndInput.tsx
  MultiReferenceInput.tsx
  fields/{Duration,Resolution,AspectRatio,Quality,OutputCount,...}.tsx
src/hooks/use-generator-form.ts
~~~

## 6. 实时积分：由表单组合决定，无常规报价网络请求

### 6.1 原则

- `calculateCredits(normalizedState, publicModelPricing)` 为同步、纯函数，前端在内存中计算；用户切换模型/模式/分辨率/时长/张数/音频等无需调 quote API。
- 表单只展示最终**用户积分**，不返回供应商进价、API key 或内部利润率。
- 价格按模型 + workflow + 实际影响计费的字段组合计算；不影响报价的字段不应被任意加入价格公式。
- 价格配置应有版本（`pricingVersion`），发布时前后端一致。浏览器旧版本遇服务端不一致 → 刷新公开目录或进入价格确认路径。
- 计算失败或配置缺失时不展示凭空的 `0 credits`，而是明确「价格暂不可用」并阻止未经确认的付费提交。

### 6.2 计费策略

有限的策略类型即可：

| 类型 | 用途 | 示例公式（演示，不是实际费率） |
| --- | --- | --- |
| fixed | 固定费用 | fixedCredits × count |
| per-second | 时长 × 档位 | rate[resolution] × duration × count |
| per-image | 每张图 × 质量/分辨率 | rate[quality][resolution] × count |
| tiered | 分段/阈值 | 前 5 张包含，超过部分加价 |
| matrix | 特定组合 | rate[workflow][duration][resolution] |
| custom | 少量不可归入以上的模型 | 具名、纯函数、独立测试 |

可以**参考**已有 `estimateImageToVideoCredits`、`estimateH3LabCredits` 的测试样例与价格边界，但新通用生成器实现自己的公开费率投影和共享纯函数计算；不要 import 旧业务 calculator，更不能改动旧产品扣费结果。

~~~typescript
type CreditContext = {
  modelId: string;
  workflow: Workflow;
  params: Record<string, unknown>;
  referenceImageCount: number;
  referenceVideoCount: number;
  referenceAudioCount: number;
};

type CreditEstimate = {
  credits: number;
  pricingVersion: string;
  precision: 'exact' | 'estimate';
};

function calculateCredits(
  context: CreditContext,
  publicPricing: PublicPricing
): CreditEstimate;
~~~

应先组合费用，再按已约定的粒度舍入；不得在单项、单张、总额之间随意变换取整顺序。模型价格规则必须定义对应边界测试（例如档位切换、额外素材收费起点、数量倍增、上限）。

### 6.3 不能忽略的动态供应商报价例外

现有 Higgsfield `/estimate/<model>` 的真实报价可能不同于浏览器公开表。不可假称静态本地价对所有模型都是「精确最终价」。

- 可稳定静态计价的模型：公开 customer-credit tariff 与服务端同版本计算，按钮展示 `N Credits`。
- 动态成本模型：前端显示 `Estimated N Credits`（标识估价），服务端在提交前询价；**不得在用户未确认涨价时直接多扣**。
- 推荐不增加常规 `/quote`：`POST /api/generator/generate` 在检测实际所需积分超过请求里 `maxAcceptedCredits` 时，返回 `409 PRICE_CHANGED`（含新的用户积分数和有效期很短的确认标识），**不扣费、不提交供应商**；用户确认后用同一 `generationId` / 已绑定输入重试，并匹配短期确认上下文。低于同意上限的按实际较低价格扣。若询价失败/不可确定，遵守该 Provider 的既有安全 fallback，不能静默超额扣费。
- `maxAcceptedCredits` 仅是用户愿意支付的上限，**不是可用于计费的客户端价格**。服务端总是自己重新计费。
- 避免前端显示不可靠估价就提前硬拦截余额不足；最终不足以服务端校验为准，复用余额不足购买弹窗。

### 6.4 公开模型数据

初次访问或明确切换产品类型时获取 `GET /api/generator/models?mediaType=video` 返回模型能力及用户积分费率（可按 `ETag`/版本缓存），不随每次参数变更请求。需要服务端动态关闭模型、更新价格或设置 Feature Flag 时通过版本失效，提交始终以服务器最新能力为准。

公开售价表不得泄露 token、动态上游凭据、成本、私有 provider 配置；不能由前端传任意 providerModelId 触发后台 API。

## 7. 后端 API 及数据流

### API（V1）

| Method | Path | 职责 |
| --- | --- | --- |
| GET | `/api/generator/models?mediaType=image|video` | 公开可用模型、能力与费率版本 |
| POST | `/api/generator/upload-url` | 为当前 user + generationId + slot + 文件 metadata 下发限权预签名上传 |
| POST | `/api/generator/generate` | 服务端校验、seal、最终计费、幂等预扣与 Provider 提交 |
| GET | `/api/generator/status/:generationId` | 获取当前任务归一化状态 |
| GET | `/api/generator/result/:generationId` | 鉴权获取已保存的输出 |
 
**不提供常规 quote API**。独立查询价格确有需求时另行评审，不得作为表单联动的默认步骤。

### 统一提交请求（示例）

~~~json
{
  "generationId": "uuid-v4",
  "modelId": "internal-model-id",
  "workflow": "start-end",
  "prompt": "A cinematic transformation...",
  "inputs": {
    "startFrameKey": "logical-staging-key-1",
    "endFrameKey": "logical-staging-key-2"
  },
  "params": {
    "duration": 5,
    "resolution": "720p",
    "aspectRatio": "16:9",
    "outputCount": 1,
    "generateAudio": false
  },
  "pricingVersion": "v1",
  "maxAcceptedCredits": 120
}
~~~

本示例的请求参数不是任何实际 API 的原生字段；Uploader 先签发 staging key，服务端校验资源属主、槽位、数量、MIME、字节数（需要时核查实际元数据/视频时长），seal 后由 Adapter 获取短期只读 URL。**DB/API 使用 logical R2 key，物理前缀仅在 R2 边界解析一次**，遵守已有 R2 规范，不在 Adapter 里拼接物理前缀。

### 服务端执行顺序

1. 登录/频控/模型 allowlist/feature flag；校验 `modelId`、`workflow`、参数与跨字段约束；非法字段和伪造模型请求拒绝。
2. 确定输入身份与 fingerprint（用户 + model + workflow + Prompt + 规范参数 + sealed input key + pricing version）；安全校验 Prompt，验证上传文件归属与元数据；防 URL 任意访问 / SSRF / 越权读取。
3. 创建或复用 `generationId` 任务，原子绑定输入；同一 ID / 不同输入返回 `GENERATION_CONFLICT`。
4. 从服务端配置计算最终价格；动态报价超过 `maxAcceptedCredits` 则返回 `PRICE_CHANGED`，不预扣。
5. 原子预扣积分、声明提交所有权（CAS/lease），调用 Provider Adapter。无效参数不能预扣。
6. 成功提交写 provider taskId + 原始模型/价格版本快照；失败区分可确定与不确定的提交结果。
7. Webhook / status poll / cron reconcile 共同处理；完成后输出存 R2、入 `My Creations`，已完成任务只返回持久化结果链接。
8. 明确永久失败走幂等退款；`submission_unknown` 不自动重新提交或轻率退款，优先通过 provider task ID 恢复并留审计线索。

### Adapter

~~~typescript
interface GeneratorAdapter {
  submit(input: NormalizedGenerationInput): Promise<{
    requestId?: string;
    status: string;
  }>;
  getStatus(requestId: string): Promise<NormalizedProviderStatus>;
  parseResult(result: unknown): Promise<NormalizedMediaOutput[]>;
}
~~~

每个 Adapter 负责 provider 字段映射、错误/状态归一化、真实 endpoint 能力约束适配；不要把 Fal、WaveSpeed 参数名写回通用 UI。若需要模型特定 webhook / result shape，可在 adapter 内提供受控扩展点。

### 状态 / 数据库存储

建议复用 `aiTask`，`scene = 'generic-generator'`；`options` 保存输入快照、workflow、价格版本、用户同意的上限及任务 fingerprint（剔除凭据）；`taskInfo` 保存 provider requestId、提交租约与结算元数据；`taskResult` 保存 R2 logical keys、输出类型、最终状态与安全错误摘要。确保查询按 `userId + scene + generationId` 权限过滤。

V1 仅开放 `outputCount = 1` 的真实可用模型后端；即使 UI 组件支持数量选择，也不能宣传未实现批量。V2 才引入父子任务（按每个 output 的实际状态/成本/退款），并在迁移评审后决定是否增表，不要把多个独立请求假装成单个原子成功。

## 8. 建议模块结构

~~~text
src/
  modules/generator/
    types.ts
    registry.ts
    capabilities.ts
    normalize.ts           # 可浏览器运行的纯函数
    validation.ts          # 共用参数/组合校验；服务端额外验证身份/资源
    pricing.ts             # 可浏览器运行的用户积分纯函数
    billing.ts             # 服务端预扣/失败退款/幂等
    storage.ts             # staging/seal/R2 result
    service.ts             # 任务编排/恢复
    adapters/
      fal.ts
      wavespeed.ts
  components/generator/
    GeneratorForm.tsx
    GeneratorModelPicker.tsx
    GeneratorWorkflowTabs.tsx
    PromptEditor.tsx
    MediaUploader.tsx
    FirstFrameInput.tsx
    StartEndInput.tsx
    MultiReferenceInput.tsx
    GeneratorSettings.tsx
    GenerateButton.tsx
    fields/
  hooks/use-generator-form.ts
  routes/
    ai-video-generator.tsx
    ai-image-generator.tsx
    api/generator/{models,upload-url,generate,status,result}...
~~~

实际路由文件名按 TanStack Start file routing 约定实现，不直接照搬任意框架中的 `:id` 路径写法。现有 `ModelPicker.tsx` 不必一次性替换，给新生成器单独提取可复用 UI 与 registry 即可。

## 9. 分期实施（每期独立可测试、可回滚）

### Phase A：能力 + 核心视频生成链路

- 完成 `ModelSpec` / public projection / `normalizeGeneratorState` / `calculateCredits` / tests。
- 建一个 `/ai-video-generator` 内页；接入 **1 个经实测且支持该 workflow 的真实视频模型**，包括上传、生成、积分、状态、结果 R2 与 My Creations。
- 模型选项中只展示真实已连通能力；未测试的 All-in-One / Start-End/H3 等保留配置结构，不对用户开启。
- Mobile 平铺；Desktop 紧凑；无 quote 网络调用；旧页面不变。
- 使用 feature flag / allowlist 灰度上线，失败或成本不对可立即下线新入口。

### Phase B：复用表单实现生图

- `/ai-image-generator` 直接复用表单内核与 API，新增至少一个可用生图模型 Adapter；实现图片参考、比例、分辨率、质量、格式与基本结果展示。
- 逐字段验证模型实际支持；保留上传安全与失败退费、生成记录；重用 Phase A 的规范化与积分规则。

### Phase C：扩展模型及复杂模式

- 经供应商 endpoint 确认后逐个接入 First Frame、Start & End、All-in-One、Reference-to-Video。
- 拓展多图片/视频/音频组合约束、输出数大于 1 的父子任务、模型特有额外收费、复杂产物交付。
- 有稳定使用量后再评估把历史 `GeneratorPanel` 或部分固定模板迁移到通用表单。不可无覆盖地统一历史账单行为。

## 10. 测试矩阵（发布门槛）

### 纯函数 / UI

- [ ] 所有模型配置满足 schema；`defaultWorkflow` 存在并启用；每个字段默认值合法。
- [ ] 禁止 H3 假冒 All-in-One；前端隐藏 + 服务端伪造请求拒绝。
- [ ] Start & End → First Frame 丢尾帧；逆向保留首帧、尾帧为空。
- [ ] All-in-One → First Frame 按规则只保留首张兼容图；超量图片截断。
- [ ] 切到新模型时：合法值保留，不合法时长/分辨率回默认，移除 Sound/Fast 非法值，无残留提交参数。
- [ ] 组合约束变更（分辨率影响时长/音频）立即规范化，不循环、不出现无效状态。
- [ ] 免费/付费参考图片阈值、时长档位、数量倍率、舍入边界、outputCount 校验。
- [ ] 每次表单变更同步显示用户积分，Network 不出现 quote 请求；无法计算时不显示 0。
- [ ] 桌面与移动端共享同一表单状态，视觉布局不同，触控目标与换行有效；切换时不丢 Prompt。
- [ ] 上传超限文件（MIME、大小、时长）前后端都明确拒绝，移除后释放 object URL。

### API / 安全 / 账务

- [ ] 任意 `providerModelId`、未知字段、越权 R2 key、别人 generationId、非法 workflow、组合参数均拒绝。
- [ ] 价格版本失配、动态实际高价 -> 409，不扣积分/不提交。
- [ ] 重复点击/重试/响应丢失仅一笔预扣及一份 provider 提交；相同 ID 换输入 -> conflict。
- [ ] 供应商超时未知结果不能盲目重试；结果恢复与失败退款均幂等。
- [ ] 任务成功后持久化 R2，My Creations 可查询；无权限用户不能读结果。
- [ ] Prompt 扫描沿用现有服务端策略；相关异常不泄露用户上传素材/敏感凭据。
- [ ] R2 logical key 不叠前缀；存储失败可恢复；旧任务和当前模板生产链路回归通过。
- [ ] 新 generator 服务/接口没有任何旧业务生成 route、billing、service、workflow、provider-binding 的依赖；新 webhook 和 cron 只处理 `scene = 'generic-generator'`。
- [ ] `pnpm test`、`pnpm build`、可用的 typecheck 与格式检查通过；真实供应商沙盒/小额测试验证成本与记录。

## 11. 上线与回滚

- 新接口、业务 Service、状态机、Adapter、Webhook/cron/reconcile 全部独立实现；不调用或修改旧 `/api/genjutsu/*`、`/api/image-to-video/*`、`/api/h3-lab/*`、`/api/hotel-lobby/*` 的生成流程。
- 公开模型默认少量、逐个 allowlist，未验证 endpoint 不展示、不路由；缺 API key 不启用。
- 监控 task：提交成功率、`submission_unknown` 时长、退款重复/漏退、前后端定价不一致、上传失败、实际 provider 成本偏差。
- 回滚先关闭新页入口与对应模型 feature flag，**不能停止已提交任务的 webhook/cron/reconcile/退款**。
- 本文提交不包含生产代码变更；开发阶段若需要 DB 迁移/支付变更另开变更与风险审查。

## 12. 实施交付清单

1. 公共模型 registry、能力/校验/纯函数定价、单元测试；
2. 桌面 Composer / 移动平铺表单与素材模式组件；
3. models/upload-url/generate/status/result API、Adapter、任务恢复与 R2；
4. 用户积分账务与实时展示、余额不足处理、失败退款；
5. 新视频页 + 新生图页、SEO 元数据、My Creations 入口；
6. 实际模型 endpoint 和费率核验表、回归报告、开关上线/回滚文档。

**最终验收准则**：新模型接入主要编辑模型能力配置与 Provider Adapter；不改通用表单主体；用户调整表单参数即时看到对应积分；服务端绝不信任客户端积分；旧 Genjutsu 产品页与既有任务不发生回归。
