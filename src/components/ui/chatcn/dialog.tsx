import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import * as React from "react"
import { buttonVariants } from "@/components/ui/chatcn/button"
import { XIcon } from "@/lib/chatcn-icons"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Motion
 *
 * Scrim and popup share one duration and curve: 220 ms in, 160 ms out, ease-chatcn-out. The popup
 * grows from 0.96 at the center and leaves at 0.98 (exits travel less). Opened or closed from the
 * keyboard, nothing animates: Enter and Esc should feel instant.
 * -----------------------------------------------------------------------------------------------*/

const InstantContext = React.createContext(false)

/** A keyboard Enter on a button arrives as a click with `detail === 0`. */
function isKeyboardEvent(event: Event | undefined) {
  if (!event) return false
  if (typeof KeyboardEvent !== "undefined" && event instanceof KeyboardEvent) return true
  return event.type === "click" && (event as MouseEvent).detail === 0
}

type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>

function Dialog({ onOpenChange, ...props }: DialogProps) {
  const [instant, setInstant] = React.useState(false)
  return (
    <InstantContext.Provider value={instant}>
      <DialogPrimitive.Root
        onOpenChange={(open, details) => {
          setInstant(isKeyboardEvent(details.event))
          onOpenChange?.(open, details)
        }}
        {...props}
      />
    </InstantContext.Provider>
  )
}

function DialogTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" className={className} {...props} />
}

type DialogSize = "sm" | "md" | "lg" | "xl" | "full"

const sizes: Record<DialogSize, string> = {
  sm: "w-[min(24rem,calc(100vw-2rem))]",
  md: "w-[min(32rem,calc(100vw-2rem))]",
  lg: "w-[min(44rem,calc(100vw-2rem))]",
  xl: "w-[min(64rem,calc(100vw-2rem))]",
  full: "h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)]",
}

interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Popup> {
  size?: DialogSize
  /** Render the close button in the corner. On by default. */
  showClose?: boolean
  /** Classes for the scrim behind the popup. */
  backdropClassName?: string
  container?: React.ComponentProps<typeof DialogPrimitive.Portal>["container"]
}

function DialogContent({
  size = "md",
  showClose = true,
  backdropClassName,
  container,
  className,
  children,
  ...props
}: DialogContentProps) {
  const instant = React.useContext(InstantContext)
  return (
    <DialogPrimitive.Portal container={container}>
      <DialogPrimitive.Backdrop
        data-slot="dialog-backdrop"
        data-dialog-instant={instant ? "" : undefined}
        className={cn(
          "bg-chatcn-scrim fixed inset-0 z-50",
          "ease-chatcn-out transition-opacity duration-220",
          "data-[ending-style]:opacity-0 data-[ending-style]:duration-160 data-[starting-style]:opacity-0",
          "data-[dialog-instant]:transition-none",
          backdropClassName,
        )}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-size={size}
        data-dialog-instant={instant ? "" : undefined}
        className={cn(
          "bg-chatcn-surface text-chatcn-fg shadow-chatcn-xl rounded-chatcn-xl fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "flex max-h-[calc(100dvh-2rem)] origin-center flex-col overflow-hidden outline-none",
          sizes[size],
          "ease-chatcn-out transition-[opacity,scale] duration-220",
          "data-[starting-style]:scale-(--chatcn-enter-scale) data-[starting-style]:opacity-0",
          "data-[ending-style]:scale-(--chatcn-exit-scale) data-[ending-style]:opacity-0 data-[ending-style]:duration-160",
          "motion-reduce:data-[ending-style]:scale-100",
          "data-[dialog-instant]:transition-none",
          // Forced colors strip shadows, so the hairline needs a real outline.
          "forced-colors:outline-1 forced-colors:outline-solid",
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            aria-label="Close"
            data-slot="dialog-close"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "absolute end-3 top-3 pointer-coarse:size-11",
            )}
          >
            <XIcon />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 px-5 pt-5", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex items-center justify-end gap-2 px-5 pt-2 pb-5", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("chatcn-text-16 text-chatcn-fg pe-8 font-semibold text-balance", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("chatcn-text-14 text-chatcn-fg-muted text-pretty", className)}
      {...props}
    />
  )
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

export type { DialogContentProps, DialogProps, DialogSize }
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
