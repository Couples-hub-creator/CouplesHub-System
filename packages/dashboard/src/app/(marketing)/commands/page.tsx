import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Command, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { CommandsExplorer } from '@/components/marketing/commands-explorer';
import { Reveal } from '@/components/motion/primitives';
import { Button } from '@/components/ui/Button';
import { commands } from '@/config/commands';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Commands',
  description: `Every ${siteConfig.name} slash command, what it does, and who can run it.`,
  alternates: { canonical: '/commands' },
};

export default function CommandsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${siteConfig.name} commands`,
    numberOfItems: commands.length,
    itemListElement: commands.map((command, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `/${command.name}`,
      description: command.description,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative overflow-hidden pb-10 pt-28 sm:pt-32">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 dot-grid opacity-40" />
          <div className="aurora-blob left-[-10%] top-[-30%] h-[30rem] w-[30rem] bg-emerald/[0.09]" />
        </div>

        <div className="relative mx-auto w-full max-w-shell px-gutter">
          <Reveal>
            <p className="text-xs font-medium text-emerald">Reference</p>
            <h1 className="mt-2 max-w-2xl font-display text-display-2 font-semibold text-mist">
              Every command, one page.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-mist-dim">
              {commands.length} slash commands across music, protection, community and automation. Search by
              name or filter by module. Premium commands are marked.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="md">
                <a href={siteConfig.links.invite} target="_blank" rel="noreferrer">
                  Add to Discord
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="md">
                <Link href="/docs">Read the docs</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Command, label: 'Music', copy: 'Queue, filters, 24/7' },
              { icon: ShieldCheck, label: 'Protection', copy: 'Cases, auto-mod, raid walls' },
              { icon: Radio, label: 'Community', copy: 'Levels, welcome, roles' },
              { icon: Sparkles, label: 'Automation', copy: 'Schedule and AI chat' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-hairline bg-obsidian/50 p-3.5">
                <item.icon className="size-4 text-emerald" />
                <p className="mt-2 text-sm font-semibold text-mist">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-mist-faint">{item.copy}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-shell px-gutter pb-24">
        <CommandsExplorer />
      </section>
    </>
  );
}
