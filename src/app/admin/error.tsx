'use client';

import { useEffect } from 'react';
import { Plane } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-jet-black flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Plane className="h-8 w-8 text-gold" />
          <span className="text-2xl font-display font-bold tracking-wider bg-gold-gradient bg-clip-text text-transparent">
            JETVORYX
          </span>
        </div>
        <h2 className="text-xl text-white mb-2">Something went wrong</h2>
        <p className="text-jet-light text-sm mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-gold-gradient text-jet-black text-sm font-medium px-6 py-2.5 rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all"
          >
            Try Again
          </button>
          <a
            href="/admin/login"
            className="border border-gold/30 text-gold text-sm px-6 py-2.5 rounded-lg hover:bg-gold/10 transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
