'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Plane, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password.');
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-jet-black">
      <Header />

      <div className="pt-32 pb-20 flex items-center justify-center">
        <div className="w-full max-w-md px-4">
          {/* Logo/Brand */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 mb-6">
              <Plane className="h-8 w-8 text-gold" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-white/40">Sign in to manage your charter requests</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="glass-card rounded-xl p-8">
            <div className="space-y-5">
              <div>
                <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
                  <Mail className="inline h-3 w-3 mr-1 text-gold/60" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
                  <Lock className="inline h-3 w-3 mr-1 text-gold/60" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-6" disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <div className="mt-6 text-center">
              <p className="text-sm text-white/40">
                Don&apos;t have an account?{' '}
                <Link
                  href={`/signup${callbackUrl !== '/' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                  className="text-gold hover:text-gold-light transition-colors font-medium"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-jet-black flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
