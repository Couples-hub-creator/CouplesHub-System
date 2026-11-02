import type { Metadata } from 'next';
import { PolicyPage, type PolicySection } from '@/components/marketing/policy-page';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: `The terms that apply when you use ${siteConfig.name} on Discord or in the dashboard.`,
  alternates: { canonical: '/terms' },
};

const SECTIONS: PolicySection[] = [
  {
    heading: 'Agreement',
    paragraphs: [
      'By adding Couples Hub to a Discord server, using its commands, or signing in to the dashboard, you agree to these terms. If you do not agree, remove the bot and stop using the dashboard.',
      'You must also follow Discord’s Terms of Service and Community Guidelines. Where those rules and these terms differ, Discord’s rules win.',
    ],
  },
  {
    heading: 'What Couples Hub does',
    paragraphs: [
      'Couples Hub is a Discord bot with a web dashboard. It plays music, runs moderation and auto-moderation, tracks levels, welcomes members, schedules tasks, assigns roles and can answer messages with an AI assistant when a server enables it.',
      'The dashboard lets people with Manage Server permission configure those features for their own server. The bot does the work inside Discord; the dashboard stores configuration and reads aggregate activity.',
    ],
  },
  {
    heading: 'Your account and servers',
    paragraphs: [
      'Signing in uses Discord OAuth. We never see your Discord password. You are responsible for the Discord account you sign in with and for keeping access to it secure.',
      'You may only configure servers where you have Manage Server or Administrator permission. Attempting to access another server’s settings is a breach of these terms.',
      'Server owners and administrators are responsible for how the bot is configured in their server, including moderation actions taken by the bot and messages sent by scheduled tasks or the AI assistant.',
    ],
  },
  {
    heading: 'Acceptable use',
    paragraphs: ['Do not use Couples Hub to:'],
    list: [
      'Harass, threaten, or target people, or to evade a moderation action.',
      'Break Discord’s rules, or any law that applies to you.',
      'Send spam, run raids, or automate abuse across servers.',
      'Attempt to access data, servers, or accounts you do not control.',
      'Probe, overload, or reverse-engineer the hosted service in a way that harms other users.',
    ],
  },
  {
    heading: 'Premium and payments',
    paragraphs: [
      'Core features are free. Premium features are listed on the pricing page and are unlocked per server.',
      'This deployment may not have a payment provider connected. When checkout is not connected, no payment is taken from the dashboard and Premium is granted manually by the operator. When checkout is connected, the payment provider’s terms and receipt terms apply in addition to these.',
      'Cancelling Premium leaves the server on the free limits at the end of the paid period. Settings and data are not deleted when a plan ends; premium-only tasks pause instead of disappearing.',
    ],
  },
  {
    heading: 'Availability and changes',
    paragraphs: [
      'Couples Hub is provided as-is. Features can change, break, or be removed. We aim to keep the service running but do not promise uninterrupted availability.',
      'The status page reports what is observable at the moment you load it. It is not a contractual uptime guarantee.',
    ],
  },
  {
    heading: 'Content and data',
    paragraphs: [
      'You keep ownership of the messages and content in your server. You grant the operator the limited permission needed to process that content to run the features you enable — for example, reading a message to answer it with the AI assistant, or storing a moderation reason.',
      'Do not configure the bot to process content you have no right to process.',
    ],
  },
  {
    heading: 'Termination',
    paragraphs: [
      'You can stop using Couples Hub at any time by removing the bot and deleting your dashboard data from the account page. Server administrators can delete all server data from the danger zone in settings.',
      'We may suspend access if these terms are broken, if the service is being abused, or if continuing would harm other users or the service.',
    ],
  },
  {
    heading: 'Liability',
    paragraphs: [
      'To the extent the law allows, the operator is not liable for indirect or consequential losses, lost data, lost profits, or actions taken by Discord or by other users.',
      'Nothing in these terms limits liability that cannot be limited by law.',
    ],
  },
  {
    heading: 'Changes to these terms',
    paragraphs: [
      'These terms can be updated as the product changes. The date at the top of this page shows the current version. Continuing to use Couples Hub after an update means you accept the updated terms.',
    ],
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of service"
      updated="31 October 2026"
      intro="The short version: use Couples Hub within Discord’s rules, only configure servers you manage, and do not abuse the service. The detail is below."
      sections={SECTIONS}
    />
  );
}
