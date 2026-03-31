'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Phone, Plane, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account.');
        setLoading(false);
        return;
      }

      // Auto-login after signup
      const result = await signIn('credentials', {
        email: form.email.toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created but login failed. Please sign in manually.');
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
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
            <h1 className="font-display text-3xl font-bold mb-2">Create Account</h1>
            <p className="text-white/40">Join JETVORYX for premium private aviation</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="glass-card rounded-xl p-8">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
                    <User className="inline h-3 w-3 mr-1 text-gold/60" />
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="John"
                    className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
                    <User className="inline h-3 w-3 mr-1 text-gold/60" />
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="Smith"
                    className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
                  <Mail className="inline h-3 w-3 mr-1 text-gold/60" />
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
                  <Phone className="inline h-3 w-3 mr-1 text-gold/60" />
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
                  <Lock className="inline h-3 w-3 mr-1 text-gold/60" />
                  Password *
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
                  <Lock className="inline h-3 w-3 mr-1 text-gold/60" />
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                  autoComplete="new-password"
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
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <div className="mt-6 text-center">
              <p className="text-sm text-white/40">
                Already have an account?{' '}
                <Link
                  href={`/login${callbackUrl !== '/' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                  className="text-gold hover:text-gold-light transition-colors font-medium"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </form>

          <p className="text-xs text-white/20 text-center mt-6">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-white/30 hover:text-gold/60 transition-colors underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-white/30 hover:text-gold/60 transition-colors underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-jet-black flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
