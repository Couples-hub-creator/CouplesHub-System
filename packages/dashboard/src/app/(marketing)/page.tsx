import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/hero';
import { ProofStrip } from '@/components/marketing/proof-strip';
import { FeatureBento } from '@/components/marketing/feature-bento';
import { CommandSimulator } from '@/components/marketing/command-simulator';
import { DashboardShowcase } from '@/components/marketing/dashboard-showcase';
import { DeepDives, HowItWorks } from '@/components/marketing/deep-dives';
import { PricingSection } from '@/components/marketing/pricing-section';
import { CommunityVoices } from '@/components/marketing/community-voices';
import { FinalCta } from '@/components/marketing/final-cta';
import { getProofMetrics, getSiteStats } from '@/lib/server/stats';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  alternates: { canonical: '/' },
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [stats, metrics] = await Promise.all([getSiteStats(), getProofMetrics()]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    applicationCategory: 'CommunicationApplication',
    operatingSystem: 'Web, Discord',
    description: siteConfig.description,
    offers: siteConfig.pricing.plans.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: plan.monthly,
      priceCurrency: 'USD',
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero stats={stats} />
      {metrics && <ProofStrip metrics={metrics} />}
      <FeatureBento />
      <CommandSimulator />
      <DashboardShowcase />
      <DeepDives />
      <HowItWorks />
      <PricingSection />
      <CommunityVoices />
      <FinalCta />
    </>
  );
}
