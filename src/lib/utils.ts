import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function estimateFlightTime(distanceNm: number, speedKnots: number): string {
  const hours = distanceNm / speedKnots;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending Review',
    reviewed: 'Under Review',
    quoted: 'Quote Sent',
    confirmed: 'Confirmed',
    payment_sent: 'Payment Link Sent',
    paid: 'Payment Received',
    completed: 'Booking Complete',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-yellow-400',
    reviewed: 'text-blue-400',
    quoted: 'text-purple-400',
    confirmed: 'text-gold',
    payment_sent: 'text-orange-400',
    paid: 'text-green-400',
    completed: 'text-green-500',
    cancelled: 'text-red-400',
  };
  return colors[status] || 'text-jet-muted';
}
