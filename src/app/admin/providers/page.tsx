'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import {
  Server,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Power,
  Clock,
  Database,
} from 'lucide-react';

interface ProviderInfo {
  name: string;
  enabled: boolean;
  lastFetch: string | null;
  aircraftCount: number;
  healthy: boolean;
  error: string | null;
  fetchInterval: number;
  lastFetchAt: string | null;
  configId: string | null;
}

export default function AdminProviders() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/admin/providers');
      setProviders(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const syncProvider = async (name: string) => {
    setSyncing(name);
    try {
      await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', providerName: name }),
      });
      await fetchProviders();
    } catch (e) {
      console.error(e);
    }
    setSyncing(null);
  };

  const toggleProvider = async (name: string) => {
    try {
      await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', providerName: name }),
      });
      await fetchProviders();
    } catch (e) {
      console.error(e);
    }
  };

  const syncAll = async () => {
    setSyncing('all');
    for (const p of providers) {
      if (p.enabled) {
        await syncProvider(p.name);
      }
    }
    setSyncing(null);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Data Providers</h1>
            <p className="text-jet-light text-sm mt-1">Manage aircraft data sources</p>
          </div>
          <button
            onClick={syncAll}
            disabled={syncing !== null}
            className="inline-flex items-center gap-2 bg-gold-gradient text-jet-black text-sm font-medium px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing === 'all' ? 'animate-spin' : ''}`} />
            Sync All
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid gap-4">
            {providers.map(p => (
              <div
                key={p.name}
                className="bg-jet-dark border border-white/5 rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${
                      p.enabled && p.healthy
                        ? 'bg-green-500/10 text-green-400'
                        : p.enabled
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-jet-charcoal text-jet-muted'
                    }`}>
                      <Server className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{p.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        {p.enabled && p.healthy ? (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle className="h-3 w-3" /> Healthy
                          </span>
                        ) : p.enabled ? (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <AlertCircle className="h-3 w-3" /> Error
                          </span>
                        ) : (
                          <span className="text-xs text-jet-muted">Disabled</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => syncProvider(p.name)}
                      disabled={syncing !== null || !p.enabled}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-jet-charcoal border border-white/10 rounded-lg text-xs text-jet-light hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${syncing === p.name ? 'animate-spin' : ''}`} />
                      Sync
                    </button>
                    <button
                      onClick={() => toggleProvider(p.name)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        p.enabled
                          ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                          : 'bg-jet-charcoal text-jet-muted border-white/10 hover:text-white'
                      }`}
                    >
                      <Power className="h-3 w-3" />
                      {p.enabled ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-jet-muted" />
                    <div>
                      <p className="text-sm text-white font-medium">{p.aircraftCount}</p>
                      <p className="text-xs text-jet-muted">Aircraft</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-jet-muted" />
                    <div>
                      <p className="text-sm text-white font-medium">
                        {p.fetchInterval >= 3600
                          ? `${Math.round(p.fetchInterval / 3600)}h`
                          : `${Math.round(p.fetchInterval / 60)}m`}
                      </p>
                      <p className="text-xs text-jet-muted">Interval</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-jet-muted" />
                    <div>
                      <p className="text-sm text-white font-medium">
                        {p.lastFetchAt
                          ? new Date(p.lastFetchAt).toLocaleDateString()
                          : 'Never'}
                      </p>
                      <p className="text-xs text-jet-muted">Last Fetch</p>
                    </div>
                  </div>
                </div>

                {p.error && (
                  <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-2">
                    <p className="text-xs text-red-400">{p.error}</p>
                  </div>
                )}
              </div>
            ))}

            {providers.length === 0 && (
              <div className="text-center py-12 text-jet-muted">
                No providers configured. Run the seed endpoint to initialize.
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-jet-charcoal border border-white/5 rounded-xl p-5">
          <h3 className="text-sm font-medium text-white mb-2">About Providers</h3>
          <p className="text-xs text-jet-light leading-relaxed">
            Data providers fetch aircraft listings from external sources. Each provider runs on a
            scheduled interval and caches results in the platform database. Toggle providers on/off
            or trigger manual syncs above. Add new data sources by implementing the provider adapter
            interface — no code changes needed in the admin panel.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
