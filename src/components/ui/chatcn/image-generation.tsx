import * as React from "react"
import { Button, buttonVariants } from "@/components/ui/chatcn/button"
import { CopyButton } from "@/components/ui/chatcn/copy-button"
import { ImageLightbox, type ImageSource } from "@/components/ui/chatcn/image"
import { ShimmerText } from "@/components/ui/chatcn/shimmer-text"
import { Spinner } from "@/components/ui/chatcn/spinner"
import { Tooltip } from "@/components/ui/chatcn/tooltip"
import { formatChatcnDuration } from "@/hooks/use-chatcn-elapsed"
import { useChatcnMediaEta } from "@/hooks/use-chatcn-media-eta"
import {
  CircleXIcon,
  ClockIcon,
  DownloadIcon,
  ImageOffIcon,
  ImagePlusIcon,
  Maximize2Icon,
  MaximizeIcon,
  RotateCcwIcon,
  ShieldIcon,
  ShuffleIcon,
} from "@/lib/chatcn-icons"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

/** Where a generation job is. `blocked` means the provider declined the prompt. */
type GenerationStatus = "queued" | "generating" | "done" | "failed" | "blocked"

/** `"3:2"`, `"9:16"`, or a number (width over height). */
type AspectRatio = `${number}:${number}` | number

interface GeneratedImage {
  /** Stable id. Falls back to `src`. */
  id?: string
  /**
   * The image. While generating, pass the latest partial image here: it is revealed from the top
   * as `progress` grows. Leave it out when the provider sends nothing until the end.
   */
  src?: string
  /** A tiny low-resolution version shown blurred behind the reveal. Defaults to `src`. */
  previewSrc?: string
  /** Describe what the image shows. Defaults to the prompt. */
  alt?: string
  width?: number
  height?: number
  /** File name for downloads. Derived from the prompt when omitted. */
  filename?: string
  /** Per-image progress, 0 to 100, when variations finish at different speeds. */
  progress?: number
}

type ImageGenerationAction = "upscale" | "vary" | "reference"

interface ImageGenerationProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  prompt: string
  status: GenerationStatus
  images?: GeneratedImage[]
  /** Number of variations, 1 to 4. Defaults to the number of images. */
  count?: number
  /** Default `"1:1"`. Sets every frame's shape from the first paint, so nothing shifts. */
  aspectRatio?: AspectRatio
  /** 0 to 100 while generating. Leave it out when the provider reports no progress. */
  progress?: number
  /**
   * Time left in ms, from the provider. When it is left out and `progress` moves, the time left is
   * measured from the progress rate, and only shown once there is enough to go on.
   */
  etaMs?: number
  /** Place in line while queued. 1 means next. */
  queuePosition?: number
  /** Override the status label. Defaults to "Creating image", then "Adding details". */
  statusText?: string
  /** Short facts after the aspect ratio in the summary line: a model, a style, a seed. */
  settings?: React.ReactNode[]
  /** Show the prompt and settings above the images. Turn off inside a tool call. */
  showPrompt?: boolean
  errorText?: React.ReactNode
  /** Why the provider declined. Keep it calm and say what to change. */
  blockedText?: React.ReactNode
  onRetry?: () => void
  onCancel?: () => void
  /** Shown on a blocked prompt so the user can rephrase it. */
  onEditPrompt?: () => void
  onUpscale?: (image: GeneratedImage, index: number) => void
  onVary?: (image: GeneratedImage, index: number) => void
  onUseAsReference?: (image: GeneratedImage, index: number) => void
  /** Replace the built-in download link, for example for cross-origin files. */
  onDownload?: (image: GeneratedImage, index: number) => void
  /** An action in flight. Its button shows a spinner and the others wait. */
  busyAction?: ImageGenerationAction
  /** The variation the actions apply to. */
  selectedIndex?: number
  defaultSelectedIndex?: number
  onSelectedIndexChange?: (index: number) => void
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

/** `"3:2"` to 1.5. Falls back to 1 for anything it cannot read. */
function parseAspectRatio(ratio: AspectRatio | undefined): number {
  if (typeof ratio === "number") return ratio > 0 ? ratio : 1
  if (!ratio) return 1
  const [w, h] = ratio.split(":").map(Number)
  return w && h && w > 0 && h > 0 ? w / h : 1
}

const clampCount = (n: number) => Math.min(4, Math.max(1, Math.round(n)))

/**
 * The time left, said the way a person would: rounded up to 5 s under a minute and 10 s above,
 * so it counts down in calm steps instead of ticking every second.
 */
function generationEtaLabel(ms: number | undefined, progress: number | undefined) {
  if (ms === undefined) return null
  if (ms < 5000) return (progress ?? 0) >= 90 ? "Almost done" : "A few seconds left"
  const step = ms < 60_000 ? 5000 : 10_000
  return `About ${formatChatcnDuration(Math.ceil(ms / step) * step, { precise: false })} left`
}

/** Status label from progress. Specific words beat a bare percentage. */
function generationStage(progress: number | undefined, plural: boolean) {
  if (progress === undefined || progress < 30) return plural ? "Creating images" : "Creating image"
  if (progress < 80) return "Adding details"
  return "Finishing"
}

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 5)
      .join("-") || "image"
  )
}

function extensionOf(src: string) {
  const data = /^data:image\/([a-z]+)/i.exec(src)
  if (data?.[1]) return data[1] === "jpeg" ? "jpg" : data[1]
  const path = /\.([a-z0-9]{2,4})(?:[?#]|$)/i.exec(src)
  return path?.[1] ?? "png"
}

function downloadName(image: GeneratedImage, prompt: string, index: number, total: number) {
  if (image.filename) return image.filename
  const suffix = total > 1 ? `-${index + 1}` : ""
  return `${slugify(prompt)}${suffix}.${extensionOf(image.src ?? "")}`
}

/** Columns by count. Four portrait frames sit in one row; four others make a square. */
function columnsFor(total: number, ratio: number) {
  if (total === 4) return ratio < 1 ? 4 : 2
  return total
}

/** A hairline drawn inside the frame so light images never bleed into the canvas. */
const HAIRLINE =
  "pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--chatcn-alpha-400)] forced-colors:outline-solid forced-colors:outline-1"

/* -------------------------------------------------------------------------------------------------
 * Grain: the placeholder texture. Static monochrome noise, never a sweep.
 * -----------------------------------------------------------------------------------------------*/

function GenerationGrain({ className }: { className?: string }) {
  const id = `chatcn-grain-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  return (
    <svg
      aria-hidden="true"
      data-slot="generation-grain"
      className={cn(
        "pointer-events-none absolute inset-0 size-full opacity-[0.14] dark:invert",
        className,
      )}
    >
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
        {/* Black specks whose alpha follows the noise. Inverted to light specks in dark mode. */}
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.5" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Frame: one image slot with the progressive reveal
 * -----------------------------------------------------------------------------------------------*/

type FramePhase = GenerationStatus

interface GenerationFrameProps {
  image?: GeneratedImage
  phase: FramePhase
  /** 0 to 100, or undefined when unknown. */
  progress?: number
  ratio: number
  /** First rendered as done (restored from history): fade in, no reveal. */
  instant?: boolean
  alt: string
  className?: string
  children?: React.ReactNode
}

/**
 * The reveal, from back to front: a grain placeholder, the image blurred (sharpening as progress
 * grows), then the sharp image clipped from the top with `clip-path` down to the progress line,
 * which a 1 px scan line marks. On completion the clip opens fully, the blur fades out and the
 * image settles from 1.02 to 1. Only transform, opacity, filter and clip-path animate.
 */
function GenerationFrame({
  image,
  phase,
  progress,
  ratio,
  instant,
  alt,
  className,
  children,
}: GenerationFrameProps) {
  const src = image?.src
  const [loaded, setLoaded] = React.useState<{ src?: string; ok: boolean | null }>({
    src,
    ok: null,
  })
  if (loaded.src !== src) setLoaded({ src, ok: null })
  const ok = loaded.ok
  const ref = React.useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) {
        setLoaded((s) => (s.src === src && s.ok !== true ? { src, ok: true } : s))
      }
    },
    [src],
  )

  const done = phase === "done"
  const showImage = Boolean(src) && ok !== false && (phase === "generating" || done)
  const known = progress !== undefined
  // Reveal fraction: what share of the frame, from the top, shows the sharp image.
  const p = done ? (ok ? 1 : 0) : phase === "generating" && known ? progress / 100 : 0
  const revealed = done && ok === true
  const scanning = phase === "generating" && known && p > 0 && p < 1
  const blurSrc = image?.previewSrc ?? src

  return (
    <div
      data-slot="generation-frame"
      data-frame-phase={phase}
      data-instant={instant ? "" : undefined}
      className={cn("bg-chatcn-fill group/frame relative isolate overflow-hidden", className)}
      style={{ aspectRatio: ratio }}
    >
      <GenerationGrain
        className={cn(
          "ease-chatcn-out-soft transition-opacity duration-200",
          revealed && "opacity-0 dark:opacity-0",
          (phase === "failed" || phase === "blocked") && "opacity-[0.12] dark:opacity-[0.1]",
        )}
      />

      {/* Progress tone for providers that send no partial image: the part above the line lifts. */}
      {phase === "generating" && known && !src ? (
        <span
          aria-hidden="true"
          className="bg-chatcn-alpha-300 absolute inset-0 transition-[clip-path] duration-300 ease-linear motion-reduce:transition-none"
          style={{ clipPath: `inset(0 0 ${(1 - p) * 100}% 0)` }}
        />
      ) : null}

      {showImage && blurSrc && !instant ? (
        <img
          src={blurSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={cn(
            "absolute inset-0 size-full scale-110 object-cover",
            "ease-chatcn-out transition-[opacity,filter] duration-300 motion-reduce:transition-opacity motion-reduce:duration-150",
            revealed ? "opacity-0" : "opacity-100",
          )}
          style={{ filter: `blur(${Math.round(4 + (1 - p) * 20)}px) grayscale(0.2)` }}
        />
      ) : null}

      {showImage ? (
        <img
          ref={ref}
          src={src}
          alt={done ? alt : ""}
          aria-hidden={done ? undefined : true}
          width={image?.width}
          height={image?.height}
          draggable={false}
          decoding="async"
          onLoad={() => setLoaded((s) => (s.ok === true ? s : { src, ok: true }))}
          onError={() => setLoaded({ src, ok: false })}
          className={cn(
            "absolute inset-0 size-full object-cover select-none",
            instant
              ? cn(
                  "ease-chatcn-out-soft transition-opacity duration-200",
                  ok ? "opacity-100" : "opacity-0",
                )
              : cn(
                  "ease-chatcn-out transition-[clip-path,scale] duration-300",
                  "motion-reduce:transition-none",
                  revealed ? "scale-100" : "scale-[1.02] motion-reduce:scale-100",
                ),
          )}
          style={instant ? undefined : { clipPath: `inset(0 0 ${(1 - p) * 100}% 0)` }}
        />
      ) : null}

      {/* Scan line: the reveal edge. It sits on imagery, so it is a fixed light line with a dark
          hairline under it instead of a theme color. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 transition-[transform,opacity] duration-300 ease-linear",
          "motion-reduce:transition-opacity motion-reduce:duration-150",
          scanning ? "opacity-100" : "opacity-0",
        )}
        style={{ transform: `translateY(${p * 100}%)` }}
      >
        <span className="absolute inset-x-0 -top-px h-px bg-[white] opacity-70 shadow-[0_1px_0_var(--chatcn-alpha-500)]" />
      </span>

      {done && ok === false ? (
        <span className="text-chatcn-fg-subtle absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
          <ImageOffIcon aria-hidden="true" className="size-5" />
          <span className="chatcn-text-12">Image unavailable</span>
        </span>
      ) : null}

      {children}
      <span aria-hidden="true" className={HAIRLINE} />
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Notice: failed and blocked, centered over the frames so the layout keeps its size
 * -----------------------------------------------------------------------------------------------*/

function GenerationNotice({
  icon,
  title,
  children,
  actions,
  tone = "neutral",
}: {
  icon: React.ReactNode
  title: React.ReactNode
  children?: React.ReactNode
  actions?: React.ReactNode
  tone?: "neutral" | "error"
}) {
  return (
    <div
      data-slot="generation-notice"
      className="chatcn-scroll absolute inset-0 z-[1] grid place-items-center overflow-auto p-5 text-center"
    >
      <div className="flex max-w-80 flex-col items-center gap-1.5">
        <span
          aria-hidden="true"
          className={cn(
            "mb-1 [&_svg]:size-5",
            tone === "error" ? "text-chatcn-red" : "text-chatcn-fg-muted",
          )}
        >
          {icon}
        </span>
        <p className="chatcn-text-14 text-chatcn-fg font-medium text-balance">{title}</p>
        {children ? (
          <p className="chatcn-text-13 text-chatcn-fg-muted text-pretty">{children}</p>
        ) : null}
        {actions ? <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * ImageGeneration
 * -----------------------------------------------------------------------------------------------*/

function ActionButton({
  icon,
  busy,
  disabled,
  onClick,
  children,
}: {
  icon: React.ReactNode
  busy?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      size="sm"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy || undefined}
      className="pointer-coarse:h-11"
    >
      <span className="grid size-3.5 place-items-center">
        <span
          key={busy ? "busy" : "idle"}
          className="grid place-items-center motion-safe:animate-[chatcn-swap_150ms_var(--chatcn-ease-out)]"
        >
          {busy ? <Spinner /> : icon}
        </span>
      </span>
      {children}
    </Button>
  )
}

function announcement(status: GenerationStatus, total: number, queuePosition?: number) {
  switch (status) {
    case "queued":
      return queuePosition ? `Queued, position ${queuePosition}` : "Queued"
    case "generating":
      return total > 1 ? "Creating images" : "Creating image"
    case "done":
      return total > 1 ? `${total} images ready` : "Image ready"
    case "failed":
      return "Image generation failed"
    case "blocked":
      return "The image was not created"
  }
}

/**
 * A generated image in a conversation: the prompt and settings, one to four variations at their
 * final aspect ratio from the first paint, a progressive reveal while the model works, and actions
 * for the chosen variation once it is done.
 */
function ImageGeneration({
  prompt,
  status,
  images = [],
  count,
  aspectRatio = "1:1",
  progress,
  etaMs,
  queuePosition,
  statusText,
  settings,
  showPrompt = true,
  errorText,
  blockedText,
  onRetry,
  onCancel,
  onEditPrompt,
  onUpscale,
  onVary,
  onUseAsReference,
  onDownload,
  busyAction,
  selectedIndex: selectedProp,
  defaultSelectedIndex = 0,
  onSelectedIndexChange,
  className,
  ...props
}: ImageGenerationProps) {
  const total = clampCount(count ?? Math.max(images.length, 1))
  const ratio = parseAspectRatio(aspectRatio)
  const cols = columnsFor(total, ratio)
  const done = status === "done"

  // Restored from history: the first render is already done, so frames fade in without a reveal.
  const [instant] = React.useState(() => status === "done")

  const [selectedState, setSelectedState] = React.useState(defaultSelectedIndex)
  const selected = Math.min(selectedProp ?? selectedState, total - 1)
  const select = (index: number) => {
    if (selectedProp === undefined) setSelectedState(index)
    onSelectedIndexChange?.(index)
  }

  const [lightbox, setLightbox] = React.useState(false)
  const slots = Array.from({ length: total }, (_, i) => images[i])
  const ready = slots.flatMap((image, i) => (image?.src ? [{ image, i }] : []))
  const lightboxImages: ImageSource[] = ready.map(({ image, i }) => ({
    src: image.src as string,
    alt: image.alt ?? prompt,
    width: image.width,
    height: image.height,
    caption: prompt,
    filename: downloadName(image, prompt, i, total),
  }))
  const lightboxIndex = Math.max(
    0,
    ready.findIndex(({ i }) => i === selected),
  )
  const openLightbox = (index: number) => {
    if (!slots[index]?.src) return
    select(index)
    setLightbox(true)
  }

  const current = slots[selected]
  const tileRefs = React.useRef<Array<HTMLElement | null>>([])
  const selectable = done && total > 1

  const onGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selectable) return
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
    const step: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowDown: cols,
      ArrowUp: -cols,
    }
    let next: number | undefined
    if (event.key in step) next = (selected + (step[event.key] ?? 0) + total) % total
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = total - 1
    else if (event.key === "Enter") {
      event.preventDefault()
      openLightbox(selected)
      return
    }
    if (next === undefined) return
    event.preventDefault()
    select(next)
    tileRefs.current[next]?.focus()
  }

  const percent = progress === undefined ? undefined : Math.round(Math.min(100, progress))
  const label = statusText ?? generationStage(progress, total > 1)
  const eta = useChatcnMediaEta(progress, { active: status === "generating", etaMs })
  const etaText = generationEtaLabel(eta, progress)
  const settled = status === "failed" || status === "blocked"
  const single = total === 1

  return (
    <div
      data-slot="image-generation"
      data-generation-state={status}
      aria-busy={status === "queued" || status === "generating" || undefined}
      className={cn("chatcn-text-14 text-chatcn-fg flex w-full min-w-0 flex-col gap-3", className)}
      {...props}
    >
      {showPrompt ? (
        <div data-slot="image-generation-header" className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="chatcn-text-14 text-chatcn-fg line-clamp-3 text-pretty">{prompt}</p>
            <p className="chatcn-text-12 text-chatcn-fg-subtle flex flex-wrap items-center gap-x-1.5 tabular-nums">
              {[
                typeof aspectRatio === "string" ? aspectRatio : null,
                total > 1 ? `${total} variations` : null,
                ...(settings ?? []),
              ]
                .filter((item) => item !== null && item !== undefined && item !== false)
                .map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 ? <span aria-hidden="true">·</span> : null}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
            </p>
          </div>
          <CopyButton
            value={prompt}
            label="Copy prompt"
            size="icon-sm"
            className="-me-1 pointer-coarse:size-11"
          />
        </div>
      ) : null}

      <div className="relative">
        {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useAriaPropsSupportedByRole: a radiogroup once the variations are done; inert before that */}
        <div
          role={selectable ? "radiogroup" : undefined}
          aria-label={selectable ? "Variations" : undefined}
          onKeyDown={onGridKeyDown}
          data-slot="image-generation-grid"
          data-count={total}
          className={cn("grid gap-1.5", single && ratio < 1 && "mx-auto")}
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            // A tall single image would fill the screen: cap its height at 32 rem.
            maxWidth: single && ratio < 1 ? `${Math.round(32 * ratio * 10) / 10}rem` : undefined,
          }}
        >
          {slots.map((image, i) => {
            const frameProgress = image?.progress ?? progress
            const alt = image?.alt ?? (total > 1 ? `${prompt} (variation ${i + 1})` : prompt)
            const frame = (
              <GenerationFrame
                image={image}
                phase={done && !image?.src ? "failed" : status}
                progress={frameProgress}
                ratio={ratio}
                instant={instant}
                alt={alt}
                className="size-full rounded-[inherit]"
              >
                {done && image?.src ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "bg-chatcn-alpha-200 pointer-events-none absolute inset-0 opacity-0",
                      "ease-chatcn-standard transition-opacity duration-150",
                      "[@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:opacity-100",
                    )}
                  />
                ) : null}
              </GenerationFrame>
            )
            const radius = single ? "rounded-chatcn-lg" : "rounded-chatcn-md"
            if (!done || !image?.src) {
              return (
                <div key={image?.id ?? image?.src ?? i} className={cn("relative", radius)}>
                  {frame}
                </div>
              )
            }
            if (single) {
              return (
                <button
                  key={image.id ?? image.src}
                  type="button"
                  aria-label={`Open image: ${alt}`}
                  onClick={() => openLightbox(i)}
                  className={cn(
                    "chatcn-focus group/tile relative block cursor-zoom-in text-start",
                    radius,
                  )}
                >
                  {frame}
                </button>
              )
            }
            const isSelected = i === selected
            return (
              // biome-ignore lint/a11y/useSemanticElements: a radio that shows an image, with roving focus
              <button
                key={image.id ?? image.src}
                ref={(node) => {
                  tileRefs.current[i] = node
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Variation ${i + 1}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => select(i)}
                onDoubleClick={() => openLightbox(i)}
                data-selected={isSelected ? "" : undefined}
                className={cn("chatcn-focus group/tile relative block text-start", radius)}
              >
                {frame}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-[inherit]",
                    "shadow-[inset_0_0_0_2px_var(--chatcn-accent),inset_0_0_0_3.5px_var(--chatcn-bg)]",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            )
          })}
        </div>

        {status === "failed" ? (
          <GenerationNotice
            tone="error"
            icon={<CircleXIcon />}
            title="Image generation failed"
            actions={
              onRetry ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="pointer-coarse:h-11"
                >
                  <RotateCcwIcon />
                  Retry generation
                </Button>
              ) : null
            }
          >
            {errorText ?? "The image service stopped responding. Try again in a moment."}
          </GenerationNotice>
        ) : status === "blocked" ? (
          <GenerationNotice
            icon={<ShieldIcon />}
            title="This image wasn’t created"
            actions={
              onEditPrompt ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditPrompt}
                  className="pointer-coarse:h-11"
                >
                  Edit prompt
                </Button>
              ) : null
            }
          >
            {blockedText ??
              "The prompt may go against the content policy. Try describing the scene and mood instead of a specific person or brand."}
          </GenerationNotice>
        ) : null}
      </div>

      {settled ? null : (
        <div data-slot="image-generation-footer" className="flex h-8 min-w-0 items-center gap-1">
          {status === "queued" ? (
            <div className="chatcn-text-13 flex min-w-0 flex-1 items-center gap-2">
              <ClockIcon aria-hidden="true" className="text-chatcn-fg-subtle size-3.5 shrink-0" />
              <span className="text-chatcn-fg-muted shrink-0 font-medium">Queued</span>
              {queuePosition ? (
                <span className="text-chatcn-fg-subtle shrink-0 whitespace-nowrap tabular-nums">
                  Position {queuePosition}
                </span>
              ) : null}
            </div>
          ) : status === "generating" ? (
            <div
              role="progressbar"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-valuetext={
                [percent !== undefined ? `${percent}%` : null, etaText]
                  .filter(Boolean)
                  .join(", ") || undefined
              }
              className="chatcn-text-13 flex min-w-0 flex-1 items-center gap-2"
            >
              <ShimmerText className="shrink-0">{label}</ShimmerText>
              {percent !== undefined ? (
                <span className="text-chatcn-fg-subtle shrink-0 tabular-nums">{percent}%</span>
              ) : null}
              {etaText ? (
                <>
                  <span aria-hidden="true" className="text-chatcn-fg-subtle">
                    ·
                  </span>
                  <span className="text-chatcn-fg-subtle min-w-0 truncate tabular-nums">
                    {etaText}
                  </span>
                </>
              ) : null}
            </div>
          ) : (
            <div className="chatcn-scroll -ms-2.5 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
              {onUpscale && current ? (
                <ActionButton
                  icon={<Maximize2Icon />}
                  busy={busyAction === "upscale"}
                  disabled={busyAction !== undefined}
                  onClick={() => onUpscale(current, selected)}
                >
                  Upscale
                </ActionButton>
              ) : null}
              {onVary && current ? (
                <ActionButton
                  icon={<ShuffleIcon />}
                  busy={busyAction === "vary"}
                  disabled={busyAction !== undefined}
                  onClick={() => onVary(current, selected)}
                >
                  Vary
                </ActionButton>
              ) : null}
              {onUseAsReference && current ? (
                <ActionButton
                  icon={<ImagePlusIcon />}
                  busy={busyAction === "reference"}
                  disabled={busyAction !== undefined}
                  onClick={() => onUseAsReference(current, selected)}
                >
                  Use as reference
                </ActionButton>
              ) : null}
            </div>
          )}

          {status === "queued" || status === "generating" ? (
            onCancel ? (
              <Button size="sm" onClick={onCancel} className="-me-2.5 pointer-coarse:h-11">
                Cancel
              </Button>
            ) : null
          ) : current?.src ? (
            <div className="-me-1.5 flex shrink-0 items-center gap-0.5">
              {total > 1 ? (
                <span className="chatcn-text-12 text-chatcn-fg-subtle me-1.5 tabular-nums">
                  {selected + 1} of {total}
                </span>
              ) : null}
              <Tooltip content="Download">
                {onDownload ? (
                  <Button
                    size="icon-sm"
                    aria-label="Download image"
                    onClick={() => onDownload(current, selected)}
                    className="pointer-coarse:size-11"
                  >
                    <DownloadIcon />
                  </Button>
                ) : (
                  <a
                    href={current.src}
                    download={downloadName(current, prompt, selected, total)}
                    aria-label="Download image"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon-sm" }),
                      "pointer-coarse:size-11",
                    )}
                  >
                    <DownloadIcon />
                  </a>
                )}
              </Tooltip>
              <Tooltip content="Open">
                <Button
                  size="icon-sm"
                  aria-label="Open image"
                  onClick={() => openLightbox(selected)}
                  className="pointer-coarse:size-11"
                >
                  <MaximizeIcon />
                </Button>
              </Tooltip>
            </div>
          ) : null}
        </div>
      )}

      <span aria-live="polite" className="sr-only">
        {announcement(status, total, queuePosition)}
      </span>

      {lightboxImages.length > 0 ? (
        <ImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onIndexChange={(index) => {
            const slot = ready[index]
            if (slot) select(slot.i)
          }}
          open={lightbox}
          onOpenChange={setLightbox}
        />
      ) : null}
    </div>
  )
}

export type {
  AspectRatio,
  GeneratedImage,
  GenerationFrameProps,
  GenerationStatus,
  ImageGenerationAction,
  ImageGenerationProps,
}
export {
  GenerationFrame,
  GenerationGrain,
  GenerationNotice,
  generationEtaLabel,
  generationStage,
  ImageGeneration,
  parseAspectRatio,
}
