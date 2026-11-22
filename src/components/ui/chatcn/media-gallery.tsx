import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import * as React from "react"
import { Button, buttonVariants } from "@/components/ui/chatcn/button"
import { CopyButton } from "@/components/ui/chatcn/copy-button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/chatcn/dialog"
import { Tooltip } from "@/components/ui/chatcn/tooltip"
import { formatClock, VideoPlayer } from "@/components/ui/chatcn/video-generation"
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ImagesIcon,
  PlayIcon,
  Trash2Icon,
  XIcon,
} from "@/lib/chatcn-icons"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface MediaItem {
  id: string
  kind: "image" | "video"
  /** The image, or the video file. */
  src: string
  /** Poster frame for videos. Tiles show it instead of loading the video. */
  posterSrc?: string
  /**
   * A small version for the grid, about 480 to 960 px. Tiles load it instead of the full file;
   * the viewer still opens `src`. A library of 1920 px photos stays light this way.
   */
  thumbnailSrc?: string
  /** Describe what it shows. */
  alt: string
  /** The prompt that made it. Shown in the viewer with a copy button. */
  prompt?: string
  createdAt?: Date | string | number
  width?: number
  height?: number
  /** Video length in seconds. */
  duration?: number
  filename?: string
}

type MediaFilter = "all" | "image" | "video"

interface MediaGalleryProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  items: MediaItem[]
  /** Show placeholder tiles while the library loads. */
  loading?: boolean
  filter?: MediaFilter
  defaultFilter?: MediaFilter
  onFilterChange?: (filter: MediaFilter) => void
  /** Selected item ids. */
  selected?: string[]
  defaultSelected?: string[]
  onSelectedChange?: (ids: string[]) => void
  /** Shows Download in the selection bar. */
  onDownload?: (items: MediaItem[]) => void
  /** Shows Delete in the selection bar. */
  onDelete?: (items: MediaItem[]) => void
  /** Headings by day: Today, Yesterday, then dates. On when items have `createdAt`. */
  groupByDay?: boolean
  /** "Now" for day headings. Pass a fixed date in tests and screenshots. */
  now?: Date
}

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

const FILTERS: { value: MediaFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
]

const toDate = (value: MediaItem["createdAt"]) =>
  value === undefined ? undefined : value instanceof Date ? value : new Date(value)

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dayLabel(date: Date, now: Date) {
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days > 1 && days < 7) return date.toLocaleDateString(undefined, { weekday: "long" })
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  })
}

function groupItems(items: MediaItem[], byDay: boolean, now: Date) {
  if (!byDay) return [{ label: null as string | null, items }]
  const groups: { label: string | null; key: number; items: MediaItem[] }[] = []
  for (const item of items) {
    const date = toDate(item.createdAt)
    const key = date ? startOfDay(date) : -1
    let group = groups.find((g) => g.key === key)
    if (!group) {
      group = { label: date ? dayLabel(date, now) : "Earlier", key, items: [] }
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}

/** Columns in the rendered grid, read from layout so arrow keys match what people see. */
function columnsOf(tiles: HTMLElement[]) {
  const first = tiles[0]
  if (!first) return 1
  const top = first.getBoundingClientRect().top
  let cols = 0
  for (const tile of tiles) {
    if (Math.abs(tile.getBoundingClientRect().top - top) > 2) break
    cols++
  }
  return Math.max(1, cols)
}

const HAIRLINE =
  "pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--chatcn-alpha-400)] forced-colors:outline-solid forced-colors:outline-1"

/* -------------------------------------------------------------------------------------------------
 * Zoomable image (pinch / wheel / drag — blocks page zoom while open)
 * -----------------------------------------------------------------------------------------------*/

const ZOOM_MIN = 1
const ZOOM_MAX = 4

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function ZoomableImage({
  src,
  alt,
  width,
  height,
  thumbnailSrc,
}: {
  src: string
  alt: string
  width?: number
  height?: number
  thumbnailSrc?: string
}) {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = React.useState(1)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const zoomRef = React.useRef(zoom)
  const panRef = React.useRef(pan)
  const pinchRef = React.useRef<{ distance: number; zoom: number } | null>(null)
  const dragRef = React.useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const lastTapRef = React.useRef(0)

  React.useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])
  React.useEffect(() => {
    panRef.current = pan
  }, [pan])

  React.useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    pinchRef.current = null
    dragRef.current = null
  }, [src])

  const applyZoomAt = React.useCallback((nextZoom: number, clientX: number, clientY: number) => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const cx = clientX - rect.left - rect.width / 2
    const cy = clientY - rect.top - rect.height / 2
    const prev = zoomRef.current
    const z = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX)
    if (z === ZOOM_MIN) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }
    const scale = z / prev
    setZoom(z)
    setPan({
      x: cx - (cx - panRef.current.x) * scale,
      y: cy - (cy - panRef.current.y) * scale,
    })
  }, [])

  React.useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const delta = event.deltaY > 0 ? 0.9 : 1.1
      applyZoomAt(zoomRef.current * delta, event.clientX, event.clientY)
    }

    const touchDistance = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        dragRef.current = null
        pinchRef.current = {
          distance: touchDistance(event.touches[0], event.touches[1]),
          zoom: zoomRef.current,
        }
        return
      }
      if (event.touches.length === 1 && zoomRef.current > 1) {
        const t = event.touches[0]
        dragRef.current = {
          x: t.clientX,
          y: t.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        }
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && pinchRef.current) {
        event.preventDefault()
        const distance = touchDistance(event.touches[0], event.touches[1])
        const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2
        const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2
        const next = pinchRef.current.zoom * (distance / pinchRef.current.distance)
        applyZoomAt(next, midX, midY)
        return
      }
      if (event.touches.length === 1 && dragRef.current && zoomRef.current > 1) {
        event.preventDefault()
        const t = event.touches[0]
        setPan({
          x: dragRef.current.panX + (t.clientX - dragRef.current.x),
          y: dragRef.current.panY + (t.clientY - dragRef.current.y),
        })
      }
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchRef.current = null
      if (event.touches.length === 0) dragRef.current = null
    }

    stage.addEventListener("wheel", onWheel, { passive: false })
    stage.addEventListener("touchstart", onTouchStart, { passive: true })
    stage.addEventListener("touchmove", onTouchMove, { passive: false })
    stage.addEventListener("touchend", onTouchEnd)
    stage.addEventListener("touchcancel", onTouchEnd)
    return () => {
      stage.removeEventListener("wheel", onWheel)
      stage.removeEventListener("touchstart", onTouchStart)
      stage.removeEventListener("touchmove", onTouchMove)
      stage.removeEventListener("touchend", onTouchEnd)
      stage.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [applyZoomAt])

  return (
    <div
      ref={stageRef}
      className="relative flex size-full touch-none items-center justify-center overflow-hidden"
      onDoubleClick={(event) => {
        if (zoomRef.current > 1) {
          setZoom(1)
          setPan({ x: 0, y: 0 })
          return
        }
        applyZoomAt(2, event.clientX, event.clientY)
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== "touch") return
        const now = Date.now()
        if (now - lastTapRef.current < 280) {
          if (zoomRef.current > 1) {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          } else {
            applyZoomAt(2, event.clientX, event.clientY)
          }
          lastTapRef.current = 0
          return
        }
        lastTapRef.current = now
      }}
      onPointerDown={(event) => {
        if (event.pointerType === "touch" || zoomRef.current <= 1) return
        dragRef.current = {
          x: event.clientX,
          y: event.clientY,
          panX: panRef.current.x,
          panY: panRef.current.y,
        }
        const onMove = (move: PointerEvent) => {
          if (!dragRef.current) return
          setPan({
            x: dragRef.current.panX + (move.clientX - dragRef.current.x),
            y: dragRef.current.panY + (move.clientY - dragRef.current.y),
          })
        }
        const onUp = () => {
          dragRef.current = null
          window.removeEventListener("pointermove", onMove)
          window.removeEventListener("pointerup", onUp)
        }
        window.addEventListener("pointermove", onMove)
        window.addEventListener("pointerup", onUp)
      }}
      style={{ cursor: zoom > 1 ? "grab" : "zoom-in" }}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        draggable={false}
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: "center center",
          ...(thumbnailSrc
            ? {
                backgroundImage: `url("${thumbnailSrc}")`,
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : null),
        }}
        className="max-h-full max-w-full object-contain select-none will-change-transform"
      />
    </div>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Viewer (lightbox on the shared Dialog)
 * -----------------------------------------------------------------------------------------------*/

interface MediaViewerProps {
  items: MediaItem[]
  index: number
  onIndexChange: (index: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Full-screen viewer for images and videos. Arrow keys page (mirrored in right-to-left layouts),
 * except while the video player has focus, where they seek. Paging swaps instantly.
 */
function MediaViewer({ items, index, onIndexChange, open, onOpenChange }: MediaViewerProps) {
  const count = items.length
  const current = items[Math.min(Math.max(index, 0), count - 1)]
  const stageRef = React.useRef<HTMLDivElement>(null)
  const go = (delta: number) => onIndexChange((index + delta + count) % count)
  if (!current) return null
  const date = toDate(current.createdAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="full"
        initialFocus={stageRef}
        data-slot="media-viewer"
        // Above SiteHeader (z-260). True viewport cover; no page chrome peeking through.
        className="z-[270] h-dvh max-h-none w-screen rounded-none border-0 bg-black text-white shadow-none [&_[data-slot=dialog-close]]:text-white [&_[data-slot=dialog-close]]:hover:bg-white/10 [&_[data-slot=dialog-close]]:hover:text-white"
        backdropClassName="z-[270] bg-black/95"
        onKeyDown={(event) => {
          if (event.defaultPrevented || count < 2) return
          const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
          if (event.key === (rtl ? "ArrowLeft" : "ArrowRight")) {
            event.preventDefault()
            go(1)
          } else if (event.key === (rtl ? "ArrowRight" : "ArrowLeft")) {
            event.preventDefault()
            go(-1)
          }
        }}
      >
        <div className="flex h-13 shrink-0 items-center gap-3 ps-5 pe-14">
          {current.prompt ? (
            <DialogTitle className="chatcn-text-14 min-w-0 flex-1 truncate font-medium text-white">
              {current.prompt}
            </DialogTitle>
          ) : (
            <DialogTitle className="sr-only">{current.alt}</DialogTitle>
          )}
          <div className="min-w-0 flex-1" aria-hidden={!current.prompt} />
          {count > 1 ? (
            <span className="chatcn-text-13 shrink-0 tabular-nums text-white/60">
              {index + 1} of {count}
            </span>
          ) : null}
          {current.prompt ? (
            <Tooltip content="Copy prompt">
              <CopyButton
                value={current.prompt}
                label="Copy prompt"
                className="pointer-coarse:size-11"
              />
            </Tooltip>
          ) : null}
          <Tooltip content="Download">
            <a
              href={current.src}
              download={current.filename ?? (current.kind === "video" ? "video" : "image")}
              aria-label={current.kind === "video" ? "Download video" : "Download image"}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "pointer-coarse:size-11 text-white hover:bg-white/10 hover:text-white",
              )}
            >
              <DownloadIcon />
            </a>
          </Tooltip>
        </div>

        <div
          ref={stageRef}
          tabIndex={-1}
          className="relative flex min-h-0 flex-1 touch-none items-center justify-center outline-none"
        >
          {current.kind === "video" ? (
            <VideoPlayer
              key={current.id}
              src={current.src}
              poster={current.posterSrc}
              title={current.alt}
              duration={current.duration}
              aspectRatio={
                current.width && current.height ? current.width / current.height : 16 / 9
              }
              className="rounded-chatcn-md max-h-full w-full max-w-5xl"
            />
          ) : (
            <ZoomableImage
              key={current.id}
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              thumbnailSrc={current.thumbnailSrc}
            />
          )}
          {count > 1 ? (
            <>
              <Button
                variant="outline"
                size="icon-md"
                aria-label="Previous item"
                onClick={() => go(-1)}
                className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full border-white/20 bg-black/40 text-white max-sm:hidden hover:bg-black/60"
              >
                <ChevronLeftIcon className="rtl:-scale-x-100" />
              </Button>
              <Button
                variant="outline"
                size="icon-md"
                aria-label="Next item"
                onClick={() => go(1)}
                className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full border-white/20 bg-black/40 text-white max-sm:hidden hover:bg-black/60"
              >
                <ChevronRightIcon className="rtl:-scale-x-100" />
              </Button>
            </>
          ) : null}
        </div>

        {current.prompt || current.width || current.duration !== undefined || date ? (
          <div className="chatcn-text-12 flex shrink-0 flex-wrap items-center justify-center gap-x-1.5 px-5 py-3 tabular-nums text-white/60">
            {[
              current.kind === "video" ? "Video" : "Image",
              current.width && current.height ? `${current.width} × ${current.height}` : null,
              current.duration !== undefined ? formatClock(current.duration) : null,
              date
                ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                : null,
            ]
              .filter(Boolean)
              .map((fact, i) => (
                <React.Fragment key={fact}>
                  {i > 0 ? <span aria-hidden="true">·</span> : null}
                  <span>{fact}</span>
                </React.Fragment>
              ))}
          </div>
        ) : null}
        {count > 1 ? (
          <div className="flex shrink-0 justify-center gap-2 pb-4 sm:hidden">
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Previous item"
              onClick={() => go(-1)}
              className="border-white/20 bg-black/40 text-white hover:bg-black/60"
            >
              <ChevronLeftIcon className="rtl:-scale-x-100" />
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Next item"
              onClick={() => go(1)}
              className="border-white/20 bg-black/40 text-white hover:bg-black/60"
            >
              <ChevronRightIcon className="rtl:-scale-x-100" />
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Tile
 * -----------------------------------------------------------------------------------------------*/

function MediaTile({
  item,
  selected,
  selecting,
  focusable,
  tileRef,
  onActivate,
  onToggle,
  onKeyDown,
  onFocus,
}: {
  item: MediaItem
  selected: boolean
  selecting: boolean
  focusable: boolean
  tileRef: (node: HTMLButtonElement | null) => void
  onActivate: (event: React.MouseEvent) => void
  onToggle: (event: React.MouseEvent | React.KeyboardEvent) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void
  onFocus: () => void
}) {
  const thumb = item.thumbnailSrc ?? (item.kind === "video" ? item.posterSrc : item.src)
  const kind = item.kind === "video" ? "video" : "image"
  return (
    <li
      data-slot="media-tile"
      data-kind={item.kind}
      data-selected={selected ? "" : undefined}
      className="group/tile rounded-chatcn-md relative aspect-square min-w-0"
    >
      <button
        ref={tileRef}
        type="button"
        tabIndex={focusable ? 0 : -1}
        aria-label={`${selecting ? "Select" : "Open"} ${kind}: ${item.alt}${item.kind === "video" ? `, ${item.duration !== undefined ? formatClock(item.duration) : "Video"}` : ""}${selected ? ", selected" : ""}`}
        onClick={onActivate}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className={cn(
          "chatcn-focus bg-chatcn-fill relative block size-full overflow-hidden rounded-[inherit]",
          selecting ? "cursor-pointer" : "cursor-zoom-in",
        )}
      >
        {thumb ? <TileImage src={thumb} /> : null}
        <span
          aria-hidden="true"
          className={cn(
            "bg-chatcn-alpha-200 pointer-events-none absolute inset-0 opacity-0",
            "ease-chatcn-standard transition-opacity duration-150",
            "[@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:opacity-100",
          )}
        />
        {item.kind === "video" ? (
          <span className="bg-chatcn-surface/85 rounded-chatcn-sm chatcn-text-12 text-chatcn-fg shadow-chatcn-xs absolute end-1.5 bottom-1.5 flex h-5 items-center gap-1 px-1.5 font-medium tabular-nums backdrop-blur-md">
            <PlayIcon aria-hidden="true" className="size-2.5 fill-current" />
            {item.duration !== undefined ? formatClock(item.duration) : "Video"}
          </span>
        ) : null}
        <span aria-hidden="true" className={HAIRLINE} />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit]",
            "shadow-[inset_0_0_0_2px_var(--chatcn-accent),inset_0_0_0_3.5px_var(--chatcn-bg)]",
            selected ? "opacity-100" : "opacity-0",
          )}
        />
      </button>
      {/* Pointer shortcut for selection. Keyboard users press Space on the tile instead. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onToggle}
        className={cn(
          "absolute start-1.5 top-1.5 grid size-6 place-items-center rounded-full",
          "before:absolute before:-inset-1.5 before:content-[''] pointer-coarse:before:-inset-2.5",
          selecting || selected
            ? "opacity-100"
            : "opacity-0 group-focus-within/tile:opacity-100 pointer-coarse:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover/tile:opacity-100",
        )}
      >
        <span
          className={cn(
            "grid size-5 place-items-center rounded-full [&_svg]:size-3",
            selected
              ? "bg-chatcn-accent text-chatcn-accent-fg shadow-chatcn-xs"
              : "bg-chatcn-surface/80 shadow-[inset_0_0_0_1.5px_var(--chatcn-border-strong)] backdrop-blur-sm",
          )}
        >
          {selected ? <CheckIcon strokeWidth={2.25} /> : null}
        </span>
      </button>
    </li>
  )
}

/**
 * A tile's picture. The square is there from the first paint; the photo fades in once it has
 * decoded, so it never paints in from the top. Cached images show at once with no fade.
 */
function TileImage({ src }: { src: string }) {
  const [state, setState] = React.useState<{ src: string; loaded: boolean; cached: boolean }>({
    src,
    loaded: false,
    cached: false,
  })
  if (state.src !== src) setState({ src, loaded: false, cached: false })
  const ref = React.useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) {
        setState((s) => (s.src === src && !s.loaded ? { src, loaded: true, cached: true } : s))
      }
    },
    [src],
  )
  return (
    <img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={() => setState((s) => (s.loaded ? s : { src, loaded: true, cached: false }))}
      className={cn(
        "absolute inset-0 size-full object-cover select-none",
        !state.cached && "ease-chatcn-out-soft transition-opacity duration-200",
        state.loaded ? "opacity-100" : "opacity-0",
      )}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * MediaGallery
 * -----------------------------------------------------------------------------------------------*/

/**
 * A library of generated images and videos: filter by kind, a square grid grouped by day, a
 * full-screen viewer, and multi-select with Shift for ranges. Arrow keys move through the grid,
 * Enter opens, Space selects, and Escape clears the selection.
 */
function MediaGallery({
  items,
  loading = false,
  filter: filterProp,
  defaultFilter = "all",
  onFilterChange,
  selected: selectedProp,
  defaultSelected = [],
  onSelectedChange,
  onDownload,
  onDelete,
  groupByDay,
  now: nowProp,
  className,
  ...props
}: MediaGalleryProps) {
  const [filterState, setFilterState] = React.useState(defaultFilter)
  const filter = filterProp ?? filterState
  const setFilter = (next: MediaFilter) => {
    if (filterProp === undefined) setFilterState(next)
    onFilterChange?.(next)
  }

  const [selectedState, setSelectedState] = React.useState<string[]>(defaultSelected)
  const selected = selectedProp ?? selectedState
  const setSelected = (next: string[]) => {
    if (selectedProp === undefined) setSelectedState(next)
    onSelectedChange?.(next)
  }
  const selectedSet = new Set(selected)
  const selecting = selected.length > 0

  const sorted = React.useMemo(
    () =>
      [...items].sort(
        (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0),
      ),
    [items],
  )
  // The clock is read after mount, never during render (Next.js prerender). Until then days are
  // labeled against the newest item, which the first client frame corrects.
  const [mounted, setMounted] = React.useState<Date | null>(null)
  React.useEffect(() => setMounted(new Date()), [])
  const now = React.useMemo(
    () => nowProp ?? mounted ?? toDate(sorted[0]?.createdAt) ?? new Date(0),
    [nowProp, mounted, sorted],
  )
  const visible = filter === "all" ? sorted : sorted.filter((item) => item.kind === filter)
  const byDay = groupByDay ?? items.some((item) => item.createdAt !== undefined)
  const groups = groupItems(visible, byDay, now)
  // Grouping can reorder; keyboard order follows what is on screen.
  const ordered = groups.flatMap((g) => g.items)
  const counts = {
    all: items.length,
    image: items.filter((i) => i.kind === "image").length,
    video: items.filter((i) => i.kind === "video").length,
  }

  const [active, setActive] = React.useState<string>()
  const activeId = ordered.some((i) => i.id === active) ? active : ordered[0]?.id
  const anchor = React.useRef<string | undefined>(undefined)
  const tiles = React.useRef(new Map<string, HTMLButtonElement>())
  const [viewer, setViewer] = React.useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  })

  const toggle = (id: string, range: boolean) => {
    if (range && anchor.current) {
      const a = ordered.findIndex((i) => i.id === anchor.current)
      const b = ordered.findIndex((i) => i.id === id)
      if (a >= 0 && b >= 0) {
        const ids = ordered.slice(Math.min(a, b), Math.max(a, b) + 1).map((i) => i.id)
        setSelected(Array.from(new Set([...selected, ...ids])))
        return
      }
    }
    anchor.current = id
    setSelected(selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  const open = (id: string) => {
    const index = ordered.findIndex((i) => i.id === id)
    if (index >= 0) setViewer({ open: true, index })
  }

  const focusItem = (id: string | undefined) => {
    if (!id) return
    setActive(id)
    tiles.current.get(id)?.focus()
  }

  const onTileKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
    const index = ordered.findIndex((i) => i.id === id)
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl"
    const els = ordered
      .map((i) => tiles.current.get(i.id))
      .filter((el): el is HTMLButtonElement => Boolean(el))
    const cols = columnsOf(els)
    const moves: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowDown: cols,
      ArrowUp: -cols,
    }
    if (event.key in moves) {
      event.preventDefault()
      const next = Math.min(ordered.length - 1, Math.max(0, index + (moves[event.key] ?? 0)))
      focusItem(ordered[next]?.id)
    } else if (event.key === "Home") {
      event.preventDefault()
      focusItem(ordered[0]?.id)
    } else if (event.key === "End") {
      event.preventDefault()
      focusItem(ordered[ordered.length - 1]?.id)
    } else if (event.key === " ") {
      event.preventDefault()
      toggle(id, event.shiftKey)
    } else if (event.key === "Enter") {
      event.preventDefault()
      open(id)
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      event.preventDefault()
      setSelected(ordered.map((i) => i.id))
    } else if (event.key === "Escape" && selecting) {
      event.preventDefault()
      setSelected([])
    }
  }

  const selectedItems = items.filter((item) => selectedSet.has(item.id))
  const emptyLabel =
    filter === "video" ? "No videos yet" : filter === "image" ? "No images yet" : "Nothing here yet"
  const emptyText =
    filter === "video"
      ? "Videos you generate show up here."
      : filter === "image"
        ? "Images you generate show up here."
        : "Generated images and videos show up here."

  return (
    <div
      data-slot="media-gallery"
      data-selecting={selecting ? "" : undefined}
      className={cn("chatcn-text-14 text-chatcn-fg flex w-full min-w-0 flex-col gap-4", className)}
      {...props}
    >
      <div data-slot="media-gallery-toolbar" className="flex h-8 min-w-0 items-center gap-2">
        {selecting ? (
          <>
            <Tooltip content="Clear selection" shortcut="Esc">
              <Button
                size="icon-sm"
                aria-label="Clear selection"
                onClick={() => setSelected([])}
                className="-ms-1.5 pointer-coarse:size-11"
              >
                <XIcon />
              </Button>
            </Tooltip>
            <span className="chatcn-text-13 font-medium tabular-nums">
              {selected.length} selected
            </span>
            <div className="ms-auto flex items-center gap-1">
              {onDownload ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownload(selectedItems)}
                  className="pointer-coarse:h-11"
                >
                  <DownloadIcon />
                  Download
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onDelete(selectedItems)
                    setSelected([])
                  }}
                  className="pointer-coarse:h-11"
                >
                  <Trash2Icon />
                  Delete
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <ToggleGroup
            value={[filter]}
            onValueChange={(next) => {
              const picked = next[0] as MediaFilter | undefined
              if (picked) setFilter(picked)
            }}
            aria-label="Show"
            className="bg-chatcn-fill rounded-chatcn-md flex h-8 items-center gap-0.5 p-0.5 pointer-coarse:h-11"
          >
            {FILTERS.map((option) => (
              <Toggle
                key={option.value}
                value={option.value}
                className={cn(
                  "chatcn-focus rounded-chatcn-sm chatcn-text-13 inline-flex h-full items-center gap-1.5 px-2.5 font-medium",
                  "text-chatcn-fg-subtle ease-chatcn-standard transition-colors duration-150",
                  "hover:text-chatcn-fg data-[pressed]:bg-chatcn-card data-[pressed]:text-chatcn-fg data-[pressed]:shadow-chatcn-xs",
                )}
              >
                {option.label}
                <span className="text-chatcn-fg-subtle font-normal tabular-nums">
                  {loading ? "" : counts[option.value]}
                </span>
              </Toggle>
            ))}
          </ToggleGroup>
        )}
      </div>

      {loading ? (
        <ul
          aria-label="Loading media"
          aria-busy="true"
          className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-1.5"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i} className="bg-chatcn-fill rounded-chatcn-md aspect-square" />
          ))}
        </ul>
      ) : ordered.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-6 py-16 text-center">
          <ImagesIcon aria-hidden="true" className="text-chatcn-fg-subtle mb-1.5 size-5" />
          <p className="chatcn-text-14 font-medium">{emptyLabel}</p>
          <p className="chatcn-text-13 text-chatcn-fg-muted">{emptyText}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section
              key={group.label ?? "all"}
              aria-label={group.label ?? undefined}
              className="flex flex-col gap-2"
            >
              {group.label ? (
                <h3 className="chatcn-text-13 text-chatcn-fg-muted font-medium">{group.label}</h3>
              ) : null}
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-1.5">
                {group.items.map((item) => (
                  <MediaTile
                    key={item.id}
                    item={item}
                    selected={selectedSet.has(item.id)}
                    selecting={selecting}
                    focusable={item.id === activeId}
                    tileRef={(node) => {
                      if (node) tiles.current.set(item.id, node)
                      else tiles.current.delete(item.id)
                    }}
                    onFocus={() => setActive(item.id)}
                    onActivate={(event) => {
                      if (selecting || event.shiftKey || event.metaKey || event.ctrlKey)
                        toggle(item.id, event.shiftKey)
                      else open(item.id)
                    }}
                    onToggle={(event) => toggle(item.id, event.shiftKey)}
                    onKeyDown={(event) => onTileKeyDown(event, item.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <span aria-live="polite" className="sr-only">
        {selecting ? `${selected.length} selected` : ""}
      </span>

      <MediaViewer
        items={ordered}
        index={viewer.index}
        onIndexChange={(index) => {
          setViewer((v) => ({ ...v, index }))
          setActive(ordered[index]?.id)
        }}
        open={viewer.open}
        onOpenChange={(next) => setViewer((v) => ({ ...v, open: next }))}
      />
    </div>
  )
}

export type { MediaFilter, MediaGalleryProps, MediaItem, MediaViewerProps }
export { MediaGallery, MediaViewer }
