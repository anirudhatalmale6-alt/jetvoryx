import { formatCurrency, formatDate, getStatusLabel } from './utils';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email via SMTP (when configured) or log to console.
 * In production, connect via Brevo/SendGrid/SES.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  // If SMTP is not configured, log the email for development
  if (!SMTP_HOST || !SMTP_USER) {
    console.log('📧 Email (not sent - SMTP not configured):');
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   Body: ${options.html.substring(0, 200)}...`);
    return true;
  }

  // In production, use nodemailer or similar
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@jetvoryx.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (e) {
    console.error('Email send error:', e);
    return false;
  }
}

// Email templates
const baseTemplate = (content: string) => `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden;">
    <div style="padding: 24px 32px; background: linear-gradient(135deg, #1a1a1a, #0a0a0a); border-bottom: 1px solid rgba(201,168,76,0.3);">
      <h1 style="margin: 0; font-size: 24px; letter-spacing: 3px; color: #c9a84c;">JETVORYX</h1>
      <p style="margin: 4px 0 0; font-size: 12px; color: #666;">Private Aviation, Elevated</p>
    </div>
    <div style="padding: 32px;">
      ${content}
    </div>
    <div style="padding: 16px 32px; background: #111111; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
      <p style="margin: 0; font-size: 11px; color: #666;">JETVORYX | Private Aviation, Elevated</p>
    </div>
  </div>
`;

export function emailRequestReceived(data: {
  firstName: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  requestId: string;
}) {
  return {
    subject: 'JETVORYX - Flight Request Received',
    html: baseTemplate(`
      <h2 style="color: #c9a84c; margin: 0 0 16px;">Request Received</h2>
      <p style="color: #ccc; line-height: 1.6;">Dear ${data.firstName},</p>
      <p style="color: #ccc; line-height: 1.6;">Thank you for your flight request. Our team is reviewing your inquiry and will get back to you shortly.</p>
      <div style="background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px; color: #999; font-size: 12px;">ROUTE</p>
        <p style="margin: 0 0 16px; color: #fff; font-size: 16px;">${data.departureCity} → ${data.arrivalCity}</p>
        <p style="margin: 0 0 8px; color: #999; font-size: 12px;">DEPARTURE</p>
        <p style="margin: 0 0 16px; color: #fff;">${formatDate(data.departureDate)}</p>
        <p style="margin: 0 0 8px; color: #999; font-size: 12px;">REQUEST ID</p>
        <p style="margin: 0; color: #c9a84c; font-family: monospace;">${data.requestId}</p>
      </div>
      <p style="color: #999; font-size: 13px;">We will contact you once your request has been reviewed and a quote is ready.</p>
    `),
  };
}

export function emailStatusUpdate(data: {
  firstName: string;
  status: string;
  departureCity: string;
  arrivalCity: string;
  note?: string;
}) {
  return {
    subject: `JETVORYX - Request ${getStatusLabel(data.status)}`,
    html: baseTemplate(`
      <h2 style="color: #c9a84c; margin: 0 0 16px;">Status Update</h2>
      <p style="color: #ccc; line-height: 1.6;">Dear ${data.firstName},</p>
      <p style="color: #ccc; line-height: 1.6;">Your flight request for <strong>${data.departureCity} → ${data.arrivalCity}</strong> has been updated.</p>
      <div style="background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 8px; color: #999; font-size: 12px;">CURRENT STATUS</p>
        <p style="margin: 0; color: #c9a84c; font-size: 20px; font-weight: bold;">${getStatusLabel(data.status)}</p>
      </div>
      ${data.note ? `<p style="color: #999; font-size: 13px;">Note: ${data.note}</p>` : ''}
    `),
  };
}

export function emailPaymentLink(data: {
  firstName: string;
  departureCity: string;
  arrivalCity: string;
  amount: number;
  paymentUrl: string;
}) {
  return {
    subject: 'JETVORYX - Payment Link for Your Flight',
    html: baseTemplate(`
      <h2 style="color: #c9a84c; margin: 0 0 16px;">Payment Ready</h2>
      <p style="color: #ccc; line-height: 1.6;">Dear ${data.firstName},</p>
      <p style="color: #ccc; line-height: 1.6;">Your flight request has been confirmed. Please complete the payment to finalize your booking.</p>
      <div style="background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px; color: #999; font-size: 12px;">ROUTE</p>
        <p style="margin: 0 0 16px; color: #fff; font-size: 16px;">${data.departureCity} → ${data.arrivalCity}</p>
        <p style="margin: 0 0 8px; color: #999; font-size: 12px;">TOTAL AMOUNT</p>
        <p style="margin: 0; color: #c9a84c; font-size: 24px; font-weight: bold;">${formatCurrency(data.amount)}</p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #c9a84c, #d4af37); color: #0a0a0a; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Complete Payment</a>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center;">This is a secure Stripe payment link. Your payment information is protected.</p>
    `),
  };
}
