import {
  AppWindow,
  ChevronRight, BookOpen, Braces, Clock, Copy, Cpu, Database, Download, Eye,
  Fingerprint, Frame, Globe, Info, Keyboard, KeyRound, Layers,
  Megaphone, Monitor, MousePointer2, Paintbrush, RadioTower, RefreshCw, Send,
  ArrowUp, Check, Server, Shield, SlidersHorizontal, Thermometer, type LucideIcon,
} from "lucide-react";

/**
 * Semantic names mapped onto Lucide, so call sites stay descriptive and the
 * icon set stays visually consistent.
 */
/** Lucide dropped brand marks, so the GitHub glyph is drawn here. */
const GithubMark: LucideIcon = ((allProps: Record<string, unknown>) => {
  // `absoluteStrokeWidth` is a Lucide prop; React would pass it to the DOM.
  const { absoluteStrokeWidth, ...props } = allProps;
  void absoluteStrokeWidth;
  return (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 19.9 5a4.9 4.9 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.7 12.7 0 0 0-6.6 0C6.9 1.1 5.8 1.4 5.8 1.4A4.9 4.9 0 0 0 5.7 5a5.2 5.2 0 0 0-1.4 3.7c0 5.2 3.2 6.4 6.2 6.7a3.4 3.4 0 0 0-.9 2.6V22"
      strokeLinecap="round"
      strokeLinejoin="round"
      />
    </svg>
  );
}) as unknown as LucideIcon;

const ICONS = {
  server: Server,
  globe: Globe,
  fingerprint: Fingerprint,
  browser: AppWindow,
  chip: Cpu,
  sliders: SlidersHorizontal,
  key: KeyRound,
  eye: Eye,
  info: Info,
  send: Send,
  code: Braces,
  shield: Shield,
  display: Monitor,
  clock: Clock,
  layers: Layers,
  broadcast: RadioTower,
  thermometer: Thermometer,
  frame: Frame,
  megaphone: Megaphone,
  keyboard: Keyboard,
  download: Download,
  copy: Copy,
  refresh: RefreshCw,
  brush: Paintbrush,
  book: BookOpen,
  github: GithubMark,
  database: Database,
  pointer: MousePointer2,
  check: Check,
  up: ArrowUp,
  chevron: ChevronRight,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      className={className ?? "size-4 shrink-0"}
      strokeWidth={1.75}
      absoluteStrokeWidth
      aria-hidden="true"
    />
  );
}
