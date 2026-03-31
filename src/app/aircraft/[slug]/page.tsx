'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Users, Navigation, Gauge, Ruler, Package, Wifi, ChefHat,
  Armchair, Plug, Snowflake, Tv, Phone, Bed, ShowerHead,
  ArrowLeft, ArrowRight, X
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils';
import type { Aircraft } from '@/types';

const amenityIcons: Record<string, typeof Wifi> = {
  'Wi-Fi': Wifi,
  'Full Galley': ChefHat,
  'Leather Seating': Armchair,
  'Power Outlets': Plug,
  'Climate Control': Snowflake,
  'Entertainment System': Tv,
  'Satellite Phone': Phone,
  'Sleeping Configuration': Bed,
  'Shower': ShowerHead,
};

export default function AircraftDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Carry trip params from search page through to request form
  const tripParams = new URLSearchParams();
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const dateParam = searchParams.get('date');
  const passengersParam = searchParams.get('passengers');
  const tripTypeParam = searchParams.get('tripType');
  const isRoundTrip = tripTypeParam === 'round_trip';
  if (fromParam) tripParams.set('from', fromParam);
  if (toParam) tripParams.set('to', toParam);
  if (dateParam) tripParams.set('date', dateParam);
  if (passengersParam) tripParams.set('passengers', passengersParam);
  if (tripTypeParam) tripParams.set('tripType', tripTypeParam);
  const tripQuery = tripParams.toString();

  useEffect(() => {
    if (params.slug) {
      fetch(`/api/aircraft/${params.slug}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) setAircraft(data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-jet-black">
        <Header />
        <div className="flex items-center justify-center pt-40">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="min-h-screen bg-jet-black">
        <Header />
        <div className="text-center pt-40">
          <h1 className="font-display text-2xl font-bold mb-4">Aircraft Not Found</h1>
          <Link href="/search">
            <Button variant="outline">Browse Fleet</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jet-black">
      <Header />

      <div className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href="/search" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-gold transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Fleet
            </Link>
          </div>

          {/* Hero Image */}
          <div className="relative rounded-2xl overflow-hidden mb-8 h-[300px] sm:h-[400px] lg:h-[500px]">
            <img
              src={aircraft.heroImage}
              alt={aircraft.name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => { setLightboxOpen(true); setLightboxIndex(0); }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-jet-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <Badge variant="gold" className="mb-3">{aircraft.type.name}</Badge>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-2">
                {aircraft.name}
              </h1>
              <p className="text-white/60">{aircraft.manufacturer}</p>
            </div>

            {/* Thumbnail strip */}
            {aircraft.images.length > 1 && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                {aircraft.images.slice(0, 4).map((img, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); setLightboxIndex(i); }}
                    className="w-16 h-12 rounded-lg overflow-hidden border-2 border-white/20 hover:border-gold/60 transition-colors"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              {aircraft.description && (
                <div className="glass-card rounded-xl p-6">
                  <h2 className="font-display text-xl font-semibold mb-4">About This Aircraft</h2>
                  <p className="text-white/60 leading-relaxed">{aircraft.description}</p>
                </div>
              )}

              {/* Specs Grid */}
              <div className="glass-card rounded-xl p-6">
                <h2 className="font-display text-xl font-semibold mb-6">Specifications</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  <SpecItem icon={Users} label="Passengers" value={`Up to ${aircraft.maxPassengers}`} />
                  <SpecItem icon={Navigation} label="Range" value={`${aircraft.maxRange.toLocaleString()} nm`} />
                  <SpecItem icon={Gauge} label="Cruise Speed" value={`${aircraft.cruiseSpeed} kts`} />
                  {aircraft.cabinHeight && (
                    <SpecItem icon={Ruler} label="Cabin Height" value={`${aircraft.cabinHeight} ft`} />
                  )}
                  {aircraft.cabinWidth && (
                    <SpecItem icon={Ruler} label="Cabin Width" value={`${aircraft.cabinWidth} ft`} />
                  )}
                  {aircraft.cabinLength && (
                    <SpecItem icon={Ruler} label="Cabin Length" value={`${aircraft.cabinLength} ft`} />
                  )}
                  {aircraft.baggageVolume && (
                    <SpecItem icon={Package} label="Baggage" value={`${aircraft.baggageVolume} cu ft`} />
                  )}
                  {aircraft.yearMin && aircraft.yearMax && (
                    <SpecItem icon={Gauge} label="Year Range" value={`${aircraft.yearMin} - ${aircraft.yearMax}`} />
                  )}
                </div>
              </div>

              {/* Amenities */}
              {aircraft.amenities.length > 0 && (
                <div className="glass-card rounded-xl p-6">
                  <h2 className="font-display text-xl font-semibold mb-6">Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {aircraft.amenities.map((amenity) => {
                      const Icon = amenityIcons[amenity] || Plug;
                      return (
                        <div
                          key={amenity}
                          className="flex items-center gap-3 p-3 rounded-lg bg-jet-charcoal/50 border border-white/5"
                        >
                          <Icon className="h-4 w-4 text-gold/60 flex-shrink-0" />
                          <span className="text-sm text-white/70">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Pricing & CTA */}
            <div className="lg:col-span-1">
              <div className="glass-card rounded-xl p-6 sticky top-28">
                <div className="text-center mb-6">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
                    {isRoundTrip ? 'Round Trip' : 'Starting From'}
                  </p>
                  <p className="font-display text-4xl font-bold text-gold-gradient">
                    {formatCurrency(isRoundTrip ? aircraft.displayPricePerHour * 2 : aircraft.displayPricePerHour)}
                  </p>
                  <p className="text-sm text-white/40 mt-1">
                    per flight hour{isRoundTrip && ' (2x one-way)'}
                  </p>
                </div>

                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex justify-between text-white/50">
                    <span>Aircraft Type</span>
                    <span className="text-white/80">{aircraft.type.name}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Max Passengers</span>
                    <span className="text-white/80">{aircraft.maxPassengers}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Max Range</span>
                    <span className="text-white/80">{aircraft.maxRange.toLocaleString()} nm</span>
                  </div>
                </div>

                <Link href={`/request?aircraft=${aircraft.slug}&aircraftId=${aircraft.id}${tripQuery ? `&${tripQuery}` : ''}`}>
                  <Button size="lg" className="w-full mb-3">
                    Request This Aircraft <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <p className="text-xs text-white/30 text-center">
                  No payment required. We&apos;ll confirm availability first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxOpen(false)}>
          <button className="absolute top-6 right-6 text-white/60 hover:text-white">
            <X className="h-8 w-8" />
          </button>
          <img
            src={aircraft.images[lightboxIndex]}
            alt={aircraft.name}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {aircraft.images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex - 1 + aircraft.images.length) % aircraft.images.length);
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 rounded-full p-3"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % aircraft.images.length);
                }}
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}

function SpecItem({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-gold/60" />
        <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}
