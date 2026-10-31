'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUserGuilds } from '@/lib/discord';
import Link from 'next/link';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  owner: boolean;
}

export default function GuildSettings() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (session?.user?.accessToken) {
      getUserGuilds(session.user.accessToken)
        .then((data) => {
          const foundGuild = data.find((g: Guild) => g.id === params.guildId);
          if (foundGuild) {
            setGuild(foundGuild);
          } else {
            router.push('/dashboard');
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching guild:', error);
          setLoading(false);
        });
    }
  }, [session, params.guildId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-700 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-700 flex items-center justify-center">
        <div className="text-white text-2xl">Guild not found</div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'moderation', label: 'Moderation', icon: '🛡️' },
    { id: 'economy', label: 'Economy', icon: '💰' },
    { id: 'automod', label: 'Auto-Mod', icon: '🤖' },
    { id: 'leveling', label: 'Leveling', icon: '⭐' },
    { id: 'tickets', label: 'Tickets', icon: '🎫' },
    { id: 'roles', label: 'Roles', icon: '👥' },
    { id: 'community', label: 'Community', icon: '🎉' },
    { id: 'logging', label: 'Logging', icon: '📝' },
    { id: 'extras', label: 'Extras', icon: '✨' },
    { id: 'fun', label: 'Fun', icon: '🎮' },
    { id: 'utility', label: 'Utility', icon: '🔧' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-700">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">CouplesHub</span>
            </Link>
            <div className="flex items-center gap-3">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name}
                  className="w-10 h-10 rounded-full border-2 border-white/30"
                />
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {guild.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
              alt={guild.name}
              className="w-20 h-20 rounded-2xl"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
              {guild.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{guild.name}</h1>
            <div className="flex gap-2">
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">Active</span>
              <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">Premium</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20 mb-8 overflow-x-auto">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Server Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-xl p-6">
                  <div className="text-3xl font-bold text-white mb-2">Active</div>
                  <div className="text-white/70">Bot Status</div>
                </div>
                <div className="bg-white/10 rounded-xl p-6">
                  <div className="text-3xl font-bold text-white mb-2">13</div>
                  <div className="text-white/70">Modules Enabled</div>
                </div>
                <div className="bg-white/10 rounded-xl p-6">
                  <div className="text-3xl font-bold text-white mb-2">Premium</div>
                  <div className="text-white/70">Plan</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'music' && (
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Music Settings</h2>
              <div className="space-y-6">
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Default Volume</h3>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="100"
                    className="w-full"
                  />
                  <div className="text-white/70 mt-2">100%</div>
                </div>
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Auto-Play</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" />
                    <span className="text-white">Enable auto-play when queue is empty</span>
                  </label>
                </div>
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">24/7 Mode</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5" />
                    <span className="text-white">Keep bot in voice channel 24/7</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'overview' && activeTab !== 'music' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚧</div>
              <h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>
              <p className="text-white/70">This module is currently being developed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
