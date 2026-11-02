import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';

export const runtime = 'edge';
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GRID = 64;

export default function OpengraphImage() {
  const columns = Math.ceil(size.width / GRID);
  const rows = Math.ceil(size.height / GRID);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#05070C',
          color: '#E8EDF5',
          padding: '64px 72px',
          position: 'relative',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -220,
            right: -160,
            width: 620,
            height: 620,
            borderRadius: 620,
            background: 'rgba(25,214,143,0.10)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -260,
            left: -180,
            width: 540,
            height: 540,
            borderRadius: 540,
            background: 'rgba(233,201,133,0.06)',
            display: 'flex',
          }}
        />

        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={`v${index}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: index * GRID,
              width: 1,
              background: 'rgba(255,255,255,0.035)',
              display: 'flex',
            }}
          />
        ))}
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={`h${index}`}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: index * GRID,
              height: 1,
              background: 'rgba(255,255,255,0.035)',
              display: 'flex',
            }}
          />
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
          <div
            style={{
              width: 46,
              height: 46,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(25,214,143,0.5)',
              background: 'rgba(25,214,143,0.1)',
              borderRadius: 12,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                background: '#19D68F',
                transform: 'rotate(45deg)',
                borderRadius: 3,
                display: 'flex',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Couples Hub</span>
            <span style={{ fontSize: 13, color: '#6F7B93', letterSpacing: '0.16em' }}>DISCORD, IN COMMAND</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 3, background: '#19D68F', borderRadius: 2, display: 'flex' }} />
            <span style={{ fontSize: 15, color: '#93A0B5', letterSpacing: '0.14em' }}>
              THE COMMAND ROOM FOR YOUR COMMUNITY
            </span>
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 92,
              lineHeight: 0.98,
              fontWeight: 700,
              letterSpacing: '-0.045em',
              maxWidth: 940,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Music, protection and community.</span>
            <span style={{ color: '#19D68F' }}>One dashboard.</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.09)',
            paddingTop: 22,
            fontSize: 15,
            color: '#6F7B93',
            position: 'relative',
          }}
        >
          <span>Studio-grade music · Firm moderation · Leveling · Automation</span>
          <span style={{ color: '#E9C985' }}>{siteConfig.url.replace(/^https?:\/\//, '')}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
