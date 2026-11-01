import type { Metadata } from 'next';
import { DesignSpecimens } from '@/components/design-system/specimens';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Design system',
  description: `The visual language behind ${siteConfig.name}: tokens, type, controls and surfaces.`,
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return (
    <div className="mx-auto w-full max-w-shell px-gutter pb-24 pt-28 sm:pt-32">
      <div className="max-w-2xl">
        <p className="text-xs font-medium text-emerald">Reference</p>
        <h1 className="mt-2 font-display text-display-2 font-semibold text-mist">Crown Jewel</h1>
        <p className="mt-4 text-base leading-relaxed text-mist-dim">
          The tokens and components every page is built from. One accent, one display face, hairline
          structure, and motion that moves only what it must.
        </p>
      </div>

      <div className="mt-10">
        <DesignSpecimens />
      </div>
    </div>
  );
}
