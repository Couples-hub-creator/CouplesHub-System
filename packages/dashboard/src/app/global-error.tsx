'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#05070C',
          color: '#E8EDF5',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          padding: '24px',
        }}
      >
        <main style={{ maxWidth: 440, textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#19D68F',
            }}
          >
            Couples Hub
          </p>
          <h1 style={{ margin: '12px 0 0', fontSize: 28, lineHeight: 1.15, fontWeight: 600 }}>
            The app could not start.
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: '#93A0B5' }}>
            A fatal error stopped the page before it rendered. Reload once. If it happens again, the
            deployment needs attention.
          </p>
          {error.digest && (
            <p style={{ margin: '12px 0 0', fontSize: 10, color: '#6F7B93' }}>Reference {error.digest}</p>
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: 'pointer',
                border: 0,
                borderRadius: 6,
                background: '#19D68F',
                color: '#04120C',
                fontSize: 13,
                fontWeight: 600,
                padding: '10px 16px',
              }}
            >
              Reload
            </button>
            <a
              href="/"
              style={{
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#E8EDF5',
                fontSize: 13,
                fontWeight: 600,
                padding: '10px 16px',
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
