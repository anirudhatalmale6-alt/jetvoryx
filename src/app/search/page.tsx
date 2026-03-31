'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Users, Gauge, Navigation, SlidersHorizontal, X, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils';
import { AIRCRAFT_TYPES } from '@/lib/constants';
import type { Aircraft } from '@/types';

function SearchContent() {
  const searchParams = useSearchParams();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minPax, setMinPax] = useState(searchParams.get('passengers') || '');
  const [sort, setSort] = useState('price_asc');

  const fetchAircraft = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTypes.length === 1) params.set('type', selectedTypes[0]);
      if (minPax) params.set('minPax', minPax);
      params.set('sort', sort);

      const res = await fetch(`/api/aircraft?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Client-side multi-type filtering
        let filtered = data;
        if (selectedTypes.length > 1) {
          filtered = data.filter((a: Aircraft) => selectedTypes.includes(a.type.name));
        }
        setAircraft(filtered);
      }
    } catch {
      setAircraft([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTypes, minPax, sort]);

  useEffect(() => {
    fetchAircraft();
  }, [fetchAircraft]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');
  const passengersParam = searchParams.get('passengers');
  const tripTypeParam = searchParams.get('tripType');
  const isRoundTrip = tripTypeParam === 'round_trip';

  // Build trip query string to pass through to aircraft detail pages
  const tripParams = new URLSearchParams();
  if (from) tripParams.set('from', from);
  if (to) tripParams.set('to', to);
  if (date) tripParams.set('date', date);
  if (passengersParam) tripParams.set('passengers', passengersParam);
  if (tripTypeParam) tripParams.set('tripType', tripTypeParam);
  const tripQuery = tripParams.toString();

  return (
    <div className="min-h-screen bg-jet-black">
      <Header />

      <div className="pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-10">
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
              {from && to ? (
                <>
                  <span className="text-white/60">{from}</span>
                  <ArrowRight className="inline h-6 w-6 mx-3 text-gold" />
                  <span className="text-white/60">{to}</span>
                </>
              ) : (
                <>Browse Our <span className="text-gold-gradient">Fleet</span></>
              )}
            </h1>
            <p className="text-white/40">
              {loading ? 'Searching...' : `${aircraft.length} aircraft available`}
              {isRoundTrip && <span className="text-gold ml-2">Round Trip</span>}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters - Desktop Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="glass-card rounded-xl p-6 sticky top-28">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-gold" />
                  Filters
                </h3>

                {/* Aircraft Type */}
                <div className="mb-6">
                  <label className="text-xs text-white/40 uppercase tracking-wider block mb-3">
                    Aircraft Type
                  </label>
                  <div className="space-y-2">
                    {AIRCRAFT_TYPES.map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type)}
                          onChange={() => toggleType(type)}
                          className="w-4 h-4 rounded border-white/20 bg-jet-charcoal text-gold focus:ring-gold/30 cursor-pointer"
                        />
                        <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Passengers */}
                <div className="mb-6">
                  <label className="text-xs text-white/40 uppercase tracking-wider block mb-3">
                    Min. Passengers
                  </label>
                  <select
                    value={minPax}
                    onChange={(e) => setMinPax(e.target.value)}
                    className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/30"
                  >
                    <option value="">Any</option>
                    {[2,4,6,8,10,12,14,18,20,25,30,40,50].map(n => (
                      <option key={n} value={n}>{n}+ passengers</option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider block mb-3">
                    Sort By
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/30"
                  >
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="capacity">Passenger Capacity</option>
                    <option value="range">Range</option>
                  </select>
                </div>
              </div>
            </aside>

            {/* Mobile Filter Toggle */}
            <div className="lg:hidden">
              <button
                onClick={() => setFilterOpen(true)}
                className="flex items-center gap-2 text-sm text-white/60 border border-white/10 rounded-lg px-4 py-2 hover:border-gold/30 transition-colors"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {selectedTypes.length > 0 && (
                  <Badge variant="gold" className="ml-1">{selectedTypes.length}</Badge>
                )}
              </button>
            </div>

            {/* Mobile Filter Drawer */}
            {filterOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="fixed inset-0 bg-black/60" onClick={() => setFilterOpen(false)} />
                <div className="fixed bottom-0 left-0 right-0 bg-jet-dark border-t border-white/5 rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-white">Filters</h3>
                    <button onClick={() => setFilterOpen(false)}>
                      <X className="h-5 w-5 text-white/60" />
                    </button>
                  </div>

                  <div className="mb-6">
                    <label className="text-xs text-white/40 uppercase tracking-wider block mb-3">
                      Aircraft Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AIRCRAFT_TYPES.map(type => (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            selectedTypes.includes(type)
                              ? 'bg-gold/20 border-gold/30 text-gold'
                              : 'border-white/10 text-white/60 hover:border-white/20'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="text-xs text-white/40 uppercase tracking-wider block mb-3">
                      Min. Passengers
                    </label>
                    <select
                      value={minPax}
                      onChange={(e) => setMinPax(e.target.value)}
                      className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">Any</option>
                      {[2,4,6,8,10,12,14].map(n => (
                        <option key={n} value={n}>{n}+ passengers</option>
                      ))}
                    </select>
                  </div>

                  <Button onClick={() => setFilterOpen(false)} className="w-full">
                    Apply Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Results Grid */}
            <div className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Spinner size="lg" />
                </div>
              ) : aircraft.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-white/40 text-lg mb-4">No aircraft found matching your criteria.</p>
                  <Button variant="outline" onClick={() => { setSelectedTypes([]); setMinPax(''); }}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {aircraft.map((a) => (
                    <Link
                      key={a.id}
                      href={`/aircraft/${a.slug}${tripQuery ? `?${tripQuery}` : ''}`}
                      className="group glass-card rounded-xl overflow-hidden hover:border-gold/20 transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="relative h-52 overflow-hidden">
                        <img
                          src={a.heroImage}
                          alt={a.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-jet-black/80 via-transparent to-transparent" />
                        <Badge variant="gold" className="absolute top-3 left-3">
                          {a.type.name}
                        </Badge>
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-lg text-white mb-1 group-hover:text-gold transition-colors">
                          {a.name}
                        </h3>
                        <p className="text-xs text-white/40 mb-4">{a.manufacturer}</p>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="text-center">
                            <Users className="h-4 w-4 text-gold/60 mx-auto mb-1" />
                            <span className="text-xs text-white/50">{a.maxPassengers} pax</span>
                          </div>
                          <div className="text-center">
                            <Navigation className="h-4 w-4 text-gold/60 mx-auto mb-1" />
                            <span className="text-xs text-white/50">{a.maxRange.toLocaleString()} nm</span>
                          </div>
                          <div className="text-center">
                            <Gauge className="h-4 w-4 text-gold/60 mx-auto mb-1" />
                            <span className="text-xs text-white/50">{a.cruiseSpeed} kts</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <div>
                            <span className="text-gold font-semibold">
                              {formatCurrency(isRoundTrip ? a.displayPricePerHour * 2 : a.displayPricePerHour)}/hr
                            </span>
                            {isRoundTrip && (
                              <span className="block text-[10px] text-white/30">Round Trip</span>
                            )}
                          </div>
                          <span className="text-xs text-white/30 group-hover:text-gold/60 transition-colors flex items-center gap-1">
                            View Details <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-jet-black flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
