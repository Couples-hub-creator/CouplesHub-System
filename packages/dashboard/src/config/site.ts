/**
 * Couples Hub — single source of truth for brand, links, plans and public copy.
 * Every name on the site comes from here. No other brand strings anywhere.
 */

export const siteConfig = {
  name: 'Couples Hub',
  tagline: 'Discord, in command',
  description:
    'Couples Hub is the command room for your Discord community: studio-grade music, firm moderation, leveling and automation — controlled from one beautiful dashboard.',
  // Production fallback. Local development overrides this in .env.local.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dashboard-couples-hub.vercel.app',
  ogImage: '/opengraph-image',
  links: {
    invite: process.env.NEXT_PUBLIC_INVITE_URL ?? '/api/discord/invite',
    support: process.env.NEXT_PUBLIC_SUPPORT_URL ?? '/docs',
    login: '/login',
    dashboard: '/servers',
  },
  nav: [
    { label: 'Features', href: '/#features' },
    { label: 'Commands', href: '/commands' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Docs', href: '/docs' },
    { label: 'Status', href: '/status' },
  ],
  footer: {
    product: [
      { label: 'Features', href: '/#features' },
      { label: 'Commands', href: '/commands' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Premium', href: '/pricing#premium' },
    ],
    resources: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Status', href: '/status' },
      { label: 'Support', href: process.env.NEXT_PUBLIC_SUPPORT_URL ?? '/docs' },
    ],
    legal: [
      { label: 'Terms of service', href: '/terms' },
      { label: 'Privacy policy', href: '/privacy' },
    ],
  },
  pricing: {
    currency: '$',
    plans: [
      {
        id: 'free' as const,
        name: 'Free',
        monthly: 0,
        yearly: 0,
        blurb: 'A complete core for a growing server.',
        cta: 'Add to Discord',
        features: [
          'Music player with queue and filters',
          'Radio stations and 24/7 mode',
          'Moderation: ban, kick, timeout, warnings',
          'Auto-Mod: spam, links and raid shields',
          'Leveling with role rewards',
          'Community support',
        ],
      },
      {
        id: 'premium' as const,
        name: 'Premium',
        monthly: 4.99,
        yearly: 49.99,
        blurb: 'The full command room, unlocked.',
        cta: 'Go Premium',
        features: [
          'Everything in Free',
          'AI chat with custom personality',
          'Schedule: timed commands and messages',
          'Unlimited auto-mod rules',
          'Priority support',
        ],
      },
    ] as const,
  },
  /** Never invent testimonials — section renders only when this list is non-empty. */
  testimonials: [] as { quote: string; author: string; role: string }[],
} as const;

export type SiteConfig = typeof siteConfig;
export type PlanId = (typeof siteConfig.pricing.plans)[number]['id'];
