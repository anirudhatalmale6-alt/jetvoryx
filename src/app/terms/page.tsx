import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-jet-black">
      <Header />
      <div className="pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-8">
            Terms of <span className="text-gold-gradient">Service</span>
          </h1>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/60">
            <p className="text-white/40 text-sm">Last updated: March 2026</p>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using JETVORYX, you agree to be bound by these Terms of Service. If you do not agree, do not use our platform.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">2. Services</h2>
              <p>JETVORYX is a private aviation brokerage platform that connects clients with aircraft operators. We act as an intermediary and do not own or operate aircraft directly. All flight services are provided by licensed third-party operators.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">3. Account Registration</h2>
              <p>You must create an account to submit booking requests. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">4. Pricing & Payments</h2>
              <p>All prices displayed are estimates and subject to confirmation. Final pricing depends on aircraft availability, routing, fuel surcharges, and other factors. Payment is required upon booking confirmation via secure payment link.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">5. Cancellation Policy</h2>
              <p>Cancellation terms vary by operator and aircraft type. Cancellation policies will be communicated at the time of booking confirmation. Early cancellations may receive partial refunds; late cancellations may be non-refundable.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">6. Limitation of Liability</h2>
              <p>JETVORYX acts as a broker and is not liable for delays, cancellations, or incidents related to flight operations. All liability rests with the operating carrier in accordance with applicable aviation regulations.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">7. Privacy</h2>
              <p>Your use of JETVORYX is also governed by our Privacy Policy. By using our services, you consent to our collection and use of data as described therein.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">8. Contact</h2>
              <p>For questions about these terms, please contact us through the Request a Flight form or your account dashboard.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
