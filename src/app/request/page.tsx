'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Plane, Calendar, Users, User, Mail, Phone, MessageSquare, ArrowRight, Lock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import AirportSelect from '@/components/ui/AirportSelect';

function RequestFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const aircraftSlug = searchParams.get('aircraft');
  const aircraftId = searchParams.get('aircraftId');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [aircraftName, setAircraftName] = useState('');
  const [aircraftPrice, setAircraftPrice] = useState(0);
  const [tripType, setTripType] = useState<'one_way' | 'round_trip'>(
    searchParams.get('tripType') === 'round_trip' ? 'round_trip' : 'one_way'
  );

  const isLoggedIn = status === 'authenticated' && session?.user;
  const userProfile = session?.user as Record<string, unknown> | undefined;

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departureCity: searchParams.get('from') || '',
    arrivalCity: searchParams.get('to') || '',
    departureDate: searchParams.get('date') || '',
    returnDate: '',
    passengers: searchParams.get('passengers') || '1',
    specialRequests: '',
  });

  // Pre-fill from user session
  useEffect(() => {
    if (userProfile) {
      setForm(prev => ({
        ...prev,
        firstName: (userProfile.firstName as string) || prev.firstName,
        lastName: (userProfile.lastName as string) || prev.lastName,
        email: (userProfile.email as string) || prev.email,
        phone: (userProfile.phone as string) || prev.phone,
      }));
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (aircraftSlug) {
      fetch(`/api/aircraft/${aircraftSlug}`)
        .then(res => res.json())
        .then(data => {
          if (data.name) setAircraftName(data.name);
          if (data.displayPricePerHour) setAircraftPrice(data.displayPricePerHour);
        })
        .catch(() => {});
    }
  }, [aircraftSlug]);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const displayPrice = tripType === 'round_trip' ? aircraftPrice * 2 : aircraftPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      const currentUrl = window.location.href;
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }

    if (!form.firstName || !form.lastName || !form.email || !form.departureCity || !form.arrivalCity || !form.departureDate) {
      setError('Please fill in all required fields.');
      return;
    }

    if (tripType === 'round_trip' && !form.returnDate) {
      setError('Please select a return date for round trip.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tripType,
          aircraftId: aircraftId || undefined,
          returnDate: form.returnDate || undefined,
          phone: form.phone || undefined,
          specialRequests: form.specialRequests || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.id) {
        router.push(`/request/${data.id}`);
      } else {
        setError(data.error || 'Failed to submit request. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto scroll refs
  const tripRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-jet-black">
      <Header />

      <div className="pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-10">
            <Badge variant="gold" className="mb-4">
              <Plane className="h-3 w-3 mr-1.5" />
              Request a Flight
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
              Tell Us About Your <span className="text-gold-gradient">Trip</span>
            </h1>
            <p className="text-white/40 max-w-md mx-auto">
              Share your travel details and we&apos;ll find the perfect aircraft for your journey.
            </p>
            {aircraftName && (
              <Badge variant="outline" className="mt-4">
                Selected: {aircraftName}
              </Badge>
            )}
          </div>

          {/* Auth Gate */}
          {!isLoggedIn && status !== 'loading' && (
            <div className="glass-card rounded-xl p-6 mb-6 border border-gold/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">Account Required</h3>
                  <p className="text-sm text-white/40 mb-4">
                    Please log in or create an account to submit a booking request.
                  </p>
                  <div className="flex gap-3">
                    <Link href={`/login?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '/request')}`}>
                      <Button size="sm">Sign In</Button>
                    </Link>
                    <Link href={`/signup?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '/request')}`}>
                      <Button variant="outline" size="sm">Create Account</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 sm:p-8">
            {/* Trip Type Toggle */}
            <div className="mb-8">
              <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <Plane className="h-4 w-4 text-gold" />
                Trip Type
              </h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTripType('one_way')}
                  className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                    tripType === 'one_way'
                      ? 'bg-gold/20 border-gold/40 text-gold'
                      : 'border-white/10 text-white/50 hover:border-white/20'
                  }`}
                >
                  One Way
                </button>
                <button
                  type="button"
                  onClick={() => setTripType('round_trip')}
                  className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                    tripType === 'round_trip'
                      ? 'bg-gold/20 border-gold/40 text-gold'
                      : 'border-white/10 text-white/50 hover:border-white/20'
                  }`}
                >
                  Round Trip
                </button>
              </div>
              {aircraftPrice > 0 && (
                <div className="mt-3 text-sm text-white/40">
                  Estimated: <span className="text-gold font-semibold">
                    ${displayPrice.toLocaleString()}/hr
                  </span>
                  {tripType === 'round_trip' && (
                    <span className="text-white/30 ml-1">(2x one-way)</span>
                  )}
                </div>
              )}
            </div>

            {/* Contact Info */}
            <div className="mb-8" ref={tripRef}>
              <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-gold" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  icon={User}
                  label="First Name *"
                  type="text"
                  placeholder="John"
                  value={form.firstName}
                  onChange={(v) => updateField('firstName', v)}
                />
                <FormField
                  icon={User}
                  label="Last Name *"
                  type="text"
                  placeholder="Smith"
                  value={form.lastName}
                  onChange={(v) => updateField('lastName', v)}
                />
                <FormField
                  icon={Mail}
                  label="Email *"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(v) => updateField('email', v)}
                />
                <FormField
                  icon={Phone}
                  label="Phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(v) => updateField('phone', v)}
                />
              </div>
            </div>

            {/* Trip Details */}
            <div className="mb-8">
              <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <Plane className="h-4 w-4 text-gold" />
                Trip Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AirportSelect
                  label="Departure City *"
                  value={form.departureCity}
                  onChange={(v) => updateField('departureCity', v)}
                  placeholder="Search departure airport..."
                />
                <AirportSelect
                  label="Arrival City *"
                  value={form.arrivalCity}
                  onChange={(v) => updateField('arrivalCity', v)}
                  placeholder="Search arrival airport..."
                />
                <FormField
                  icon={Calendar}
                  label="Departure Date *"
                  type="date"
                  value={form.departureDate}
                  onChange={(v) => updateField('departureDate', v)}
                />
                {tripType === 'round_trip' ? (
                  <FormField
                    icon={Calendar}
                    label="Return Date *"
                    type="date"
                    value={form.returnDate}
                    onChange={(v) => updateField('returnDate', v)}
                  />
                ) : (
                  <FormField
                    icon={Calendar}
                    label="Return Date (optional)"
                    type="date"
                    value={form.returnDate}
                    onChange={(v) => updateField('returnDate', v)}
                  />
                )}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
                    <Users className="inline h-3 w-3 mr-1 text-gold/60" />
                    Passengers *
                  </label>
                  <select
                    value={form.passengers}
                    onChange={(e) => updateField('passengers', e.target.value)}
                    className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold/30 transition-colors"
                  >
                    {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'passenger' : 'passengers'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            <div className="mb-8" ref={submitRef}>
              <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gold" />
                Special Requests
              </h3>
              <textarea
                placeholder="Any specific requirements, preferences, or questions..."
                value={form.specialRequests}
                onChange={(e) => updateField('specialRequests', e.target.value)}
                rows={4}
                className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors resize-none"
              />
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : !isLoggedIn && status !== 'loading' ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Sign In to Submit Request
                </>
              ) : (
                <>
                  Submit Request <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-white/30 text-center mt-4">
              No payment required. Our team will review your request and contact you with available options.
            </p>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function FormField({
  icon: Icon,
  label,
  type,
  placeholder,
  value,
  onChange,
}: {
  icon: typeof User;
  label: string;
  type: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">
        <Icon className="inline h-3 w-3 mr-1 text-gold/60" />
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-jet-muted focus:outline-none focus:border-gold/30 transition-colors"
      />
    </div>
  );
}

export default function RequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-jet-black flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    }>
      <RequestFormContent />
    </Suspense>
  );
}
