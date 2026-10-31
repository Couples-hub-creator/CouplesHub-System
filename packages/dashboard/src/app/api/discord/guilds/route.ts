import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = (session.user as any).discordAccessToken;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch guilds from Discord' }, { status: response.status });
    }

    const guilds = await response.json();

    // Filter guilds where user has MANAGE_SERVER permission (0x20)
    const manageableGuilds = guilds.filter((guild: any) => {
      const permission = BigInt(guild.permissions);
      return (permission & 0x20n) === 0x20n || guild.owner;
    });

    return NextResponse.json(manageableGuilds);
  } catch (error) {
    console.error('Error fetching guilds:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
