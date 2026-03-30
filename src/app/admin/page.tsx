'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';
import {
  FileText,
  Plane,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Server,
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalRequests: number;
  pendingRequests: number;
  confirmedRequests: number;
  paidRequests: number;
  totalAircraft: number;
  activeAircraft: number;
  providers: Array<{
    providerName: string;
    enabled: boolean;
    lastFetchAt: string | null;
    lastFetchOk: boolean;
    aircraftCount: number;
  }>;
  recentRequests: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    passengers: number;
    status: string;
    estimatedPrice: number | null;
    createdAt: string;
    aircraft: { name: string; type: { name: string } } | null;
  }>;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Dashboard</h1>
          <p className="text-jet-light text-sm mt-1">Overview of your JETVORYX platform</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
          </div>
        ) : stats ? (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={FileText}
                label="Total Requests"
                value={stats.totalRequests.toString()}
                sub={`${stats.pendingRequests} pending`}
                color="text-blue-400"
              />
              <StatCard
                icon={Clock}
                label="Pending Review"
                value={stats.pendingRequests.toString()}
                sub="Awaiting action"
                color="text-yellow-400"
              />
              <StatCard
                icon={Plane}
                label="Active Aircraft"
                value={`${stats.activeAircraft}/${stats.totalAircraft}`}
                sub={`${stats.providers?.length || 0} providers`}
                color="text-gold"
              />
              <StatCard
                icon={DollarSign}
                label="Revenue"
                value={formatCurrency(stats.totalRevenue)}
                sub={`${stats.paidRequests} paid bookings`}
                color="text-green-400"
              />
            </div>

            {/* Provider Status */}
            <div className="bg-jet-dark border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                  <Server className="h-5 w-5 text-gold" />
                  Provider Status
                </h2>
                <Link href="/admin/providers" className="text-xs text-gold hover:text-gold-light transition-colors">
                  Manage &rarr;
                </Link>
              </div>
              <div className="space-y-3">
                {stats.providers?.map(p => (
                  <div key={p.providerName} className="flex items-center justify-between bg-jet-charcoal rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.enabled && p.lastFetchOk ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-sm text-white">{p.providerName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-jet-muted">
                        {p.aircraftCount} aircraft
                      </span>
                      <span className={`text-xs ${p.enabled ? 'text-green-400' : 'text-red-400'}`}>
                        {p.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Requests */}
            <div className="bg-jet-dark border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-semibold text-white">Recent Requests</h2>
                <Link href="/admin/requests" className="text-xs text-gold hover:text-gold-light transition-colors">
                  View All &rarr;
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-jet-muted text-xs uppercase tracking-wider border-b border-white/5">
                      <th className="text-left py-3 px-2">Client</th>
                      <th className="text-left py-3 px-2">Route</th>
                      <th className="text-left py-3 px-2">Aircraft</th>
                      <th className="text-left py-3 px-2">Date</th>
                      <th className="text-left py-3 px-2">Status</th>
                      <th className="text-right py-3 px-2">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.recentRequests.map(r => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-2">
                          <Link href={`/admin/requests?id=${r.id}`} className="text-white hover:text-gold transition-colors">
                            {r.firstName} {r.lastName}
                          </Link>
                          <p className="text-xs text-jet-muted">{r.email}</p>
                        </td>
                        <td className="py-3 px-2 text-jet-light">
                          {r.departureCity} &rarr; {r.arrivalCity}
                        </td>
                        <td className="py-3 px-2 text-jet-light">
                          {r.aircraft?.name || 'Not specified'}
                        </td>
                        <td className="py-3 px-2 text-jet-light text-xs">
                          {formatDate(r.departureDate)}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`text-xs font-medium ${getStatusColor(r.status)}`}>
                            {getStatusLabel(r.status)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-white">
                          {r.estimatedPrice ? formatCurrency(r.estimatedPrice) : '—'}
                        </td>
                      </tr>
                    ))}
                    {stats.recentRequests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-jet-muted">
                          No requests yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="text-jet-muted">Failed to load stats</p>
        )}
      </div>
    </AdminShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-jet-dark border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs text-jet-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold text-white">{value}</p>
      <p className="text-xs text-jet-muted mt-1">{sub}</p>
    </div>
  );
}
