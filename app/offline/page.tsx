'use client';

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full min-h-screen max-w-7xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="surface-card rounded-[32px] p-8 max-w-sm w-full">
        <p className="text-5xl mb-4">🌤️</p>
        <h1 className="text-xl font-bold theme-heading mb-2">You&apos;re offline</h1>
        <p className="theme-muted text-sm leading-relaxed">
          Weather Vibe needs a connection to fetch live conditions. Connect to the
          internet and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="organic-button mt-6 w-full"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
