'use client';

import Link from 'next/link';

export default function Features() {
  const features = [
    {
      category: 'Music',
      icon: '🎵',
      items: [
        'Play music from YouTube, SoundCloud, Spotify',
        'Advanced queue management',
        'Audio filters (bassboost, nightcore, 8D)',
        '24/7 music mode',
        'Live lyrics display',
        'Personal playlists',
      ],
    },
    {
      category: 'Moderation',
      icon: '🛡️',
      items: [
        'Auto-moderation with AI',
        'Custom punishment system',
        'Mod-log with case numbers',
        'Slowmode and lock channels',
        'Mass actions (ban, kick, mute)',
        'Warning system',
      ],
    },
    {
      category: 'Economy',
      icon: '💰',
      items: [
        'Virtual currency system',
        'Daily rewards and work',
        'Shop with custom items',
        'Gambling games',
        'Leaderboards',
        'Bank system',
      ],
    },
    {
      category: 'Leveling',
      icon: '⭐',
      items: [
        'XP system for messages',
        'Voice chat XP',
        'Role rewards',
        'Beautiful rank cards',
        'Server leaderboards',
        'Level-up messages',
      ],
    },
    {
      category: 'Tickets',
      icon: '🎫',
      items: [
        'Custom ticket panels',
        'Category support',
        'Auto-transcripts',
        'Claim system',
        'Staff roles',
        'Closed ticket stats',
      ],
    },
    {
      category: 'Auto-Mod',
      icon: '🤖',
      items: [
        'Anti-spam protection',
        'Anti-link filter',
        'Bad word filter',
        'Raid protection',
        'Mention spam protection',
        'Custom punishments',
      ],
    },
    {
      category: 'Roles',
      icon: '👥',
      items: [
        'Reaction roles',
        'Button roles',
        'Select menu roles',
        'Self-assignable roles',
        'Role verification',
        'Temp roles',
      ],
    },
    {
      category: 'Community',
      icon: '🎉',
      items: [
        'Giveaways with requirements',
        'Polls with voting',
        'Suggestions system',
        'Reminders',
        'Birthday celebrations',
        'Starboard',
      ],
    },
    {
      category: 'Logging',
      icon: '📝',
      items: [
        'Message edits/deletes',
        'Member joins/leaves',
        'Role changes',
        'Channel updates',
        'Voice activity',
        'Custom log channels',
      ],
    },
    {
      category: 'Fun',
      icon: '🎮',
      items: [
        '8ball predictions',
        'Meme commands',
        'Trivia games',
        'Tic-tac-toe',
        'Rock-paper-scissors',
        'Mini-games',
      ],
    },
    {
      category: 'Utility',
      icon: '🔧',
      items: [
        'Server information',
        'User information',
        'Bot statistics',
        'Embed builder',
        'Weather reports',
        'Translation',
      ],
    },
    {
      category: 'Extras',
      icon: '✨',
      items: [
        'Custom commands',
        'Temp voice channels',
        'Welcome images',
        'Auto-roles',
        'AI chat integration',
        'And more...',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-700">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">CouplesHub</span>
            </Link>
            <Link
              href="/auth/signin"
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl font-bold text-white mb-6">Powerful Features</h1>
        <p className="text-2xl text-white/70 mb-12">Everything you need to manage your community</p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.category}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-4">{feature.category}</h3>
              <ul className="space-y-2">
                {feature.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-white/80">
                    <svg className="w-4 h-4 text-pink-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-6 py-20">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-white/70 mb-8">Join thousands of communities using CouplesHub</p>
          <Link
            href="/auth/signin"
            className="inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition"
          >
            Add to Discord
          </Link>
        </div>
      </div>
    </div>
  );
}
