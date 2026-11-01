import * as React from 'react';

export interface PolicySection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export function PolicyPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: PolicySection[];
}) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald/[0.05] to-transparent" />
      <article className="relative mx-auto w-full max-w-3xl px-gutter pb-24 pt-28 sm:pt-32">
        <p className="text-xs font-medium text-emerald">Legal</p>
        <h1 className="mt-2 font-display text-display-2 font-semibold text-mist">{title}</h1>
        <p className="mt-2 text-xs text-mist-faint">Last updated {updated}</p>
        <p className="mt-5 text-base leading-relaxed text-mist-dim">{intro}</p>

        <nav aria-label="On this page" className="mt-8 rounded-lg border border-hairline bg-obsidian/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mist-faint">On this page</p>
          <ol className="mt-2 space-y-1">
            {sections.map((section, index) => (
              <li key={section.heading}>
                <a
                  href={`#section-${index + 1}`}
                  className="text-sm text-mist-dim underline-offset-4 transition-colors hover:text-emerald hover:underline"
                >
                  {index + 1}. {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-9">
          {sections.map((section, index) => (
            <section key={section.heading} id={`section-${index + 1}`} className="scroll-mt-24">
              <h2 className="font-display text-xl font-semibold text-mist">
                {index + 1}. {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-relaxed text-mist-dim">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="mt-3 space-y-1.5 pl-1">
                  {section.list.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-mist-dim">
                      <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-emerald/70" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-hairline bg-white/[0.02] p-4">
          <p className="text-sm leading-relaxed text-mist-dim">
            Questions about this page? Open the support page from the footer. A person reads it.
          </p>
        </div>
      </article>
    </div>
  );
}
