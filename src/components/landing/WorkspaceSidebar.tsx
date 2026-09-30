import { useMemo, useState } from 'react';
import {
  Boxes,
  ChevronDown,
  Clapperboard,
  Eraser,
  Expand,
  FileVideo,
  Image as ImageIcon,
  ImagePlus,
  LayoutGrid,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sparkles,
  Type,
  Video,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { Link, usePathname } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';
import {
  WORKSPACE_NAV,
  type WorkspaceBadge,
  type WorkspaceCategory,
  type WorkspaceModel,
  type WorkspaceTool,
} from '@/components/landing/content';
import { LocaleSelector } from '@/components/locale-selector';

const CATEGORY_ICONS: Record<WorkspaceCategory['icon'], LucideIcon> = {
  image: ImageIcon,
  video: Video,
  sparkles: Sparkles,
  wrench: Wrench,
  boxes: Boxes,
};

const TOOL_ICONS: Record<WorkspaceTool['icon'], LucideIcon | 'upscaler'> = {
  type: Type,
  'image-plus': ImagePlus,
  'file-video': FileVideo,
  clapperboard: Clapperboard,
  'layout-grid': LayoutGrid,
  expand: Expand,
  eraser: Eraser,
  upscaler: 'upscaler',
  boxes: Boxes,
  mic: Mic,
};

function UpscalerIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}

function NavBadge({ children }: { children: WorkspaceBadge | string }) {
  const sale =
    String(children).includes('%') || String(children).startsWith('-');
  return (
    <span
      className={cn(
        'inline-flex h-[17px] shrink-0 items-center rounded-[4px] px-[5px] text-[8px] leading-none font-black tracking-[0.04em] uppercase',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]',
        sale ? 'bg-[#e05256] text-white' : 'bg-primary/20 text-primary'
      )}
    >
      {children}
    </span>
  );
}

function isPathActive(pathname: string, href: string) {
  if (!href || href === '#') return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function categoryContainsPath(category: WorkspaceCategory, pathname: string) {
  if (isPathActive(pathname, category.href)) return true;
  if (category.modelSections) {
    return (
      WORKSPACE_NAV.imageModels.some((m) => isPathActive(pathname, m.href)) ||
      WORKSPACE_NAV.videoModels.some((m) => isPathActive(pathname, m.href))
    );
  }
  return (
    category.children?.some((c) => isPathActive(pathname, c.href)) ?? false
  );
}

function ToolIcon({
  name,
  className,
}: {
  name: WorkspaceTool['icon'];
  className?: string;
}) {
  const icon = TOOL_ICONS[name];
  if (icon === 'upscaler') return <UpscalerIcon className={className} />;
  const Icon = icon;
  return <Icon className={className} />;
}

function ModelRow({
  model,
  collapsed,
}: {
  model: WorkspaceModel;
  collapsed?: boolean;
}) {
  if (collapsed) return null;
  return (
    <Link
      href={model.href}
      data-workspace-sidebar-item-id={`model:${model.id}`}
      data-workspace-sidebar-item-type="model"
      className="text-foreground/58 hover:text-foreground/88 relative flex items-center gap-1.5 rounded-md py-1.5 pr-2 pl-2 text-[12px] transition-colors hover:bg-white/[0.04]"
    >
      {model.logo ? (
        <img
          src={model.logo}
          alt=""
          width={14}
          height={14}
          className="h-3.5 w-3.5 shrink-0 rounded-[3px] object-contain"
        />
      ) : (
        <span className="h-3.5 w-3.5 shrink-0 text-[13px] leading-none">
          {model.emoji ?? '•'}
        </span>
      )}
      <span className="min-w-0 flex-1 leading-4 whitespace-nowrap">
        {model.label}
        {model.badge ? (
          <span className="ml-1 inline-flex shrink-0 items-center gap-0.5 align-middle">
            <NavBadge>{model.badge}</NavBadge>
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function NestedRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-3 space-y-0.5 border-l border-white/[0.08] pl-3">
      {children}
    </div>
  );
}

function ToolRow({ tool, active }: { tool: WorkspaceTool; active: boolean }) {
  const className = cn(
    'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] transition-colors',
    active
      ? 'bg-primary/10 text-primary'
      : 'text-foreground/58 hover:bg-white/[0.04] hover:text-foreground/88'
  );

  const inner = (
    <>
      <ToolIcon name={tool.icon} className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="line-clamp-2 min-w-0 flex-1 leading-4 break-words whitespace-normal">
        {tool.label}
      </span>
      {tool.badge ? <NavBadge>{tool.badge}</NavBadge> : null}
    </>
  );

  if (tool.external) {
    return (
      <a
        href={tool.href}
        target="_blank"
        rel="noopener noreferrer"
        data-workspace-sidebar-item-id={`tool:${tool.id}`}
        data-workspace-sidebar-item-type="tool"
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      href={tool.href}
      data-workspace-sidebar-item-id={`tool:${tool.id}`}
      data-workspace-sidebar-item-type="tool"
      className={className}
    >
      {inner}
    </Link>
  );
}

function CategoryBlock({
  category,
  open,
  onToggle,
  collapsed,
  pathname,
}: {
  category: WorkspaceCategory;
  open: boolean;
  onToggle: () => void;
  collapsed: boolean;
  pathname: string;
}) {
  const Icon = CATEGORY_ICONS[category.icon];
  const hasPanel = Boolean(category.children?.length || category.modelSections);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Link
          href={category.href === '#' ? pathname : category.href}
          data-workspace-sidebar-item-id={`category:${category.id}`}
          data-workspace-sidebar-item-type="category"
          title={collapsed ? category.label : undefined}
          className={cn(
            'group/nav relative flex h-10 min-w-0 flex-1 items-center rounded-lg px-2.5 py-[9px] text-[13px] transition-all duration-150',
            collapsed ? 'justify-center gap-0' : 'justify-start gap-2.5',
            'text-foreground/80 hover:text-foreground hover:bg-white/[0.04]'
          )}
          onClick={(e) => {
            if (category.href === '#') e.preventDefault();
          }}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed ? (
            <span className="truncate">{category.label}</span>
          ) : null}
        </Link>
        {!collapsed && hasPanel ? (
          <button
            type="button"
            data-workspace-sidebar-item-id={`category_toggle:${category.id}`}
            data-workspace-sidebar-item-type="category_toggle"
            aria-label={`Toggle ${category.label}`}
            onClick={onToggle}
            className="text-foreground/40 hover:bg-muted/30 hover:text-foreground/70 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          </button>
        ) : null}
      </div>

      {!collapsed && open && category.children ? (
        <NestedRail>
          {category.children.map((tool) => (
            <ToolRow
              key={tool.id}
              tool={tool}
              active={isPathActive(pathname, tool.href)}
            />
          ))}
        </NestedRail>
      ) : null}

      {!collapsed && open && category.modelSections ? (
        <NestedRail>
          <div className="text-foreground/52 px-2 pt-0 pb-0.5 text-[10px] font-semibold tracking-wider uppercase first:pt-0">
            Image Models
          </div>
          {WORKSPACE_NAV.imageModels.map((model) => (
            <ModelRow key={model.id} model={model} />
          ))}
          <div className="text-foreground/52 px-2 pt-2 pb-0.5 text-[10px] font-semibold tracking-wider uppercase">
            Video Models
          </div>
          {WORKSPACE_NAV.videoModels.map((model) => (
            <ModelRow key={model.id} model={model} />
          ))}
        </NestedRail>
      ) : null}
    </div>
  );
}

export function WorkspaceSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const defaultOpen = useMemo(() => {
    const open = new Set<string>();
    for (const cat of WORKSPACE_NAV.categories) {
      if (categoryContainsPath(cat, pathname)) open.add(cat.id);
    }
    if (open.size === 0) {
      open.add('image');
      open.add('models');
    } else if (!open.has('models') && pathname.includes('text-to-image')) {
      open.add('models');
    }
    return open;
  }, [pathname]);

  const [openIds, setOpenIds] = useState<Set<string>>(defaultOpen);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'border-border/15 hidden h-[100dvh] flex-col border-r bg-[rgba(93,70,56,0.16)] backdrop-blur-xl',
        'transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:flex lg:shrink-0',
        collapsed ? 'lg:w-[68px]' : 'lg:w-[240px]',
        className
      )}
    >
      <div className="border-border/15 flex h-14 shrink-0 items-center justify-between border-b px-2 lg:px-3">
        <Link
          href="/"
          className={cn(
            'flex items-center overflow-hidden',
            collapsed ? 'justify-center' : 'justify-center lg:gap-2.5'
          )}
        >
          <img
            src="/logo.webp"
            alt="Raphael"
            width={24}
            height={24}
            className="h-6 w-6 shrink-0"
          />
          {!collapsed ? (
            <span className="text-foreground hidden text-[15px] font-semibold whitespace-nowrap lg:inline">
              Raphael AI
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((v) => !v)}
          className="text-foreground/30 hover:bg-muted/40 hover:text-foreground/60 flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-2 py-4 lg:px-3 lg:py-5">
        <div className="space-y-1">
          <Link
            href={WORKSPACE_NAV.createHref}
            data-workspace-sidebar-item-id="create"
            data-workspace-sidebar-item-type="create"
            title={collapsed ? 'Create' : undefined}
            className={cn(
              'group/create-entry text-foreground/68 hover:bg-muted/30 hover:text-foreground/90 mb-3 flex h-10 w-full shrink-0 items-center rounded-lg bg-white/[0.05] px-2.5 text-[13px] font-medium transition-colors',
              collapsed ? 'justify-center gap-0' : 'justify-center gap-2.5'
            )}
          >
            <Plus className="text-primary/80 h-[18px] w-[18px] shrink-0" />
            {!collapsed ? <span>Create</span> : null}
          </Link>

          <div className="space-y-1">
            {WORKSPACE_NAV.categories.map((category) => (
              <CategoryBlock
                key={category.id}
                category={category}
                open={openIds.has(category.id)}
                onToggle={() => toggle(category.id)}
                collapsed={collapsed}
                pathname={pathname}
              />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-border/15 shrink-0 border-t bg-[rgba(93,70,56,0.16)] px-3 py-3 backdrop-blur-xl">
        {!collapsed ? (
          <div className="mb-2.5">
            <Link
              href="/pricing"
              aria-label="Upgrade, -50% off"
              className={cn(
                'group relative flex h-9 w-full items-center justify-center gap-1.5 overflow-visible rounded-xl px-3 text-[13px] font-semibold text-[#24170f]',
                'bg-[linear-gradient(135deg,#f0b06b,#d77b42)]',
                'shadow-[0_8px_18px_rgba(221,126,66,0.18)] transition-[transform,filter,box-shadow]',
                'hover:shadow-[0_10px_22px_rgba(221,126,66,0.24)] hover:brightness-105 active:scale-[0.98]'
              )}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Upgrade</span>
              <span className="pointer-events-none absolute -top-3 -right-1.5 z-20 inline-flex h-4 min-w-[2.6rem] items-center justify-center rounded-[5px] bg-[#e05256] px-1.5 text-[9px] leading-none font-black whitespace-nowrap text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
                -50%
              </span>
            </Link>
          </div>
        ) : null}

        <div
          className={cn(
            'flex items-center gap-2',
            collapsed ? 'flex-col' : 'justify-end'
          )}
        >
          {!collapsed ? <div className="min-w-0 flex-1" /> : null}
          <LocaleSelector
            variant="icon"
            className="text-foreground/40 hover:bg-muted/40 hover:text-foreground/70 flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          />
          {!collapsed ? (
            <Link
              href="/sign-in"
              className="relative inline-flex h-10 items-center justify-center rounded-[10px] bg-[rgb(204,144,92)] px-4 text-sm font-medium text-[rgb(247,246,243)] transition-colors hover:bg-[rgb(190,130,80)]"
            >
              Sign In
            </Link>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground relative flex min-h-screen">
      <WorkspaceSidebar className="z-20" />
      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-x-clip">
        {children}
      </div>
    </div>
  );
}
