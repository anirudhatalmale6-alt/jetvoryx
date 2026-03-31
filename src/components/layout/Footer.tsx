import Link from 'next/link';
import { Plane } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-jet-black border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Plane className="h-5 w-5 text-gold" />
              <span className="text-lg font-display font-bold tracking-wider text-gold-gradient">
                JETVORYX
              </span>
            </div>
            <p className="text-sm text-white/40 max-w-xs">
              Luxury private aviation at your fingertips. Experience the world without compromise.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <nav className="flex flex-col gap-2">
              <Link href="/search" className="text-sm text-white/40 hover:text-gold transition-colors">
                Browse Fleet
              </Link>
              <Link href="/request" className="text-sm text-white/40 hover:text-gold transition-colors">
                Request a Flight
              </Link>
              <Link href="/terms" className="text-sm text-white/40 hover:text-gold transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-white/40 hover:text-gold transition-colors">
                Privacy Policy
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              Contact
            </h4>
            <p className="text-sm text-white/40">
              Available 24/7 for your aviation needs.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} JETVORYX. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
