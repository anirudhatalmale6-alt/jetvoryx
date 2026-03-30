'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plane, MapPin, Calendar, Users, User, Mail, Phone, MessageSquare } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

function RequestFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aircraftSlug = searchParams.get('aircraft');
  const aircraftId = searchParams.get('aircraftId');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [aircraftName, setAircraftName] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    departureCity: '',
    arrivalCity: '',
    departureDate: '',
    returnDate: '',
    passengers: '1',
    specialRequests: '',
  });

  useEffect(() => {
    if (aircraftSlug) {
      fetch(`/api/aircraft/${aircraftSlug}`)
        .then(res => res.json())
        .then(data => { if (data.name) setAircraftName(data.name); })
        .catch(() => {});
    }
  }, [aircraftSlug]);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstName || !form.lastName || !form.email || !form.departureCity || !form.arrivalCity || !form.departureDate) {
      setError('Please fill in all required fields.');
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
              No payment required at this stage.
            </p>
            {aircraftName && (
              <Badge variant="outline" className="mt-4">
                Selected: {aircraftName}
              </Badge>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 sm:p-8">
            {/* Contact Info */}
            <div className="mb-8">
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
                <FormField
                  icon={MapPin}
                  label="Departure City *"
                  type="text"
                  placeholder="New York"
                  value={form.departureCity}
                  onChange={(v) => updateField('departureCity', v)}
                />
                <FormField
                  icon={MapPin}
                  label="Arrival City *"
                  type="text"
                  placeholder="Los Angeles"
                  value={form.arrivalCity}
                  onChange={(v) => updateField('arrivalCity', v)}
                />
                <FormField
                  icon={Calendar}
                  label="Departure Date *"
                  type="date"
                  value={form.departureDate}
                  onChange={(v) => updateField('departureDate', v)}
                />
                <FormField
                  icon={Calendar}
                  label="Return Date (optional)"
                  type="date"
                  value={form.returnDate}
                  onChange={(v) => updateField('returnDate', v)}
                />
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
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'passenger' : 'passengers'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            <div className="mb-8">
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
              ) : (
                'Submit Request'
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
