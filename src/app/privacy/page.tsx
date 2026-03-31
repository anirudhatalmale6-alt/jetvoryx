import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-jet-black">
      <Header />
      <div className="pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-8">
            Privacy <span className="text-gold-gradient">Policy</span>
          </h1>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/60">
            <p className="text-white/40 text-sm">Last updated: March 2026</p>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p>We collect information you provide when creating an account (name, email, phone) and trip request details (departure/arrival cities, dates, passenger count, special requests).</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
              <p>Your information is used to process flight requests, communicate with you about bookings, send status updates, and improve our services. We do not sell your personal data to third parties.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">3. Data Sharing</h2>
              <p>We share necessary booking details with aircraft operators to fulfill your flight requests. Payment processing is handled by Stripe, which has its own privacy policy.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">4. Data Security</h2>
              <p>We implement industry-standard security measures to protect your data, including encrypted connections, secure password hashing, and limited access controls.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">5. Cookies</h2>
              <p>We use session cookies for authentication purposes. No third-party tracking cookies are used on our platform.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">6. Your Rights</h2>
              <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us through your account.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-white mb-3">7. Contact</h2>
              <p>For privacy-related inquiries, please reach out through the Request a Flight form or your account dashboard.</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
