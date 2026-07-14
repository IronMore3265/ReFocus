// Icon set — Lucide, inlined as SVG.
//
// Lucide gives each icon as an IconNode: [[tag, attrs], ...] describing the
// children of the <svg>. We serialise that to a string because the app builds
// its markup as template literals, not DOM nodes.
//
// The svg is emitted at width/height 1em with stroke="currentColor" (see .icon
// in style.css), so a call site's existing `text-[18px]` still sets the size and
// `text-accent-soft` still sets the colour — font-size and color drive the icon
// exactly the way they drove the icon font this replaced.
import {
  ArrowLeft, ArrowRight, BookCopy, BookOpen, BookmarkCheck, BookmarkPlus,
  Calendar, CalendarClock, Camera, ChartLine, Check, ChevronLeft, ChevronRight,
  ChevronsUp, CircleAlert, CircleCheckBig, CircleUserRound, ClipboardClock, Clock,
  CloudDownload, Download, Ellipsis, Flame, House, Library, ListChecks, Lock, Medal,
  Menu, Minus, Moon, Palette, Pause, Pencil, Play, Plus, RotateCcw, RotateCw, Search,
  Settings, SkipForward, Sparkles, Sun, SunMoon, Timer, Trash2, TrendingUp, Trophy,
  Upload, UserRoundPen, Volume2, Wrench, X,
} from 'lucide';

// Keyed by the app's own vocabulary, not Material's or Lucide's — `flame`, not
// `local_fire_department`; `dictionary`, not `book-copy`. Names that describe
// what the icon means here survive a future change of icon set.
export const ICONS = {
  // chrome + navigation
  menu: Menu,
  back: ArrowLeft,
  forward: ArrowRight,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  close: X,
  user: CircleUserRound,
  settings: Settings,
  home: House,

  // actions
  add: Plus,
  remove: Minus,
  edit: Pencil,
  delete: Trash2,
  check: Check,
  search: Search,
  camera: Camera,
  upload: Upload,
  download: Download,
  'app-update': CloudDownload,
  refresh: RotateCw,
  reset: RotateCcw,

  // reading
  book: BookOpen,          // "Reading" tab, a book in progress
  shelf: Library,          // the Finished shelf — books upright on a shelf
  dictionary: BookCopy,    // the word lookup — a pile of books
  speak: Volume2,          // pronunciation

  // timer
  timer: Timer,
  clock: Clock,
  play: Play,
  pause: Pause,
  skip: SkipForward,
  'timer-options': Ellipsis,
  'preset-save': BookmarkPlus,

  // tasks
  tasks: ListChecks,
  'task-done': CircleCheckBig,
  'priority-high': ChevronsUp,
  calendar: Calendar,
  due: CalendarClock,

  // stats + achievements
  stats: ChartLine,
  streak: Flame,
  trophy: Trophy,   // the Achievements section itself (drawer, stats link, unlock overlay)
  tier: Trophy,     // a rung on the Bronze→Diamond ladder
  medal: Medal,
  locked: Lock,
  'trending-up': TrendingUp,

  // theme
  light: Sun,
  dark: Moon,
  'theme-auto': SunMoon,
  theme: Palette,   // the theme choice as a whole, not one of its options

  // onboarding badges
  'profile-name': UserRoundPen,
  rhythm: ClipboardClock,   // the focus/break lengths you set up front

  // misc
  sparkle: Sparkles,
  wrench: Wrench,
  saved: BookmarkCheck,
  error: CircleAlert,
};

const attrs = (o) => Object.entries(o)
  .map(([k, v]) => ` ${k}="${v}"`)
  .join('');

// A name that isn't in the registry would otherwise render as nothing at all —
// an icon silently vanishing off a button. Shout, and draw a placeholder box so
// it's visible in the UI rather than only in the console.
function missing(name) {
  console.warn(`[icons] unknown icon: "${name}"`);
  return '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6m0-6-6 6"/>';
}

export function iconSvg(name, cls = '') {
  const node = ICONS[name];
  const body = node
    ? node.map(([tag, a]) => `<${tag}${attrs(a)}/>`).join('')
    : missing(name);
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}
