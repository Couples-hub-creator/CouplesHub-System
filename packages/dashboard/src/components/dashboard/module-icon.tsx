import {
  BarChart3,
  Bot,
  Cake,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  Gift,
  LifeBuoy,
  Lightbulb,
  Lock,
  Mic,
  Moon,
  Music4,
  ScrollText,
  Shield,
  Sparkles,
  Star,
  Tag,
  Terminal,
  TrendingUp,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
  moon: Moon,
  sparkles: Sparkles,
  robot: Bot,
  cake: Cake,
  terminal: Terminal,
  coins: Coins,
  gift: Gift,
  users: Users,
  'trending-up': TrendingUp,
  scroll: ScrollText,
  shield: Shield,
  music: Music4,
  'bar-chart': BarChart3,
  clock: Clock,
  tag: Tag,
  calendar: CalendarDays,
  lock: Lock,
  star: Star,
  lightbulb: Lightbulb,
  mic: Mic,
  lifebuoy: LifeBuoy,
  wrench: Wrench,
  'check-circle': CheckCircle2,
};

export function ModuleIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={cn('size-4', className)} aria-hidden />;
}
