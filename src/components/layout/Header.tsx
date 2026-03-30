'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Plane } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
              <Link href="/request">
                <Button size="sm">Get Started</Button>
              </Link>
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
                <Link href="/request" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
