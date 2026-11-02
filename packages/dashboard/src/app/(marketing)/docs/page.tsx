import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Documentation',
  description: `Set up ${siteConfig.name}, configure every module, and run it yourself.`,
  alternates: { canonical: '/docs' },
};

const SECTIONS = [
  { id: 'quick-start', label: 'Quick start' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'music', label: 'Music and radio' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'automod', label: 'Auto-mod' },
  { id: 'leveling', label: 'Leveling' },
  { id: 'welcome', label: 'Welcome and roles' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'ai-chat', label: 'AI chat' },
  { id: 'premium', label: 'Premium' },
  { id: 'self-hosting', label: 'Self-hosting' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'bot-api', label: 'Bot control API' },
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 border-t border-hairline pt-9 font-display text-title-1 font-semibold text-mist first:border-t-0 first:pt-0">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 font-display text-lg font-semibold text-mist">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-mist-dim">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[3px] border border-hairline bg-white/[0.04] px-1 py-0.5 font-mono text-[0.85em] text-mist">
      {children}
    </code>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-md border border-hairline bg-void/70 p-3.5 font-mono text-[11px] leading-relaxed text-mist-dim">
      {children}
    </pre>
  );
}

function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-md border border-emerald/20 bg-emerald/[0.05] px-3.5 py-3">
      <p className="text-xs font-semibold text-emerald">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-mist-dim">{children}</p>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-shell px-gutter pb-24 pt-28 sm:pt-32">
      <div className="max-w-2xl">
        <p className="text-xs font-medium text-emerald">Documentation</p>
        <h1 className="mt-2 font-display text-display-2 font-semibold text-mist">
          Everything Couples Hub does, and how to set it up.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-mist-dim">
          Written for the person who runs the server, not just the person who wrote the code. If a step is
          missing, the support page is one click away.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <a href={siteConfig.links.invite} target="_blank" rel="noreferrer">
              Add to Discord
              <ArrowUpRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/commands">Command reference</Link>
          </Button>
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="Documentation sections" className="sticky top-24">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-mist-faint">
              <BookOpen className="size-3" />
              Contents
            </p>
            <ol className="space-y-1 border-l border-hairline pl-3">
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block py-0.5 text-xs text-mist-dim transition-colors hover:text-emerald"
                  >
                    <span className="mr-1.5 font-mono text-[10px] text-mist-faint">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0 space-y-9">
          <section>
            <H2 id="quick-start">Quick start</H2>
            <P>
              Add Couples Hub with the invite button. Discord asks which server and which permissions. Couples Hub
              needs Manage Roles, Manage Channels, Kick Members, Ban Members, Moderate Members, Manage
              Messages and Connect/Speak for music. It does not need Administrator.
            </P>
            <P>
              Run <Code>/help</Code> in the server to confirm it is online. Then open the dashboard, sign in
              with Discord, and pick the server. You will only see servers where you have Manage Server or
              Administrator.
            </P>
            <Callout title="Permissions are checked twice">
              The dashboard checks your Discord permissions on every API call. Hiding a button in the UI is
              never the only protection.
            </Callout>
          </section>

          <section>
            <H2 id="dashboard">Dashboard</H2>
            <P>
              The dashboard is the control room. Each server has its own sidebar: overview, analytics,
              player, radio, moderation, auto-mod, logs, leveling, welcome, roles, schedule, AI chat,
              settings and premium.
            </P>
            <P>
              Changes are saved explicitly. A sticky bar appears when a form is dirty; saving writes to the
              database and shows a toast. If the write fails, the form rolls back to the last saved values
              and tells you what failed.
            </P>
            <H3>Modules</H3>
            <P>
              Settings → Modules turns whole features on or off. Turning a module off does not delete its
              configuration. Turn it back on and everything is where you left it.
            </P>
            <H3>Danger zone</H3>
            <P>
              Reset modules re-enables every module and deletes custom auto-mod rules. Delete server data
              removes everything Couples Hub stored for that server. Both require typing a confirmation word and
              both are rate-limited.
            </P>
          </section>

          <section>
            <H2 id="music">Music and radio</H2>
            <P>
              Join a voice channel and run <Code>/play lofi hip hop</Code> or paste a URL. Couples Hub joins,
              queues the track and stays until the queue empties (unless 24/7 is on).
            </P>
            <H3>Player controls</H3>
            <P>
              The Player page shows the current track, position, queue and filters. Pause, skip, shuffle,
              loop and volume write to the bot through its control API. Drag the queue to reorder, or remove
              a single track. If the bot control API is not configured, the page says so instead of showing
              dead buttons.
            </P>
            <H3>DJ role</H3>
            <P>
              Set a DJ role in Settings → Music. When DJ-only is on, only members with that role (or Manage
              Server) can skip, stop or change volume. Vote skip lets everyone else skip together after a
              threshold of votes.
            </P>
            <H3>24/7 and radio</H3>
            <P>
              Radio &amp; 24/7 keeps Couples Hub in one voice channel around the clock and reconnects after a
              restart. Add custom stations with a direct stream URL. The dashboard validates the URL before
              saving; playback is still handled by Lavalink.
            </P>
            <Block>{`/play <query or url>
/radio <station>
/247 <on|off> [channel]
/volume <0-150>`}</Block>
          </section>

          <section>
            <H2 id="moderation">Moderation</H2>
            <P>
              Every action can be recorded as a case. Cases have a number, a type, the member, the moderator,
              a reason and an optional expiry. The dashboard lists them with search and type filters.
            </P>
            <P>
              Warnings escalate automatically once a member reaches the threshold in Settings → Moderation.
              The default mute length is used by <Code>/mute</Code> when no duration is given, and ban delete
              days controls how much recent message history is removed with a ban.
            </P>
            <Callout title="Dashboard records, Discord applies">
              Opening a case in the dashboard writes the record. To actually timeout, kick or ban someone,
              run the matching slash command — the bot holds the gateway connection, not the website.
            </Callout>
            <Block>{`/warn <user> <reason>
/timeout <user> <duration> [reason]
/kick <user> [reason]
/ban <user> [reason] [delete-days]
/warnings [user]
/purge <amount> [user]`}</Block>
          </section>

          <section>
            <H2 id="automod">Auto-mod</H2>
            <P>
              Auto-mod runs before a moderator sees the message. Add a rule, choose what triggers it, the
              punishment, a threshold and a time window. Every rule can ignore specific channels and roles.
            </P>
            <P>
              The bad-word rule takes your own list. The raid rule watches join velocity. New-account holds
              accounts younger than the threshold. Rules are saved together; the save bar shows how many
              changes are pending.
            </P>
            <H3>Punishments</H3>
            <P>
              Delete removes the message. Warn records a case. Mute times the member out. Kick and ban remove
              them. Start with delete or warn, then escalate once you know the false-positive rate.
            </P>
          </section>

          <section>
            <H2 id="leveling">Leveling</H2>
            <P>
              Members earn XP for messages and voice minutes. Both have cooldowns so spam does not win.
              Ignored channels and roles earn nothing. The leaderboard is live in the dashboard and available
              in Discord with <Code>/leaderboard</Code>.
            </P>
            <P>
              Role rewards attach a role to a level. Drag rewards to reorder, edit the level inline, or
              remove one. Couples Hub adds the role when the level is reached; it does not remove roles when
              someone drops (levels do not go down).
            </P>
            <P>
              The level-up message can be templated with <Code>{'{user}'}</Code> and <Code>{'{level}'}</Code>.
              Leave the template empty to use the default line.
            </P>
          </section>

          <section>
            <H2 id="welcome">Welcome and roles</H2>
            <P>
              Pick a welcome channel and write a message. Variables: <Code>{'{user}'}</Code>,{' '}
              <Code>{'{server}'}</Code>, <Code>{'{memberCount}'}</Code>. The preview substitutes sample values
              so you can check the wording before it goes live. Auto roles are added on join.
            </P>
            <P>
              Reaction roles and button roles attach a role to an existing message. Paste the channel and
              message ID, choose the emoji or button label, and pick the role. Members self-assign; the bot
              does the rest.
            </P>
            <Callout title="Role hierarchy">
              Couples Hub can only assign roles below its own highest role. If a role is not being added, move
              the Couples Hub role above it in Discord → Server Settings → Roles.
            </Callout>
          </section>

          <section>
            <H2 id="schedule">Schedule</H2>
            <P>
              Schedule runs a command, sends a message, or fires an event on a timer. Pick once, daily,
              weekly, monthly or a custom cron expression, then choose the timezone. The bot evaluates the
              schedule in that timezone, not the server&apos;s clock.
            </P>
            <Block>{`0 9 * * 1-5    # 09:00, Monday to Friday
0 0 1 * *      # midnight on the first of each month
*/30 * * * *   # every 30 minutes`}</Block>
            <P>
              Run now queues an immediate run without changing the schedule. Pausing keeps the task and its
              history. Every run is recorded with a status and a detail line.
            </P>
          </section>

          <section>
            <H2 id="ai-chat">AI chat</H2>
            <P>
              AI chat is off until you enable it and choose at least one channel. It can answer only on
              mention or on every message. Pick a personality preset or write your own instructions, set
              creativity and reply length, and decide whether it remembers recent messages.
            </P>
            <P>
              Rate limits are per channel per hour. Blocked topics make the assistant decline instead of
              guessing. Monthly usage is shown on the Premium page and resets each period.
            </P>
            <Callout title="What gets sent">
              Only the messages in enabled channels that trigger a reply are processed by the AI provider
              configured by the operator. Turn AI chat off and nothing is sent. See the privacy policy for
              the full data list.
            </Callout>
          </section>

          <section>
            <H2 id="premium">Premium</H2>
            <P>
              Premium is per server. It unlocks AI chat, scheduling, unlimited auto-mod rules and priority
              support. The free plan keeps music, radio, moderation, three auto-mod rules, leveling and the
              dashboard.
            </P>
            <P>
              If checkout is not connected on this deployment, the Premium page says so and points to the
              support page instead of showing a button that cannot charge anyone. When a provider is
              connected, receipts and the billing portal come from that provider.
            </P>
          </section>

          <section>
            <H2 id="self-hosting">Self-hosting</H2>
            <P>
              The bot, dashboard, Prisma schema and docs live in one repository. You need Node 20+, Postgres,
              a Discord application, and a Lavalink v4 node for music.
            </P>
            <Block>{`# install
npm install

# configure
cp .env.example .env
# fill DATABASE_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET,
# NEXTAUTH_SECRET, NEXTAUTH_URL, LAVALINK_*

# database
npx prisma generate
npx prisma db push

# run the bot
npm run bot

# run the dashboard
npm run dev --workspace packages/dashboard`}</Block>
            <P>
              The dashboard needs <Code>DISCORD_CLIENT_ID</Code>, <Code>DISCORD_CLIENT_SECRET</Code>,{' '}
              <Code>NEXTAUTH_SECRET</Code>, <Code>NEXTAUTH_URL</Code> and <Code>DATABASE_URL</Code>. Music
              controls additionally need <Code>BOT_API_URL</Code> and <Code>BOT_API_SECRET</Code>, which must
              match the bot&apos;s values.
            </P>
          </section>

          <section>
            <H2 id="troubleshooting">Troubleshooting</H2>
            <H3>The bot joins but no audio plays</H3>
            <P>
              Check that Lavalink is running and reachable from the bot, and that the node is in the bot&apos;s
              config. The status page reports the node count when the control API is connected.
            </P>
            <H3>The dashboard says the player is not reachable</H3>
            <P>
              Either the bot is not in a voice channel, or <Code>BOT_API_URL</Code> and{' '}
              <Code>BOT_API_SECRET</Code> are not set. The Player page distinguishes the two cases.
            </P>
            <H3>I cannot see a server in the selector</H3>
            <P>
              You need Manage Server or Administrator on that server, and the bot must be in it. Re-sign in
              if you just changed permissions — the guild list is cached for a minute.
            </P>
            <H3>Changes will not save</H3>
            <P>
              The form shows the server&apos;s error message. Common causes: the session expired (sign in
              again), the guild row is missing (open the dashboard once), or you hit the rate limit (wait a
              minute).
            </P>
          </section>

          <section>
            <H2 id="bot-api">Bot control API</H2>
            <P>
              The dashboard never connects to Discord directly for playback. It calls a small HTTP API hosted
              beside the bot, signed with HMAC-SHA256. Requests carry{' '}
              <Code>X-CouplesHub-Timestamp</Code> and <Code>X-CouplesHub-Signature</Code>; the signature covers
              method, path, timestamp and body.
            </P>
            <P>
              The repository includes <Code>docs/bot-integration.md</Code> with the exact routes the
              dashboard expects: <Code>GET /health</Code>, <Code>GET /guilds/:id/player</Code> and{' '}
              <Code>POST /guilds/:id/player</Code>. Implement those on the bot side to light up live controls
              and the status page.
            </P>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/commands">Command reference</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/status">Check live status</Link>
              </Button>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
