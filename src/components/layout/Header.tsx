'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, Plane, User, LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function Header() {
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isLoggedIn = status === 'authenticated' && session?.user;
  const userName = session?.user?.name || 'Account';
  const isAdmin = (session?.user as Record<string, unknown>)?.role === 'admin';

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-jet-black/90 backdrop-blur-xl border-b border-white/5'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <Plane className="h-6 w-6 text-gold transition-transform duration-300 group-hover:rotate-[-15deg]" />
              <span className="text-xl font-display font-bold tracking-wider text-gold-gradient">
                JETVORYX
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/search" className="text-sm text-white/60 hover:text-white transition-colors">
                Fleet
              </Link>
              <Link href="/#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="/request" className="text-sm text-white/60 hover:text-white transition-colors">
                Request a Flight
              </Link>

              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
                      <User className="h-4 w-4 text-gold" />
                    </div>
                    <span className="hidden lg:inline">{userName.split(' ')[0]}</span>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-12 w-56 glass-card rounded-xl p-2 border border-white/10 shadow-xl">
                        <div className="px-3 py-2 border-b border-white/5 mb-1">
                          <p className="text-sm font-medium text-white">{userName}</p>
                          <p className="text-xs text-white/40">{session.user?.email}</p>
                        </div>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={() => { signOut({ callbackUrl: '/' }); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Toggle */}
            <button
              className="md:hidden text-white/60 hover:text-white p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-72 bg-jet-dark border-l border-white/5 p-6 pt-24">
            <nav className="flex flex-col gap-6">
              <Link
                href="/search"
                className="text-lg text-white/80 hover:text-gold transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Fleet
              </Link>
              <Link
                href="/#how-it-works"
                className="text-lg text-white/80 hover:text-gold transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="/request"
                className="text-lg text-white/80 hover:text-gold transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Request a Flight
              </Link>

              <div className="pt-4 border-t border-white/10">
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
                        <User className="h-5 w-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{userName}</p>
                        <p className="text-xs text-white/40">{session?.user?.email}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setMobileOpen(false)}>
                        <Button variant="outline" className="w-full mb-2">Admin Panel</Button>
                      </Link>
                    )}
                    <button
                      onClick={() => { signOut({ callbackUrl: '/' }); setMobileOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-red-400 border border-red-400/20 rounded-lg hover:bg-red-400/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full mb-2">Sign In</Button>
                    </Link>
                    <Link href="/signup" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
