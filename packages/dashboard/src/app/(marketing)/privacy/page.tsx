import type { Metadata } from 'next';
import { PolicyPage, type PolicySection } from '@/components/marketing/policy-page';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `What ${siteConfig.name} stores, why it stores it, and how to get it removed.`,
  alternates: { canonical: '/privacy' },
};

const SECTIONS: PolicySection[] = [
  {
    heading: 'The short version',
    paragraphs: [
      'We store the minimum needed to run the bot and the dashboard: your Discord user ID, the servers you configure, the settings you choose, and the activity the bot records in those servers.',
      'We do not sell data, run advertising trackers, or read your private messages. You can export your account data and delete your dashboard activity from the account page.',
    ],
  },
  {
    heading: 'What we collect',
    paragraphs: ['Depending on how you use Couples Hub, the database may hold:'],
    list: [
      'Discord account data: user ID, username, display name, avatar hash and, if Discord returns it, email address.',
      'Server data: server ID, name, icon, and the list of servers you can manage (fetched from Discord at sign-in and cached briefly).',
      'Configuration: prefixes, language, timezone, module switches, channel and role IDs, welcome messages, auto-mod rules, level rewards and AI settings.',
      'Activity: moderation cases, XP and levels, command and music log entries, scheduled task runs, and a record of changes made in the dashboard.',
      'Premium state: plan, status, period dates and AI usage counters. Payment card details are never stored by Couples Hub; a payment provider handles them when checkout is connected.',
    ],
  },
  {
    heading: 'What we do not collect',
    paragraphs: [
      'We do not store your Discord password, your direct messages, your voice audio, or your full message history. The bot reads message content only when a feature needs it — for example to detect a bad word, to answer a mention with AI chat, or to process a command.',
      'The dashboard does not use advertising cookies, session replay, or third-party analytics scripts.',
    ],
  },
  {
    heading: 'Why we process it',
    paragraphs: [
      'To provide the features you enable (contract), to keep the service secure and prevent abuse (legitimate interest), and to comply with legal obligations where they apply.',
      'AI chat is off by default. When a server enables it, the messages sent to the assistant are processed by the AI provider configured by the operator of this deployment. The server’s administrators choose whether to enable it and in which channels.',
    ],
  },
  {
    heading: 'Cookies and sessions',
    paragraphs: [
      'Signing in sets a session cookie. It is httpOnly, secure in production, and sameSite-lax. It holds your Discord access token and profile so the dashboard can call Discord on your behalf. It is not used for advertising.',
      'Signing out clears the session. Removing the bot does not clear your dashboard session; sign out from the account page if you want to end it.',
    ],
  },
  {
    heading: 'Retention',
    paragraphs: [
      'Server configuration stays until a server administrator deletes it or removes the bot and requests deletion. Moderation cases and logs stay until the server deletes them or the retention period configured by the operator ends.',
      'Dashboard audit entries are kept so server owners can see who changed what. You can delete the audit entries you created from the account page without affecting the server’s settings.',
      'When a server deletes its data, related settings, cases, logs, tasks, stations, playlists, premium records and audit entries are removed with it.',
    ],
  },
  {
    heading: 'Who we share it with',
    paragraphs: [
      'Discord, because the bot cannot work without the Discord API. The hosting and database providers that run this deployment. A payment provider, only when checkout is connected and you choose to pay. An AI provider, only when a server enables AI chat.',
      'We do not sell personal data. We disclose data to authorities only when legally required, and we say so in the transparency notes when we are allowed to.',
    ],
  },
  {
    heading: 'Your choices and rights',
    paragraphs: [
      'From the account page you can download a JSON copy of your account data, delete the dashboard activity you created, and sign out.',
      'Server owners and administrators can export server settings, reset modules, or delete all server data from the dashboard. To ask for correction or deletion of other data, open the support page.',
      'Depending on where you live, you may have additional rights to access, correct, delete, restrict, or object to processing. Ask on the support page and we will work through it with you.',
    ],
  },
  {
    heading: 'Security',
    paragraphs: [
      'Access tokens are kept in httpOnly cookies, every dashboard API route re-checks your Discord permissions for the server, and mutating requests are rate-limited and validated.',
      'No system is perfectly secure. If you find a vulnerability, report it privately through the support page instead of exploiting it.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'Discord requires users to be at least 13 years old, or older where local law requires it. Couples Hub is not directed at children and does not knowingly collect data from anyone below Discord’s minimum age.',
    ],
  },
  {
    heading: 'Changes and contact',
    paragraphs: [
      'If this policy changes, the date at the top of the page changes with it. Material changes will be announced on the support page.',
      'Questions, deletion requests, or concerns: open the support page linked in the footer.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy policy"
      updated="31 October 2026"
      intro="Couples Hub stores what it needs to run your server and nothing that it does not. This page lists exactly what that means."
      sections={SECTIONS}
    />
  );
}
