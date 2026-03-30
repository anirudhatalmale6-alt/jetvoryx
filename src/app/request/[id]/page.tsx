'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, Clock, ArrowLeft, Plane, MapPin, Calendar, Users, Copy, CheckCheck } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { formatDate, getStatusLabel } from '@/lib/utils';
import { REQUEST_STATUS_FLOW } from '@/lib/constants';
import type { TripRequest } from '@/types';

export default function RequestStatusPage() {
  const params = useParams();
  const [request, setRequest] = useState<TripRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/requests/${params.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) setRequest(data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  const copyId = () => {
    navigator.clipboard.writeText(params.id as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  if (!request) {
    return (
      <div className="min-h-screen bg-jet-black">
        <Header />
        <div className="text-center pt-40">
          <h1 className="font-display text-2xl font-bold mb-4">Request Not Found</h1>
          <p className="text-white/40 mb-6">This request ID doesn&apos;t exist or may have expired.</p>
          <Link href="/request">
            <Button variant="outline">Submit New Request</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = REQUEST_STATUS_FLOW.indexOf(request.status as typeof REQUEST_STATUS_FLOW[number]);

  return (
    <div className="min-h-screen bg-jet-black">
      <Header />

      <div className="pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <div className="mb-6">
            <Link href="/search" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-gold transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Browse Fleet
            </Link>
          </div>

          {/* Success Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 border border-gold/20 mb-6">
              <Check className="h-8 w-8 text-gold" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">
              Request Submitted
            </h1>
            <p className="text-white/40 mb-4">
              Thank you, {request.firstName}. We&apos;re reviewing your request.
            </p>

            {/* Request ID */}
            <div className="inline-flex items-center gap-2 bg-jet-charcoal rounded-lg px-4 py-2 border border-white/5">
              <span className="text-xs text-white/40">Request ID:</span>
              <code className="text-sm text-gold font-mono">{request.id}</code>
              <button onClick={copyId} className="text-white/40 hover:text-white transition-colors">
                {copied ? <CheckCheck className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="glass-card rounded-xl p-6 sm:p-8 mb-8">
            <h2 className="font-display text-lg font-semibold mb-6">Request Status</h2>

            <div className="space-y-0">
              {REQUEST_STATUS_FLOW.map((status, i) => {
                const isCompleted = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;

                return (
                  <div key={status} className="flex gap-4">
                    {/* Timeline Line + Dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                          isCompleted
                            ? 'bg-gold/20 border-gold text-gold'
                            : 'border-white/10 text-white/20'
                        } ${isCurrent ? 'ring-4 ring-gold/10' : ''}`}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      {i < REQUEST_STATUS_FLOW.length - 1 && (
                        <div className={`w-0.5 h-12 ${isCompleted ? 'bg-gold/30' : 'bg-white/5'}`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-8">
                      <p className={`font-medium ${isCompleted ? 'text-white' : 'text-white/30'}`}>
                        {getStatusLabel(status)}
                      </p>
                      {isCurrent && (
                        <Badge variant="gold" className="mt-1">Current</Badge>
                      )}
                      {/* Show note from status history if available */}
                      {request.statusHistory
                        .filter(e => e.status === status)
                        .map(e => e.note && (
                          <p key={e.id} className="text-xs text-white/40 mt-1">{e.note}</p>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trip Summary */}
          <div className="glass-card rounded-xl p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold mb-6">Trip Summary</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <SummaryItem icon={MapPin} label="From" value={request.departureCity} />
              <SummaryItem icon={MapPin} label="To" value={request.arrivalCity} />
              <SummaryItem icon={Calendar} label="Departure" value={formatDate(request.departureDate)} />
              {request.returnDate && (
                <SummaryItem icon={Calendar} label="Return" value={formatDate(request.returnDate)} />
              )}
              <SummaryItem icon={Users} label="Passengers" value={`${request.passengers}`} />
              {request.aircraftName && (
                <SummaryItem icon={Plane} label="Aircraft" value={request.aircraftName} />
              )}
            </div>

            {request.specialRequests && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Special Requests</p>
                <p className="text-sm text-white/60">{request.specialRequests}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-gold/60" />
        <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}
