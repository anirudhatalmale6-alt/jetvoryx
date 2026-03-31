'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plane, Search, Shield, ArrowRight, Users, Calendar, Globe, Crown, Cpu } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import AirportSelect from '@/components/ui/AirportSelect';
import GlobalRouteMap from '@/components/landing/GlobalRouteMap';
import { formatCurrency } from '@/lib/utils';
import type { Aircraft } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState('');
  const [tripType, setTripType] = useState<'one_way' | 'round_trip'>('one_way');
  const [featured, setFeatured] = useState<Aircraft[]>([]);

  useEffect(() => {
    fetch('/api/aircraft?featured=true')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFeatured(data.slice(0, 4));
      })
      .catch(() => {});
  }, []);

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (date) params.set('date', date);
    if (passengers) params.set('passengers', passengers);
    if (tripType === 'round_trip') params.set('tripType', 'round_trip');
    return params.toString();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?${buildSearchParams()}`);
  };

  const handleRequestFlight = () => {
    router.push(`/request?${buildSearchParams()}`);
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
          <div className="absolute inset-0 bg-gradient-to-b from-jet-black/80 via-jet-black/60 to-jet-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-jet-black/70 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 w-full">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in mb-8">
              <Badge variant="gold" className="inline-flex">
                <Plane className="h-3 w-3 mr-1.5" />
                Private Aviation, Elevated
              </Badge>
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-bold leading-[0.95] mb-8 animate-fade-in-up tracking-tight">
              Fly With{' '}
              <span className="text-gold-gradient">More</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-14 animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
              Access the world&apos;s finest private jets from 17+ premium sources.
              Personalized comfort, superior range, unmatched service.
            </p>

            {/* Search Form */}
            <form
              onSubmit={handleSearch}
              className="glass rounded-2xl p-8 animate-fade-in-up max-w-4xl mx-auto"
              style={{ animationDelay: '0.2s' }}
            >
              {/* Trip Type Toggle */}
              <div className="flex gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => setTripType('one_way')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    tripType === 'one_way'
                      ? 'bg-gold/20 border border-gold/40 text-gold'
                      : 'border border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  One Way
                </button>
                <button
                  type="button"
                  onClick={() => setTripType('round_trip')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    tripType === 'round_trip'
                      ? 'bg-gold/20 border border-gold/40 text-gold'
                      : 'border border-white/10 text-white/40 hover:text-white/60'
                  }`}
                >
                  Round Trip
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">From</label>
                  <AirportSelect
                    value={from}
                    onChange={(v) => setFrom(v)}
                    placeholder="Departure city or airport"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">To</label>
                  <AirportSelect
                    value={to}
                    onChange={(v) => setTo(v)}
                    placeholder="Arrival city or airport"
                  />
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
                      {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'passenger' : 'passengers'}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" size="lg" className="w-full sm:w-auto">
                  <Search className="h-4 w-4 mr-2" />
                  Search Fleet
                </Button>
                <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto" onClick={handleRequestFlight}>
                  <Plane className="h-4 w-4 mr-2" />
                  Request a Flight
                </Button>
              </div>
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

      {/* Three Pillars - BBJ style */}
      <section id="how-it-works" className="py-28 bg-jet-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-display text-3xl sm:text-5xl font-bold mb-5 tracking-tight">
              Why <span className="text-gold-gradient">JETVORYX</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-lg">
              Three pillars that define the JETVORYX experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Crown,
                title: 'Comfort',
                desc: 'Handpicked aircraft with premium interiors, gourmet catering, and personalized cabin configurations. Every detail curated for an experience that exceeds expectations.',
                image: 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=600&q=80',
              },
              {
                icon: Globe,
                title: 'Range',
                desc: '471+ aircraft from 17 premium sources worldwide. From light jets for quick hops to ultra-long-range cabins for nonstop intercontinental travel.',
                image: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=600&q=80',
              },
              {
                icon: Cpu,
                title: 'Technology',
                desc: 'Real-time fleet availability, instant pricing, and seamless digital booking. Our platform aggregates the world\'s leading operators into one powerful search.',
                image: 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=600&q=80',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group text-center"
              >
                <div className="relative h-56 rounded-2xl overflow-hidden mb-8">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-jet-black/70 to-transparent" />
                  <div className="absolute bottom-5 left-0 right-0 flex justify-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/20 border border-gold/30 backdrop-blur-sm">
                      <item.icon className="h-6 w-6 text-gold" />
                    </div>
                  </div>
                </div>
                <h3 className="font-display text-2xl font-semibold mb-4">{item.title}</h3>
                <p className="text-white/40 leading-relaxed max-w-sm mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Route Map */}
      <section className="py-24 bg-jet-black overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Global Coverage</Badge>
            <h2 className="font-display text-3xl sm:text-5xl font-bold mb-5 tracking-tight">
              Worldwide <span className="text-gold-gradient">Reach</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-lg">
              Connecting the world&apos;s most important destinations with seamless private aviation.
            </p>
          </div>
          <GlobalRouteMap />
        </div>
      </section>

      {/* How It Works - Streamlined */}
      <section className="py-28 bg-jet-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-display text-3xl sm:text-5xl font-bold mb-5 tracking-tight">
              How It <span className="text-gold-gradient">Works</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-lg">
              From search to takeoff in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
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
                className="relative glass-card rounded-2xl p-10 text-center group hover:border-gold/20 transition-all duration-300"
              >
                <div className="text-7xl font-display font-bold text-white/[0.04] absolute top-4 right-6">
                  {item.step}
                </div>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 mb-8 group-hover:bg-gold/20 transition-colors">
                  <item.icon className="h-7 w-7 text-gold" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-4">{item.title}</h3>
                <p className="text-white/40 leading-relaxed">{item.desc}</p>
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
              { value: '470+', label: 'Aircraft Available' },
              { value: '17', label: 'Premium Sources' },
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
