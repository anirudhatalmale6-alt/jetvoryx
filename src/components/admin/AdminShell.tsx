'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  Server,
  DollarSign,
  LogOut,
  Plane,
  ExternalLink,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/requests', label: 'Requests', icon: FileText },
  { href: '/admin/providers', label: 'Providers', icon: Server },
  { href: '/admin/pricing', label: 'Pricing', icon: DollarSign },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-jet-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-jet-black flex">
      {/* Sidebar */}
      <aside className="w-64 bg-jet-dark border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-gold" />
            <span className="text-lg font-display font-bold tracking-wider bg-gold-gradient bg-clip-text text-transparent">
              JETVORYX
            </span>
          </div>
          <p className="text-xs text-jet-muted mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-gold/10 text-gold border border-gold/20'
                    : 'text-jet-light hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 text-xs text-jet-muted hover:text-jet-light transition-colors px-3 py-2"
          >
            <ExternalLink className="h-3 w-3" />
            View Site
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex items-center gap-2 text-xs text-jet-muted hover:text-red-400 transition-colors px-3 py-2 w-full"
          >
            <LogOut className="h-3 w-3" />
            Sign Out
          </button>
          <div className="px-3 py-1">
            <p className="text-xs text-jet-muted truncate">{session.user?.email}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
