import {
  Bot,
  CalendarClock,
  ChartNoAxesCombined,
  Crown,
  LayoutDashboard,
  ListMusic,
  MessageSquareText,
  Music4,
  Radio,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: 'PRO' | 'NEW';
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function dashboardNav(guildId: string): NavGroup[] {
  const base = `/dashboard/${guildId}`;
  return [
    {
      label: 'General',
      items: [
        {
          label: 'Overview',
          href: `${base}/overview`,
          icon: LayoutDashboard,
          description: 'Health, activity and what needs attention',
        },
        {
          label: 'Analytics',
          href: `${base}/analytics`,
          icon: ChartNoAxesCombined,
          description: 'Growth, heatmaps and command usage',
        },
      ],
    },
    {
      label: 'Music',
      items: [
        {
          label: 'Player',
          href: `${base}/music`,
          icon: ListMusic,
          description: 'Queue, filters and playback',
        },
        {
          label: 'Radio & 24/7',
          href: `${base}/radio`,
          icon: Radio,
          description: 'Stations and always-on channels',
        },
      ],
    },
    {
      label: 'Protection',
      items: [
        {
          label: 'Moderation',
          href: `${base}/moderation`,
          icon: ShieldAlert,
          description: 'Cases, actions and warnings',
        },
        {
          label: 'Auto-Mod',
          href: `${base}/automod`,
          icon: ShieldCheck,
          description: 'Rules that run before you wake up',
        },
        {
          label: 'Logs',
          href: `${base}/logs`,
          icon: ScrollText,
          description: 'Every event and dashboard change',
        },
      ],
    },
    {
      label: 'Community',
      items: [
        {
          label: 'Leveling',
          href: `${base}/leveling`,
          icon: Trophy,
          description: 'XP, rewards and the leaderboard',
        },
        {
          label: 'Welcome',
          href: `${base}/welcome`,
          icon: UserPlus,
          description: 'Greetings, goodbyes and autoroles',
        },
        {
          label: 'Roles',
          href: `${base}/roles`,
          icon: Users,
          description: 'Reaction and button roles',
        },
      ],
    },
    {
      label: 'Automation',
      items: [
        {
          label: 'Schedule',
          href: `${base}/schedule`,
          icon: CalendarClock,
          badge: 'NEW',
          description: 'Commands, messages and events on a timer',
        },
        {
          label: 'AI Chat',
          href: `${base}/ai-chat`,
          icon: Sparkles,
          badge: 'PRO',
          description: 'Replies with a personality you write',
        },
      ],
    },
    {
      label: 'Server',
      items: [
        {
          label: 'Settings',
          href: `${base}/settings`,
          icon: Settings,
          description: 'Language, modules and data',
        },
        {
          label: 'Premium',
          href: `${base}/premium`,
          icon: Crown,
          description: 'Plan, usage and billing',
        },
      ],
    },
  ];
}

export const quickBarItems: { label: string; icon: LucideIcon; segment: string }[] = [
  { label: 'Overview', icon: LayoutDashboard, segment: 'overview' },
  { label: 'Music', icon: Music4, segment: 'music' },
  { label: 'Moderation', icon: ShieldAlert, segment: 'moderation' },
  { label: 'Settings', icon: Settings, segment: 'settings' },
];

export const paletteExtras = [
  { label: 'Add to Discord', href: '/api/discord/invite', icon: Bot },
  { label: 'Switch server', href: '/servers', icon: Users },
  { label: 'AI chat settings', href: 'ai-chat', icon: MessageSquareText },
];
