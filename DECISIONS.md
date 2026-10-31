# DECISIONS.md - CouplesHub Premium Rebuild

## AUDIT RESULTS

### Current Stack
- **Framework**: Next.js 14 App Router (keep)
- **Auth**: NextAuth.js v4 with Discord OAuth (keep, works)
- **Database**: Prisma + PostgreSQL (keep)
- **Styling**: Tailwind CSS (keep)
- **Icons**: Lucide React (keep)
- **Motion**: Framer Motion (keep)
- **Real-time**: Pusher (keep for fallback, add WebSocket for bot sync)

### Current Problems
1. **Brand inconsistency**: Mixed "CAPITAL" and "CouplesHub" → **Decision: Use "CouplesHub" everywhere**
2. **Generic design**: Dark mode but looks like any SaaS → **Decision: Implement "CROWN JEWEL" design system**
3. **Missing pages**: No /commands, /docs, /status dedicated pages → **Decision: Build all public pages**
4. **Dashboard incomplete**: Only server selector, no actual settings → **Decision: Build full dashboard with all modules**
5. **No design tokens**: Colors hardcoded → **Decision: Create proper design system with CSS variables**
6. **Bot integration**: Dashboard doesn't save settings → **Decision: Build full API layer with bot sync

### Architecture Decision
- **Dashboard ↔ Bot communication**: Database-first (shared PostgreSQL), supplemented with Pusher for real-time updates
- **API layer**: One typed client with Zod validation, server-side permission checks
- **Dashboard state**: TanStack Query for data fetching, Zustand for local state

## DESIGN PLAN: "CROWN JEWEL"

### Named Palette (CSS Variables)
```css
--void: #05070C;           /* Page background */
--obsidian: #0A0F18;       /* Surface */
--obsidian-raised: #111926; /* Elevated surface */
--hairline: rgba(255,255,255,0.07);
--emerald: #19D68F;         /* Primary accent */
--emerald-deep: #0B7A55;   /* Glass fills */
--emerald-glow: rgba(25,214,143,0.35);
--champagne: #E9C985;       /* Premium highlight */
--mist: #E8EDF5;            /* Primary text */
--mist-dim: #93A0B5;       /* Secondary text */
--mist-faint: #6F7B93;     /* Tertiary text */
--danger: #FF5C7A;         /* Error */
--warning: #FFB84D;        /* Warning */
--info: #5CC8FF;           /* Info */
```

### Typography
- **Display**: Bricolage Grotesque (hero, feature titles)
- **UI/Body**: Instrument Sans (dashboard, forms)
- **Mono**: JetBrains Mono (commands, code)
- **No Fira Code/Code**: Replace with JetBrains Mono

### ASCII Wireframes

```
HERO (1440x900)
┌─────────────────────────────────────────────────────────┐
│  [Crown] CouplesHub    Features Commands Pricing Docs   │  ← Glass navbar
├─────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────┐   │
│  │ Bricolage Grotesque │  │ 3D Emerald Gem Scene    │   │
│  │                     │  │ (react-three-fiber)    │   │
│  │ Command your        │  │ + orbiting tiles       │   │
│  │ community with      │  │ + parallax             │   │
│  │ elegance.           │  │ + light sweep          │   │
│  │                     │  │                        │   │
│  │ [Add to Discord]   │  │ [Now Playing Card]     │   │
│  │ [Open Dashboard]    │  │ with equalizer        │   │
│  └─────────────────────┘  └─────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────┘

DASHBOARD SHELL
┌──────────┬────────────────────────────────────────────────┐
│ Sidebar  │ Top bar: [Server switcher] [⌘] [🔔] [User]   │
│          ├────────────────────────────────────────────────┤
│ ○       │                                               │
│ ├ General│ Page Title                                  │
│ │ ○ Overview│ One-line description                      │
│ │ ○ Analytics│ [Primary action]                         │
│ │         │                                               │
│ ├ Music   │                                               │
│ │ ○ Player│ Content area with glass cards                │
│ │ ○ Radio│                                               │
│ │ ○ 24/7  │                                               │
│         │                                               │
│ ├ Protection│                                         │
│ │ ○ Moderation│                                       │
│ │ ○ Auto-Mod│                                        │
└──────────┴────────────────────────────────────────────────┘
```

### Motion Principles
- **Entrance**: Staggered mask reveal for cards, blur-in for hero, scale for buttons
- **Interaction**: Magnetic buttons, 3D tilt on hover, cursor spotlight
- **Transitions**: Page transitions via View Transitions API, smooth scroll with Lenis
- **Duration**: 150-700ms, cubic-bezier(0.22,1,0.36,1)
- **Stagger**: 40-80ms between elements

### Anti-Template Decisions
- **NO "01 / 02 / 03" labels** on non-sequential content → Use icon badges instead
- **NO ALL-CAPS eyebrows** → Use sentence case with emerald accent
- **NO one green word per headline** → Use gradient or emerald underline
- **NO identical cards** → Bento grid with different sizes and treatments
- **NO purple/blue default gradients** → Emerald-to-teal only
- **NO Inter/Roboto** → Bricolage Grotesque + Instrument Sans

## EXECUTION PHASES

### Phase 1: Foundation (STARTING NOW)
- Install: Bricolage Grotesque, Instrument Sans, JetBrains Mono
- Install: @radix-ui/* primitives, @tanstack/react-query, zustand, react-hook-form, zod
- Install: three, @react-three/fiber, drei, @react-three/postprocessing, lenis
- Create: Design tokens in CSS variables
- Create: Base components (Button, Input, Select, Card, etc.)
- Create: Motion primitives (Reveal, Magnetic, Spotlight, Aurora)
- Create: /design-system page

### Phase 2: Marketing
- Landing page with 3D hero
- Commands page
- Pricing page
- Docs with MDX
- Status page
- Legal pages
- 404/500

### Phase 3: Access
- Login page with split screen
- Server selector
- API client layer
- Invite flow

### Phase 4: Dashboard A
- Shell with sidebar
- Command palette
- Overview page
- Music player with full controls
- Radio and 24/7

### Phase 5: Dashboard B
- Moderation with cases
- Auto-Mod with rules
- Leveling system
- Schedule
- AI Chat
- Settings

### Phase 6: Extended
- Welcome/Goodbye
- Roles
- Logs
- Analytics
- Premium

### Phase 7: Polish
- Motion review
- Responsive (360-2560)
- Accessibility (WCAG AA)
- Performance (Lighthouse 85+)
- SEO
- README

## ASSUMPTIONS
- Bot hosting is separate (Railway/Render)
- Dashboard is read-only for bot settings (writes via API)
- Real-time sync via Pusher WebSocket (bot → dashboard)
- Brand name is "CouplesHub" with Crown logo
- No live payments (Premium page is UI-only unless keys added)
