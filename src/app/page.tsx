'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plane, Search, Shield, ArrowRight, Users, MapPin, Calendar } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import type { Aircraft } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState('');
  const [featured, setFeatured] = useState<Aircraft[]>([]);

  useEffect(() => {
    fetch('/api/aircraft?featured=true')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFeatured(data.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (date) params.set('date', date);
    if (passengers) params.set('passengers', passengers);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-jet-black">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1920&q=80)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-jet-black/70 via-jet-black/50 to-jet-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-jet-black/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
          <div className="max-w-3xl">
            <div className="animate-fade-in">
              <Badge variant="gold" className="mb-6">
                <Plane className="h-3 w-3 mr-1.5" />
                Private Aviation, Elevated
              </Badge>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-in-up">
              Your Journey,{' '}
              <span className="text-gold-gradient">Redefined</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/60 max-w-xl mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Access the world&apos;s finest private jets. Compare, select, and fly with
              unparalleled luxury and convenience.
            </p>

            {/* Search Form */}
            <form
              onSubmit={handleSearch}
              className="glass rounded-2xl p-6 animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">From</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/60" />
                    <input
                      type="text"
                      placeholder="Departure city"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-full bg-jet-dark/60 border border-white/5 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/60" />
                    <input
                      type="text"
                      placeholder="Arrival city"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full bg-jet-dark/60 border border-white/5 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/60" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-jet-dark/60 border border-white/5 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Passengers</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/60" />
                    <select
                      value={passengers}
                      onChange={(e) => setPassengers(e.target.value)}
                      className="w-full bg-jet-dark/60 border border-white/5 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-gold/30 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">Any</option>
                      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'passenger' : 'passengers'}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                <Search className="h-4 w-4 mr-2" />
                Search Fleet
              </Button>
            </form>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 bg-gold/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* Featured Fleet */}
      {featured.length > 0 && (
        <section className="py-24 bg-jet-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Featured Fleet</Badge>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                Handpicked <span className="text-gold-gradient">Excellence</span>
              </h2>
              <p className="text-white/40 max-w-lg mx-auto">
                Our curated selection of premium aircraft, ready for your next journey.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((aircraft) => (
                <Link
                  key={aircraft.id}
                  href={`/aircraft/${aircraft.slug}`}
                  className="group glass-card rounded-xl overflow-hidden hover:border-gold/20 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={aircraft.heroImage}
                      alt={aircraft.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-jet-black/80 to-transparent" />
                    <Badge variant="gold" className="absolute top-3 left-3">
                      {aircraft.type.name}
                    </Badge>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-white mb-1 group-hover:text-gold transition-colors">
                      {aircraft.name}
                    </h3>
                    <p className="text-xs text-white/40 mb-3">{aircraft.manufacturer}</p>
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {aircraft.maxPassengers} pax
                      </span>
                      <span className="text-gold font-semibold">
                        {formatCurrency(aircraft.displayPricePerHour)}/hr
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/search">
                <Button variant="outline" size="lg">
                  View Full Fleet <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-jet-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Simple Process</Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              How It <span className="text-gold-gradient">Works</span>
            </h2>
            <p className="text-white/40 max-w-lg mx-auto">
              From search to takeoff in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: Search,
                title: 'Search & Select',
                desc: 'Browse our fleet of premium aircraft. Filter by type, capacity, and budget to find your perfect match.',
              },
              {
                step: '02',
                icon: Shield,
                title: 'Request & Confirm',
                desc: 'Submit your trip details. Our team reviews and confirms availability, then sends you a secure payment link.',
              },
              {
                step: '03',
                icon: Plane,
                title: 'Pay & Fly',
                desc: 'Complete your payment securely. We handle all the logistics. You just show up and enjoy the journey.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="relative glass-card rounded-xl p-8 text-center group hover:border-gold/20 transition-all duration-300"
              >
                <div className="text-6xl font-display font-bold text-white/[0.03] absolute top-4 right-6">
                  {item.step}
                </div>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gold/10 border border-gold/20 mb-6 group-hover:bg-gold/20 transition-colors">
                  <item.icon className="h-6 w-6 text-gold" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 bg-jet-black border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '200+', label: 'Aircraft Available' },
              { value: '50+', label: 'Global Destinations' },
              { value: '24/7', label: 'Concierge Service' },
              { value: '100%', label: 'White-Glove Experience' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="font-display text-3xl sm:text-4xl font-bold text-gold-gradient mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-jet-dark">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-5xl font-bold mb-6">
            Ready to <span className="text-gold-gradient">Elevate</span> Your Journey?
          </h2>
          <p className="text-lg text-white/40 mb-10 max-w-xl mx-auto">
            Experience private aviation the way it should be. No compromises, no complications.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/search">
              <Button size="lg">
                Browse Fleet <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/request">
              <Button variant="outline" size="lg">
                Request a Flight
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
