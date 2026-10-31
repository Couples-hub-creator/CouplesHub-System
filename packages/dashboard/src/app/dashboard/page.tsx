'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { getUserGuilds } from '@/lib/discord';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  owner: boolean;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.accessToken) {
      getUserGuilds(session.user.accessToken)
        .then((data) => {
          const manageableGuilds = data.filter((guild: Guild) => {
            const permission = BigInt(guild.permissions);
            return (permission & 0x20n) === 0x20n || guild.owner;
          });
          setGuilds(manageableGuilds);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching guilds:', error);
          setLoading(false);
        });
    }
  }, [session]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-700 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-700 flex items-center justify-center">
        <div className="text-white text-2xl">Please sign in to access the dashboard</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-700">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">CouplesHub</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/pricing" className="text-white/80 hover:text-white transition">Pricing</Link>
              <Link href="/features" className="text-white/80 hover:text-white transition">Features</Link>
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name}
                    className="w-10 h-10 rounded-full border-2 border-white/30"
                  />
                )}
                <span className="text-white font-medium">{session.user.name}</span>
                <button
                  onClick={() => signOut()}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Your Servers</h1>
          <p className="text-white/70 text-xl">Select a server to manage CouplesHub settings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl font-bold text-white mb-2">{guilds.length}</div>
            <div className="text-white/70">Servers Connected</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl font-bold text-white mb-2">50+</div>
            <div className="text-white/70">Features Available</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl font-bold text-white mb-2">24/7</div>
            <div className="text-white/70">Uptime Guaranteed</div>
          </div>
        </div>

        {/* Server Grid */}
        {guilds.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
            <svg className="w-16 h-16 text-white/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h3 className="text-2xl font-bold text-white mb-2">No Servers Found</h3>
            <p className="text-white/70">You don't have any servers where you have Manage Server permissions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guilds.map((guild) => (
              <Link
                key={guild.id}
                href={`/dashboard/${guild.id}`}
                className="group bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex items-center gap-4 mb-4">
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                      alt={guild.name}
                      className="w-16 h-16 rounded-2xl"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                      {guild.name[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-pink-300 transition">{guild.name}</h3>
                    <p className="text-white/70">{guild.owner ? 'Owner' : 'Administrator'}</p>
                  </div>
                  <svg className="w-6 h-6 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">Active</span>
                  <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm">Premium</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
