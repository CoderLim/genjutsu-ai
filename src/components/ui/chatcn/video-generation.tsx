"use client"

import * as React from "react"
import { Button, buttonVariants } from "@/components/ui/chatcn/button"
import { CopyButton } from "@/components/ui/chatcn/copy-button"
import {
  type AspectRatio,
  GenerationFrame,
  GenerationNotice,
  type GenerationStatus,
  generationEtaLabel,
  parseAspectRatio,
} from "@/components/ui/chatcn/image-generation"
import { ShimmerText } from "@/components/ui/chatcn/shimmer-text"
import { Tooltip } from "@/components/ui/chatcn/tooltip"
import { formatChatcnDuration } from "@/hooks/use-chatcn-elapsed"
import { useChatcnMediaEta } from "@/hooks/use-chatcn-media-eta"
import {
  CircleXIcon,
  ClockIcon,
  DownloadIcon,
  MaximizeIcon,
  MinimizeIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  ShieldIcon,
  Volume2Icon,
  VolumeXIcon,
} from "@/lib/chatcn-icons"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

/** `0:06`, `1:24`, `1:02:09`. */
function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rest = String(s % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`
}

function speakClock(seconds: number) {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const rest = s % 60
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`
  return m > 0 ? `${part(m, "minute")} ${part(rest, "second")}` : part(rest, "second")
}

type Resolution = string | { width: number; height: number }

function resolutionLabel(resolution: Resolution | undefined) {
  if (!resolution) return null
  if (typeof resolution === "string") return resolution
  return `${resolution.width} × ${resolution.height}`
}

/* -------------------------------------------------------------------------------------------------
 * VideoPlayer
 * -----------------------------------------------------------------------------------------------*/

interface VideoPlayerProps extends Omit<React.ComponentProps<"div">, "title"> {
  src: string
  poster?: string
  /** Describes the video for screen readers. */
  title: string
  /** Length in seconds. Used until the file reports its own, and for recordings that never do. */
  duration?: number
  autoPlay?: boolean
  loop?: boolean
  defaultMuted?: boolean
  /** Shape of the frame. Default 16:9. */
  aspectRatio?: number
}

/**
 * A small video player: a center play button until the first play, then a floating control bar
 * with play, time, a scrubber, mute and full screen. The bar hides 2 s after the pointer stops
 * while playing and stays while paused or focused.
 */
function VideoPlayer({
  src,
  poster,
  title,
  duration: durationProp,
  autoPlay = false,
  loop = false,
  defaultMuted = false,
  aspectRatio = 16 / 9,
  className,
  ...props
}: VideoPlayerProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = React.useState(false)
  const [started, setStarted] = React.useState(autoPlay)
  const [ended, setEnded] = React.useState(false)
  const [time, setTime] = React.useState(0)
  const [mediaDuration, setMediaDuration] = React.useState<number>()
  const [muted, setMuted] = React.useState(defaultMuted)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [idle, setIdle] = React.useState(false)
  const idleTimer = React.useRef<number | undefined>(undefined)

  const duration = mediaDuration ?? durationProp ?? 0

  // Smooth scrubber while playing: `timeupdate` fires only about four times a second.
  React.useEffect(() => {
    if (!playing) return
    let id = 0
    const tick = () => {
      const v = videoRef.current
      if (v) setTime(v.currentTime)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing])

  React.useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  React.useEffect(() => () => window.clearTimeout(idleTimer.current), [])

  const wake = () => {
    setIdle(false)
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), 2000)
  }

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused || v.ended) {
      setStarted(true)
      void v.play().catch(() => {})
    } else v.pause()
  }

  const seek = (to: number) => {
    const v = videoRef.current
    if (!v) return
    const next = Math.min(Math.max(0, to), duration || v.duration || 0)
    v.currentTime = next
    setTime(next)
    setEnded(false)
  }

  const toggleFullscreen = () => {
    const root = rootRef.current
    if (!root) return
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void root.requestFullscreen?.().catch(() => {})
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const onRange = target instanceof HTMLInputElement && target.type === "range"
    const key = event.key.toLowerCase()
    if (key === "k" || (key === " " && target === event.currentTarget)) {
      event.preventDefault()
      toggle()
    } else if (!onRange && (key === "arrowleft" || key === "arrowright")) {
      event.preventDefault()
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
      const forward = (key === "arrowright") !== rtl
      seek(time + (forward ? 5 : -5))
    } else if (key === "m") {
      setMuted((m) => !m)
    } else if (key === "f") {
      toggleFullscreen()
    } else return
    wake()
  }

  const progress = duration > 0 ? Math.min(1, time / duration) : 0
  const showBar = started && (!playing || !idle)

  return (
    // biome-ignore lint/a11y/useSemanticElements: a player region, not a form fieldset
    <div
      ref={rootRef}
      role="group"
      aria-label={`Video player: ${title}`}
      tabIndex={-1}
      data-slot="video-player"
      data-playing={playing ? "" : undefined}
      onKeyDown={onKeyDown}
      onPointerMove={wake}
      onPointerLeave={() => playing && setIdle(true)}
      className={cn(
        "group/player bg-chatcn-fill relative isolate overflow-hidden outline-none",
        fullscreen && "bg-chatcn-bg",
        showBar ? "cursor-default" : playing ? "cursor-none" : "cursor-default",
        className,
      )}
      style={fullscreen ? undefined : { aspectRatio }}
      {...props}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        preload="metadata"
        aria-label={title}
        onClick={toggle}
        onPlay={() => {
          setPlaying(true)
          setEnded(false)
          wake()
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setEnded(true)
        }}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const v = event.currentTarget
          if (Number.isFinite(v.duration)) setMediaDuration(v.duration)
          else if (src.startsWith("blob:")) {
            // Browser recordings (MediaRecorder) report no duration until the end is read. Seeking
            // far ahead makes the browser scan the file, then we rewind.
            const fix = () => {
              v.removeEventListener("durationchange", fix)
              if (Number.isFinite(v.duration)) setMediaDuration(v.duration)
              v.currentTime = 0
            }
            v.addEventListener("durationchange", fix)
            v.currentTime = 1e7
          }
        }}
        className={cn("absolute inset-0 size-full", fullscreen ? "object-contain" : "object-cover")}
      />

      {!started ? (
        <button
          type="button"
          onClick={toggle}
          aria-label="Play video"
          className={cn(
            "chatcn-focus absolute start-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full rtl:translate-x-1/2",
            "bg-chatcn-surface/90 text-chatcn-fg shadow-chatcn-md backdrop-blur-md",
            "ease-chatcn-out transition-[scale,background-color] duration-150 active:scale-(--chatcn-press-scale-icon) active:duration-100",
            "hover:bg-chatcn-surface pointer-coarse:size-14",
          )}
        >
          {/* Optical center: a play triangle sits 1 px right of the geometric center. */}
          <PlayIcon aria-hidden="true" className="size-5 translate-x-px fill-current" />
        </button>
      ) : null}

      <div
        data-slot="video-player-controls"
        className={cn(
          "absolute inset-x-2 bottom-2 flex h-10 items-center gap-1 px-1.5 pointer-coarse:h-12",
          "bg-chatcn-surface/85 rounded-chatcn-md shadow-chatcn-md text-chatcn-fg backdrop-blur-md",
          "ease-chatcn-out transition-opacity duration-150 motion-reduce:transition-none",
          showBar ? "opacity-100" : "pointer-events-none opacity-0",
          started &&
            "focus-within:pointer-events-auto focus-within:opacity-100 focus-within:transition-none",
        )}
      >
        <Button
          size="icon-sm"
          onClick={toggle}
          aria-label={playing ? "Pause" : ended ? "Replay" : "Play"}
          className="text-chatcn-fg pointer-coarse:size-10"
        >
          <span
            key={playing ? "pause" : ended ? "replay" : "play"}
            className="grid place-items-center motion-safe:animate-[chatcn-swap_150ms_var(--chatcn-ease-out)]"
          >
            {playing ? (
              <PauseIcon />
            ) : ended ? (
              <RotateCcwIcon />
            ) : (
              <PlayIcon className="translate-x-px" />
            )}
          </span>
        </Button>
        <span className="chatcn-text-12 text-chatcn-fg-muted shrink-0 px-1 font-medium tabular-nums">
          {formatClock(time)}
          <span className="text-chatcn-fg-subtle"> / {formatClock(Math.round(duration))}</span>
        </span>
        <div className="group/seek relative mx-1.5 flex h-6 min-w-0 flex-1 items-center">
          <span className="bg-chatcn-alpha-500 relative h-1 w-full overflow-hidden rounded-full">
            <span
              className="bg-chatcn-accent absolute inset-0 origin-left rounded-full rtl:origin-right"
              style={{ transform: `scaleX(${progress})` }}
            />
          </span>
          <span
            aria-hidden="true"
            className="bg-chatcn-accent shadow-chatcn-sm absolute size-3 -translate-x-1/2 rounded-full rtl:translate-x-1/2"
            style={{ insetInlineStart: `${progress * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="Seek"
            aria-valuetext={`${speakClock(time)} of ${speakClock(duration)}`}
            className="peer absolute inset-0 size-full cursor-pointer opacity-0"
          />
          <span className="peer-focus-visible:outline-chatcn-accent rounded-chatcn-xs pointer-events-none absolute -inset-x-1 inset-y-0 outline-2 outline-transparent" />
        </div>
        <Tooltip content={muted ? "Unmute" : "Mute"} shortcut="M">
          <Button
            size="icon-sm"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            className="text-chatcn-fg pointer-coarse:size-10"
          >
            {muted ? <VolumeXIcon /> : <Volume2Icon />}
          </Button>
        </Tooltip>
        <Tooltip content={fullscreen ? "Exit full screen" : "Full screen"} shortcut="F">
          <Button
            size="icon-sm"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            className="text-chatcn-fg pointer-coarse:size-10"
          >
            {fullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
          </Button>
        </Tooltip>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--chatcn-alpha-400)]"
      />
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * VideoGeneration
 * -----------------------------------------------------------------------------------------------*/

interface VideoGenerationProps extends React.ComponentProps<"div"> {
  prompt: string
  status: GenerationStatus
  /** 0 to 100 while generating. */
  progress?: number
  /** Place in line while queued. 1 means next. */
  queuePosition?: number
  /**
   * Time left in ms, from the provider. While generating it is measured from progress when
   * omitted. While queued it is shown as the expected wait.
   */
  etaMs?: number
  /** A frame from the clip. Revealed from the top while generating, then the player's poster. */
  posterSrc?: string
  /** The finished clip. */
  src?: string
  /** Length in seconds. */
  duration?: number
  /** `"1080p"`, or a size. */
  resolution?: Resolution
  fps?: number
  /** The clip has sound. */
  audio?: boolean
  /** Default `"16:9"`. */
  aspectRatio?: AspectRatio
  /** Extra facts in the summary line, such as the model. */
  settings?: React.ReactNode[]
  statusText?: string
  errorText?: React.ReactNode
  blockedText?: React.ReactNode
  onRetry?: () => void
  onCancel?: () => void
  onEditPrompt?: () => void
  /** Replace the built-in download link. */
  onDownload?: () => void
  /** File name for downloads. */
  filename?: string
  /** Extra actions shown when the clip is done, for example Extend or Remix. */
  actions?: React.ReactNode
  autoPlay?: boolean
  loop?: boolean
}

function videoStage(progress: number | undefined) {
  if (progress === undefined || progress < 40) return "Generating video"
  if (progress < 88) return "Rendering frames"
  return "Encoding"
}

/** The time left in calm steps, shared with image generation. */
const etaLabel = generationEtaLabel

/**
 * A video job in a conversation: queue position, progress with the time left, a poster frame
 * revealed as it renders, then a player with the clip's length and resolution.
 */
function VideoGeneration({
  prompt,
  status,
  progress,
  queuePosition,
  etaMs,
  posterSrc,
  src,
  duration,
  resolution,
  fps,
  audio,
  aspectRatio = "16:9",
  settings,
  statusText,
  errorText,
  blockedText,
  onRetry,
  onCancel,
  onEditPrompt,
  onDownload,
  filename,
  actions,
  autoPlay,
  loop,
  className,
  ...props
}: VideoGenerationProps) {
  const ratio = parseAspectRatio(aspectRatio)
  const generating = status === "generating"
  const eta = useChatcnMediaEta(progress, { active: generating, etaMs })
  const [instant] = React.useState(() => status === "done")
  const percent = progress === undefined ? undefined : Math.round(Math.min(100, progress))
  const label = statusText ?? videoStage(progress)
  const done = status === "done" && Boolean(src)

  const facts = [
    typeof aspectRatio === "string" ? aspectRatio : null,
    duration !== undefined ? formatChatcnDuration(duration * 1000, { precise: false }) : null,
    resolutionLabel(resolution),
    fps ? `${fps} fps` : null,
    audio === undefined ? null : audio ? "Sound" : "No sound",
    ...(settings ?? []),
  ].filter((item) => item !== null && item !== undefined && item !== false)

  return (
    <div
      data-slot="video-generation"
      data-generation-state={status}
      aria-busy={status === "queued" || generating || undefined}
      className={cn("chatcn-text-14 text-chatcn-fg flex w-full min-w-0 flex-col gap-3", className)}
      {...props}
    >
      <div data-slot="video-generation-header" className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="chatcn-text-14 text-chatcn-fg line-clamp-3 text-pretty">{prompt}</p>
          {facts.length > 0 ? (
            <p className="chatcn-text-12 text-chatcn-fg-subtle flex flex-wrap items-center gap-x-1.5 tabular-nums">
              {facts.map((item, i) => (
                <React.Fragment key={i}>
                  {i > 0 ? <span aria-hidden="true">·</span> : null}
                  <span>{item}</span>
                </React.Fragment>
              ))}
            </p>
          ) : null}
        </div>
        <CopyButton
          value={prompt}
          label="Copy prompt"
          size="icon-sm"
          className="-me-1 pointer-coarse:size-11"
        />
      </div>

      <div className="rounded-chatcn-lg relative">
        {done && src ? (
          <VideoPlayer
            src={src}
            poster={posterSrc}
            title={prompt}
            duration={duration}
            aspectRatio={ratio}
            autoPlay={autoPlay}
            loop={loop}
            className="rounded-chatcn-lg"
          />
        ) : (
          <GenerationFrame
            image={posterSrc ? { src: posterSrc } : undefined}
            phase={status === "done" ? "generating" : status}
            progress={status === "done" ? 100 : progress}
            ratio={ratio}
            instant={instant}
            alt=""
            className="rounded-chatcn-lg"
          />
        )}

        {status === "failed" ? (
          <GenerationNotice
            tone="error"
            icon={<CircleXIcon />}
            title="Video generation failed"
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
            {errorText ?? "Rendering stopped before the clip finished. Try again in a moment."}
          </GenerationNotice>
        ) : status === "blocked" ? (
          <GenerationNotice
            icon={<ShieldIcon />}
            title="This video wasn’t created"
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
              "The prompt may go against the content policy. Try describing the action and setting instead of a specific person."}
          </GenerationNotice>
        ) : null}
      </div>

      {status === "failed" || status === "blocked" ? null : (
        <div data-slot="video-generation-footer" className="flex h-8 min-w-0 items-center gap-2">
          {status === "queued" ? (
            <div className="chatcn-text-13 flex min-w-0 flex-1 items-center gap-2">
              <ClockIcon aria-hidden="true" className="text-chatcn-fg-subtle size-3.5 shrink-0" />
              <span className="text-chatcn-fg-muted shrink-0 font-medium">Queued</span>
              {queuePosition ? (
                <span className="text-chatcn-fg-subtle shrink-0 whitespace-nowrap tabular-nums">
                  Position {queuePosition}
                </span>
              ) : null}
              {etaMs !== undefined ? (
                <>
                  <span aria-hidden="true" className="text-chatcn-fg-subtle">
                    ·
                  </span>
                  <span className="text-chatcn-fg-subtle truncate tabular-nums">
                    About {formatChatcnDuration(etaMs, { precise: false })} wait
                  </span>
                </>
              ) : null}
            </div>
          ) : generating || !done ? (
            <div
              role="progressbar"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-valuetext={[
                percent !== undefined ? `${percent}%` : null,
                etaLabel(eta, progress),
              ]
                .filter(Boolean)
                .join(", ")}
              className="chatcn-text-13 flex min-w-0 flex-1 items-center gap-2"
            >
              <ShimmerText className="truncate">{label}</ShimmerText>
              {percent !== undefined ? (
                <span className="text-chatcn-fg-subtle tabular-nums">{percent}%</span>
              ) : null}
              {etaLabel(eta, progress) ? (
                <>
                  <span aria-hidden="true" className="text-chatcn-fg-subtle">
                    ·
                  </span>
                  <span className="text-chatcn-fg-subtle truncate tabular-nums">
                    {etaLabel(eta, progress)}
                  </span>
                </>
              ) : null}
            </div>
          ) : (
            <div className="chatcn-scroll -ms-2.5 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
              {actions}
            </div>
          )}

          {status === "queued" || generating ? (
            onCancel ? (
              <Button size="sm" onClick={onCancel} className="-me-2.5 pointer-coarse:h-11">
                Cancel
              </Button>
            ) : null
          ) : done && src ? (
            <Tooltip content="Download">
              {onDownload ? (
                <Button
                  size="icon-sm"
                  aria-label="Download video"
                  onClick={onDownload}
                  className="-me-1.5 pointer-coarse:size-11"
                >
                  <DownloadIcon />
                </Button>
              ) : (
                <a
                  href={src}
                  download={filename ?? "video"}
                  aria-label="Download video"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "-me-1.5 pointer-coarse:size-11",
                  )}
                >
                  <DownloadIcon />
                </a>
              )}
            </Tooltip>
          ) : null}
        </div>
      )}

      <span aria-live="polite" className="sr-only">
        {status === "queued"
          ? queuePosition
            ? `Video queued, position ${queuePosition}`
            : "Video queued"
          : status === "generating"
            ? "Generating video"
            : status === "done"
              ? "Video ready"
              : status === "failed"
                ? "Video generation failed"
                : "The video was not created"}
      </span>
    </div>
  )
}

export type { Resolution, VideoGenerationProps, VideoPlayerProps }
export { formatClock, VideoGeneration, VideoPlayer }
