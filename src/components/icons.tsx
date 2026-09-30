import {
  ChevronDown,
  ChevronRight,
  Clock,
  Crown,
  Film,
  Globe,
  Image as ImageIcon,
  Menu,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  Sparkles,
  Square,
  Video,
  X,
  Zap,
  type LucideProps,
} from 'lucide-react';

export function ChevronDownIcon(props: LucideProps) {
  return <ChevronDown {...props} />;
}

export function ChevronRightIcon(props: LucideProps) {
  return <ChevronRight {...props} />;
}

export function GlobeIcon(props: LucideProps) {
  return <Globe {...props} />;
}

export function MenuIcon(props: LucideProps) {
  return <Menu {...props} />;
}

export function CloseIcon(props: LucideProps) {
  return <X {...props} />;
}

export function PlusIcon(props: LucideProps) {
  return <Plus {...props} />;
}

export function SparklesIcon(props: LucideProps) {
  return <Sparkles {...props} />;
}

export function ImageModeIcon(props: LucideProps) {
  return <ImageIcon {...props} />;
}

export function VideoModeIcon(props: LucideProps) {
  return <Video {...props} />;
}

/** Two circles — left dashed, right solid (Motion transfer) */
export function MotionTransferIcon({
  className,
  size = 16,
  ...props
}: LucideProps) {
  const s = typeof size === 'number' ? size : 16;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={s}
      height={s}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
      {...props}
    >
      <circle cx="5.5" cy="8" r="3.25" strokeDasharray="2 1.75" />
      <circle cx="10.5" cy="8" r="3.25" />
    </svg>
  );
}

/** Overlapping frames with corner marks (Objects swap) */
export function ObjectsSwapIcon({
  className,
  size = 16,
  ...props
}: LucideProps) {
  const s = typeof size === 'number' ? size : 16;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={s}
      height={s}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
      aria-hidden
      {...props}
    >
      <rect x="2.25" y="3.5" width="7.5" height="7.5" rx="1.25" />
      <path d="M10.5 6.25h1.75a1.25 1.25 0 0 1 1.25 1.25v5.25a1.25 1.25 0 0 1-1.25 1.25H7.5A1.25 1.25 0 0 1 6.25 12.75V11" />
      <path d="M3.5 5.25v-1M5.25 3.5h-1" />
      <path d="M12.5 13.5v-1M10.75 12.75h1" />
    </svg>
  );
}

export function ZapIcon(props: LucideProps) {
  return <Zap {...props} />;
}

export function CrownIcon(props: LucideProps) {
  return <Crown {...props} />;
}

export function ClockIcon(props: LucideProps) {
  return <Clock {...props} />;
}

export function FilmIcon(props: LucideProps) {
  return <Film {...props} />;
}

export function RectangleHorizontalIcon(props: LucideProps) {
  return <RectangleHorizontal {...props} />;
}

export function RectangleVerticalIcon(props: LucideProps) {
  return <RectangleVertical {...props} />;
}

export function SquareIcon(props: LucideProps) {
  return <Square {...props} />;
}

export function RaphaelLogo({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src="/logo-64.webp"
      alt="Raphael AI"
      width={size}
      height={size}
      className={className}
    />
  );
}
