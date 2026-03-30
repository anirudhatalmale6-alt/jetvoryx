'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plane, Lock } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid credentials');
      setLoading(false);
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-jet-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Plane className="h-8 w-8 text-gold" />
            <span className="text-2xl font-display font-bold tracking-wider bg-gold-gradient bg-clip-text text-transparent">
              JETVORYX
            </span>
          </div>
          <p className="text-jet-light text-sm">Admin Panel</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-jet-dark border border-white/10 rounded-xl p-8 space-y-6"
        >
          <div className="flex items-center gap-2 text-gold mb-2">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Sign In</span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-jet-light mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-jet-light mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-gradient text-jet-black font-medium py-3 rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
