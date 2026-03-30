'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils';
import { REQUEST_STATUS_FLOW } from '@/lib/constants';
import {
  CheckCircle,
  XCircle,
  DollarSign,
  Eye,
  X,
  Clock,
  CreditCard,
  Copy,
} from 'lucide-react';

interface Request {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  returnDate: string | null;
  passengers: number;
  specialRequests: string | null;
  estimatedPrice: number | null;
  status: string;
  createdAt: string;
  aircraft: { name: string; heroImage: string; type: { name: string } } | null;
  statusHistory: Array<{ id: string; status: string; note: string | null; createdAt: string }>;
  paymentLinks: Array<{ id: string; stripeUrl: string; amount: number; status: string; createdAt: string }>;
}

export default function AdminRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Request | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/requests?status=${filter}`);
      const data = await res.json();
      setRequests(data.requests);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const updateStatus = async (id: string, status: string, note?: string) => {
    setActionLoading(true);
    try {
      await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      await fetchRequests();
      if (selected?.id === id) {
        const res = await fetch(`/api/admin/requests/${id}`);
        setSelected(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setActionLoading(false);
  };

  const sendPaymentLink = async (id: string) => {
    if (!paymentAmount) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/requests/${id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          description: paymentDesc || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPayment(false);
        setPaymentAmount('');
        setPaymentDesc('');
        await fetchRequests();
        if (selected?.id === id) {
          const r = await fetch(`/api/admin/requests/${id}`);
          setSelected(await r.json());
        }
      } else {
        alert(data.error || 'Failed to create payment link');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to create payment link');
    }
    setActionLoading(false);
  };

  const viewRequest = async (id: string) => {
    const res = await fetch(`/api/admin/requests/${id}`);
    setSelected(await res.json());
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">Requests</h1>
            <p className="text-jet-light text-sm mt-1">{total} total requests</p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
          {REQUEST_STATUS_FLOW.map(s => (
            <FilterBtn
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={getStatusLabel(s)}
            />
          ))}
          <FilterBtn active={filter === 'cancelled'} onClick={() => setFilter('cancelled')} label="Cancelled" />
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="bg-jet-dark border border-white/5 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-jet-muted text-xs uppercase tracking-wider border-b border-white/5">
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-left py-3 px-4">Route</th>
                    <th className="text-left py-3 px-4">Aircraft</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">PAX</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Price</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {requests.map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-white">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-jet-muted">{r.email}</p>
                      </td>
                      <td className="py-3 px-4 text-jet-light">
                        {r.departureCity} &rarr; {r.arrivalCity}
                      </td>
                      <td className="py-3 px-4 text-jet-light text-xs">
                        {r.aircraft?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-jet-light text-xs">
                        {formatDate(r.departureDate)}
                      </td>
                      <td className="py-3 px-4 text-jet-light">{r.passengers}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium ${getStatusColor(r.status)}`}>
                          {getStatusLabel(r.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white">
                        {r.estimatedPrice ? formatCurrency(r.estimatedPrice) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => viewRequest(r.id)}
                            className="p-1.5 text-jet-light hover:text-white hover:bg-white/5 rounded transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {r.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateStatus(r.id, 'reviewed', 'Request reviewed by admin')}
                                className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                                title="Mark as reviewed"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => updateStatus(r.id, 'cancelled', 'Request declined')}
                                className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                title="Cancel"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {(r.status === 'reviewed' || r.status === 'quoted' || r.status === 'confirmed') && (
                            <button
                              onClick={() => {
                                viewRequest(r.id);
                                setShowPayment(true);
                                setPaymentAmount(r.estimatedPrice?.toString() || '');
                              }}
                              className="p-1.5 text-gold hover:bg-gold/10 rounded transition-colors"
                              title="Send payment link"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-jet-muted">
                        No requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Request Detail Drawer */}
        {selected && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/60" onClick={() => { setSelected(null); setShowPayment(false); }} />
            <div className="relative w-full max-w-lg bg-jet-dark border-l border-white/5 overflow-y-auto">
              <div className="sticky top-0 bg-jet-dark border-b border-white/5 p-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-display font-semibold text-white">Request Details</h2>
                <button
                  onClick={() => { setSelected(null); setShowPayment(false); }}
                  className="text-jet-light hover:text-white p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Client Info */}
                <Section title="Client">
                  <InfoRow label="Name" value={`${selected.firstName} ${selected.lastName}`} />
                  <InfoRow label="Email" value={selected.email} />
                  <InfoRow label="Phone" value={selected.phone || 'Not provided'} />
                </Section>

                {/* Trip Info */}
                <Section title="Trip Details">
                  <InfoRow label="Route" value={`${selected.departureCity} → ${selected.arrivalCity}`} />
                  <InfoRow label="Departure" value={formatDate(selected.departureDate)} />
                  {selected.returnDate && <InfoRow label="Return" value={formatDate(selected.returnDate)} />}
                  <InfoRow label="Passengers" value={selected.passengers.toString()} />
                  {selected.aircraft && (
                    <InfoRow label="Aircraft" value={`${selected.aircraft.name} (${selected.aircraft.type.name})`} />
                  )}
                  {selected.specialRequests && (
                    <InfoRow label="Special Requests" value={selected.specialRequests} />
                  )}
                </Section>

                {/* Status */}
                <Section title="Status">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-sm font-medium ${getStatusColor(selected.status)}`}>
                      {getStatusLabel(selected.status)}
                    </span>
                    {selected.estimatedPrice && (
                      <span className="text-sm text-white ml-auto">
                        {formatCurrency(selected.estimatedPrice)}
                      </span>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    {selected.status === 'pending' && (
                      <>
                        <ActionBtn
                          label="Reviewed"
                          color="blue"
                          loading={actionLoading}
                          onClick={() => updateStatus(selected.id, 'reviewed')}
                        />
                        <ActionBtn
                          label="Cancel"
                          color="red"
                          loading={actionLoading}
                          onClick={() => updateStatus(selected.id, 'cancelled')}
                        />
                      </>
                    )}
                    {selected.status === 'reviewed' && (
                      <>
                        <ActionBtn
                          label="Send Quote"
                          color="purple"
                          loading={actionLoading}
                          onClick={() => updateStatus(selected.id, 'quoted', 'Quote prepared')}
                        />
                        <ActionBtn
                          label="Confirm"
                          color="gold"
                          loading={actionLoading}
                          onClick={() => updateStatus(selected.id, 'confirmed', 'Request confirmed')}
                        />
                      </>
                    )}
                    {(selected.status === 'quoted' || selected.status === 'confirmed') && (
                      <ActionBtn
                        label="Send Payment Link"
                        color="gold"
                        icon={<CreditCard className="h-3.5 w-3.5" />}
                        loading={actionLoading}
                        onClick={() => setShowPayment(true)}
                      />
                    )}
                    {selected.status === 'paid' && (
                      <ActionBtn
                        label="Mark Complete"
                        color="green"
                        loading={actionLoading}
                        onClick={() => updateStatus(selected.id, 'completed', 'Booking completed')}
                      />
                    )}
                  </div>
                </Section>

                {/* Payment Link Form */}
                {showPayment && (
                  <Section title="Create Payment Link">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-jet-muted mb-1">Amount (USD)</label>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
                          placeholder="25000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-jet-muted mb-1">Description (optional)</label>
                        <input
                          type="text"
                          value={paymentDesc}
                          onChange={e => setPaymentDesc(e.target.value)}
                          className="w-full bg-jet-charcoal border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50"
                          placeholder="Private jet charter..."
                        />
                      </div>
                      <button
                        onClick={() => sendPaymentLink(selected.id)}
                        disabled={actionLoading || !paymentAmount}
                        className="w-full bg-gold-gradient text-jet-black text-sm font-medium py-2.5 rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50"
                      >
                        {actionLoading ? 'Creating...' : 'Generate & Send Payment Link'}
                      </button>
                    </div>
                  </Section>
                )}

                {/* Payment Links */}
                {selected.paymentLinks && selected.paymentLinks.length > 0 && (
                  <Section title="Payment Links">
                    {selected.paymentLinks.map(pl => (
                      <div key={pl.id} className="bg-jet-charcoal rounded-lg p-3 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white">{formatCurrency(pl.amount)}</span>
                          <span className={`text-xs ${pl.status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {pl.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={pl.stripeUrl}
                            readOnly
                            className="flex-1 bg-jet-black border border-white/5 rounded px-2 py-1 text-xs text-jet-light"
                          />
                          <button
                            onClick={() => navigator.clipboard.writeText(pl.stripeUrl)}
                            className="p-1 text-jet-light hover:text-gold transition-colors"
                            title="Copy link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-jet-muted mt-1">{formatDate(pl.createdAt)}</p>
                      </div>
                    ))}
                  </Section>
                )}

                {/* Status History */}
                <Section title="History">
                  <div className="space-y-2">
                    {selected.statusHistory.map(event => (
                      <div key={event.id} className="flex items-start gap-3">
                        <Clock className="h-3.5 w-3.5 text-jet-muted mt-0.5 shrink-0" />
                        <div>
                          <span className={`text-xs font-medium ${getStatusColor(event.status)}`}>
                            {getStatusLabel(event.status)}
                          </span>
                          {event.note && <p className="text-xs text-jet-muted">{event.note}</p>}
                          <p className="text-xs text-jet-muted">{formatDate(event.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Request ID */}
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-jet-muted">Request ID: {selected.id}</p>
                  <p className="text-xs text-jet-muted">Created: {formatDate(selected.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function FilterBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-gold/10 text-gold border border-gold/20'
          : 'bg-jet-charcoal text-jet-light hover:text-white border border-white/5'
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs text-jet-muted uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs text-jet-muted">{label}</span>
      <span className="text-sm text-white text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function ActionBtn({
  label,
  color,
  loading,
  onClick,
  icon,
}: {
  label: string;
  color: string;
  loading: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20',
    red: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20',
    gold: 'bg-gold/10 text-gold hover:bg-gold/20 border-gold/20',
    green: 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${colors[color] || colors.blue}`}
    >
      {icon}
      {label}
    </button>
  );
}
