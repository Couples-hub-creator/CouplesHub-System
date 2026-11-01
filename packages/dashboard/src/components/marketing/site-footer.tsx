import Link from 'next/link';
import { Code2, Heart } from 'lucide-react';
import { BrandLockup } from '@/components/brand/logo';
import { siteConfig } from '@/config/site';
import { StatusDot } from '@/components/ui/badge';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-section overflow-hidden border-t border-hairline">
      <div className="mx-auto w-full max-w-shell px-gutter pb-10 pt-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandLockup size="md" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-mist-dim">
              The command room for Discord communities that take their music, their members and their peace
              seriously.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-hairline bg-white/[0.03] px-3 py-1.5 text-xs text-mist-dim">
              <StatusDot tone="neutral" pulse={false} />
              Service status
              <Link href="/status" className="ml-1 font-medium text-mist hover:text-emerald">
                Check
              </Link>
            </div>
          </div>

          <FooterColumn title="Product" links={siteConfig.footer.product} />
          <FooterColumn title="Resources" links={siteConfig.footer.resources} />
          <FooterColumn title="Legal" links={siteConfig.footer.legal} />
        </div>

        <div className="mt-14 flex flex-col-reverse items-start justify-between gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-mist-faint">
            © {year} {siteConfig.name}. Not affiliated with Discord Inc.
          </p>
          <div className="flex items-center gap-5 text-xs text-mist-faint">
            <Link
              href="/docs#self-hosting"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-mist"
            >
              <Code2 className="size-3.5" />
              Self-host
            </Link>
            <span className="inline-flex items-center gap-1.5">
              Built with <Heart className="size-3.5 text-danger" /> for Discord
            </span>
          </div>
        </div>
      </div>

      {/* Giant faded wordmark — anchors the page, costs no space */}
      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <p className="-mb-[0.18em] whitespace-nowrap text-center font-display text-[clamp(4rem,17vw,15rem)] font-bold leading-none tracking-[-0.05em] text-white/[0.025]">
          {siteConfig.name.toUpperCase()}
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-mist">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => {
          const external = link.href.startsWith('http');
          return (
            <li key={`${title}-${link.label}`}>
              {external ? (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-mist-dim transition-colors hover:text-mist"
                >
                  {link.label}
                </a>
              ) : (
                <Link href={link.href} className="text-sm text-mist-dim transition-colors hover:text-mist">
                  {link.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
